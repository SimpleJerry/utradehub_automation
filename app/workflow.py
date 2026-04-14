from __future__ import annotations

import csv
import json
import logging
from pathlib import Path

from .config import AppConfig
from .field_mapper import FieldMapper, validate_record
from .models import ProcessResult
from .pdf_reader import PDFReader
from .site_bot import SiteBot


class WorkflowRunner:
    """Main orchestration layer (scaffold)."""

    def __init__(self, config: AppConfig, logger: logging.Logger) -> None:
        self.config = config
        self.logger = logger
        self.pdf_reader = PDFReader(logger=logger)
        self.field_mapper = FieldMapper(logger=logger)
        self.site_bot = SiteBot(config=config, logger=logger)

    def run_batch(self) -> list[ProcessResult]:
        pdf_files = sorted(self.config.input_pdf_dir.glob("*.pdf"))

        if not pdf_files:
            self.logger.warning("No PDF files found in: %s", self.config.input_pdf_dir)
            return []

        results: list[ProcessResult] = []

        for pdf_file in pdf_files:
            result = self._process_one(pdf_file)
            results.append(result)
            self._append_result(result)

        return results

    def _process_one(self, pdf_file: Path) -> ProcessResult:
        raw_json_path = self.config.extracted_dir / f"{pdf_file.stem}.raw.json"
        record_json_path = self.config.extracted_dir / f"{pdf_file.stem}.record.json"

        try:
            raw_data = self.pdf_reader.read_pdf(pdf_file)
            self._write_json(raw_json_path, raw_data.to_dict())

            record = self.field_mapper.map_fields(raw_data)
            self._write_json(record_json_path, record.to_dict())

            validation = validate_record(record, self.config.required_fields)
            if not validation.is_valid:
                return ProcessResult(
                    source_file=pdf_file.name,
                    status="failed",
                    message=f"validation failed: {validation.missing_fields}",
                    raw_json_path=str(raw_json_path),
                    record_json_path=str(record_json_path),
                )

            submit_result = self.site_bot.submit_record(record)
            return ProcessResult(
                source_file=pdf_file.name,
                status="success" if submit_result.success else "failed",
                message=submit_result.message,
                reference_no=submit_result.reference_no,
                raw_json_path=str(raw_json_path),
                record_json_path=str(record_json_path),
                screenshot_path=submit_result.screenshot_path,
                trace_path=submit_result.trace_path,
            )
        except Exception as exc:
            self.logger.exception("Unhandled error while processing %s", pdf_file.name)
            return ProcessResult(
                source_file=pdf_file.name,
                status="failed",
                message=f"exception: {exc}",
                raw_json_path=str(raw_json_path) if raw_json_path.exists() else None,
                record_json_path=str(record_json_path) if record_json_path.exists() else None,
            )

    @staticmethod
    def _write_json(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def _append_result(self, result: ProcessResult) -> None:
        row = result.to_dict()

        self.config.result_jsonl_path.parent.mkdir(parents=True, exist_ok=True)
        with self.config.result_jsonl_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

        file_exists = self.config.result_csv_path.exists()
        with self.config.result_csv_path.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(row.keys()))
            if not file_exists:
                writer.writeheader()
            writer.writerow(row)
