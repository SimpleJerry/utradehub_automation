from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}



@dataclass
class AppConfig:
    project_root: Path

    input_pdf_dir: Path
    extracted_dir: Path
    screenshots_dir: Path
    traces_dir: Path
    logs_dir: Path

    result_csv_path: Path
    result_jsonl_path: Path

    site_base_url: str = ""
    site_form_url: str = ""
    site_username: str = ""
    site_password: str = ""

    vendor_mapping_path: Path | None = None

    dry_run: bool = True



def load_config(project_root: Path | None = None) -> AppConfig:
    if project_root is None:
        project_root = Path(__file__).resolve().parents[1]

    load_dotenv(project_root / ".env", override=False)

    data_dir = project_root / "data"

    vendor_mapping_env = os.getenv("VENDOR_MAPPING_PATH", "").strip()
    default_vendor_mapping_path = data_dir / "local" / "vendor_mapping.csv"
    if vendor_mapping_env:
        vendor_mapping_path = Path(vendor_mapping_env).expanduser()
        if not vendor_mapping_path.is_absolute():
            vendor_mapping_path = project_root / vendor_mapping_path
    else:
        vendor_mapping_path = default_vendor_mapping_path

    config = AppConfig(
        project_root=project_root,
        input_pdf_dir=data_dir / "input_pdfs",
        extracted_dir=data_dir / "extracted",
        screenshots_dir=data_dir / "screenshots",
        traces_dir=data_dir / "traces",
        logs_dir=project_root / "logs",
        result_csv_path=(data_dir / "extracted" / "batch_results.csv"),
        result_jsonl_path=(data_dir / "extracted" / "batch_results.jsonl"),
        site_base_url=os.getenv("SITE_BASE_URL", ""),
        site_form_url=os.getenv("SITE_FORM_URL", ""),
        site_username=os.getenv("SITE_USERNAME", ""),
        site_password=os.getenv("SITE_PASSWORD", ""),
        vendor_mapping_path=vendor_mapping_path,
        dry_run=_to_bool(os.getenv("DRY_RUN"), True),

    )

    for d in [
        config.input_pdf_dir,
        config.extracted_dir,
        config.screenshots_dir,
        config.traces_dir,
        config.logs_dir,
    ]:
        d.mkdir(parents=True, exist_ok=True)

    # Create local mapping directory for the default path.
    if not vendor_mapping_env:
        default_vendor_mapping_path.parent.mkdir(parents=True, exist_ok=True)

    return config


def setup_logger(config: AppConfig) -> logging.Logger:
    logger = logging.getLogger("pdf_web_automation")
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

    stream = logging.StreamHandler()
    stream.setFormatter(formatter)

    file_handler = logging.FileHandler(config.logs_dir / "run.log", encoding="utf-8")
    file_handler.setFormatter(formatter)

    logger.addHandler(stream)
    logger.addHandler(file_handler)
    return logger




