from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from typing import Any

from .config import AppConfig
from .field_mapper import FieldMapper, validate_record
from .models import FormRecord, ProcessResult
from .pdf_reader import PDFReader
from .site_bot import SiteBot


class WorkflowRunner:
    """Main orchestration layer."""

    def __init__(self, config: AppConfig, logger: logging.Logger) -> None:
        self.config = config
        self.logger = logger
        self.pdf_reader = PDFReader(logger=logger)
        self.field_mapper = FieldMapper(logger=logger, vendor_mapping_path=config.vendor_mapping_path)
        self.site_bot = SiteBot(config=config, logger=logger)

    def run_batch(self) -> list[ProcessResult]:
        pdf_files = sorted(self.config.input_pdf_dir.glob("*.pdf"))

        if not pdf_files:
            self.logger.warning("No PDF files found in: %s", self.config.input_pdf_dir)
            return []

        results: list[ProcessResult] = []
        grouped_records: dict[str, list[FormRecord]] = {}

        for pdf_file in pdf_files:
            record, immediate_result = self._collect_one(pdf_file)
            if immediate_result is not None:
                results.append(immediate_result)
                self._append_result(immediate_result)
                continue

            if record is None:
                continue

            group_key = self._group_key(record)
            grouped_records.setdefault(group_key, []).append(record)

        self.logger.info(
            "Grouping completed: files=%s groups=%s",
            len(pdf_files),
            len(grouped_records),
        )

        for group_key, records in grouped_records.items():
            result = self._process_group(group_key, records)
            results.append(result)
            self._append_result(result)

        return results

    def _collect_one(self, pdf_file: Path) -> tuple[FormRecord | None, ProcessResult | None]:
        raw_json_path = self.config.extracted_dir / f"{pdf_file.stem}.raw.json"
        record_json_path = self.config.extracted_dir / f"{pdf_file.stem}.record.json"

        try:
            raw_data = self.pdf_reader.read_pdf(pdf_file)
            self._write_json(raw_json_path, raw_data.to_dict())

            record = self.field_mapper.map_fields(raw_data)
            self._write_json(record_json_path, record.to_dict())

            validation = validate_record(record)
            if not validation.is_valid:
                return None, ProcessResult(
                    source_file=pdf_file.name,
                    status="failed",
                    message=f"preflight failed: {validation.missing_fields}",
                    raw_json_path=str(raw_json_path),
                    record_json_path=str(record_json_path),
                )

            return record, None
        except Exception as exc:
            self.logger.exception("Unhandled error while processing %s", pdf_file.name)
            return None, ProcessResult(
                source_file=pdf_file.name,
                status="failed",
                message=f"exception: {exc}",
                raw_json_path=str(raw_json_path) if raw_json_path.exists() else None,
                record_json_path=str(record_json_path) if record_json_path.exists() else None,
            )

    def _process_group(self, group_key: str, records: list[FormRecord]) -> ProcessResult:
        aggregated_record = self._build_group_record(group_key, records)
        merged_items = aggregated_record.extra.get("line_items") if isinstance(aggregated_record.extra, dict) else None
        if not isinstance(merged_items, list) or not merged_items:
            return ProcessResult(
                source_file=f"GROUP::{group_key}",
                status="failed",
                message="group has no valid line_items",
            )

        save_result = self.site_bot.save_record(aggregated_record)
        return ProcessResult(
            source_file=f"GROUP::{group_key}",
            status="success" if save_result.success else "failed",
            message=save_result.message,
            reference_no=save_result.reference_no,
        )

    def _build_group_record(self, group_key: str, records: list[FormRecord]) -> FormRecord:
        first = records[0]
        merged_items: list[dict[str, Any]] = []

        for record in records:
            if not isinstance(record.extra, dict):
                continue

            doc_number = record.extra.get("doc_number")
            document_date = record.extra.get("document_date")
            line_items = record.extra.get("line_items")
            if not isinstance(line_items, list):
                continue

            for item in line_items:
                if not isinstance(item, dict):
                    continue
                merged_item = dict(item)
                merged_item["doc_number"] = doc_number
                merged_item["document_date"] = document_date
                merged_item["source_file"] = record.source_file
                merged_items.append(merged_item)

        extra = dict(first.extra) if isinstance(first.extra, dict) else {}
        extra["line_items"] = merged_items
        extra["group_key"] = group_key

        self.logger.info(
            "Built group record: key=%s files=%s merged_items=%s",
            group_key,
            len(records),
            len(merged_items),
        )

        return FormRecord(
            source_file=f"GROUP::{group_key}",
            raw_text=first.raw_text,
            extra=extra,
        )

    @staticmethod
    def _group_key(record: FormRecord) -> str:
        if not isinstance(record.extra, dict):
            return "UNKNOWN_VENDOR"
        key = str(record.extra.get("pay_to_vendor_name_en") or "").strip()
        return key if key else "UNKNOWN_VENDOR"

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
