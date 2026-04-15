from __future__ import annotations

import csv
import logging
from pathlib import Path


def _normalize_vendor_name(value: str | None) -> str:
    if value is None:
        return ""
    return " ".join(str(value).strip().lower().split())


def _entry(vendor_name_en: str, supplier_name_ko: str, hs_code: str) -> dict[str, str]:
    return {
        "vendor_name_en": vendor_name_en.strip(),
        "supplier_name_ko": supplier_name_ko.strip(),
        "hs_code": hs_code.strip(),
    }


def load_vendor_mapping(mapping_path: Path | None, logger: logging.Logger) -> dict[str, dict[str, str]]:
    """Load fixed CSV mapping with required headers:
    vendor_name_en,supplier_name_ko,hs_code
    """
    if mapping_path is None:
        logger.info("Vendor mapping path is not configured; supplier mapping disabled.")
        return {}

    path = Path(mapping_path)
    if not path.exists():
        logger.warning("Vendor mapping file not found: %s", path)
        return {}

    if path.suffix.lower() != ".csv":
        logger.warning("Unsupported vendor mapping format: %s (expected .csv)", path)
        return {}

    mapping: dict[str, dict[str, str]] = {}
    required_headers = {"vendor_name_en", "supplier_name_ko", "hs_code"}

    with path.open("r", encoding="utf-8-sig", newline="") as fp:
        reader = csv.DictReader(fp)
        headers = set(reader.fieldnames or [])
        missing_headers = sorted(required_headers - headers)
        if missing_headers:
            logger.warning("Vendor mapping CSV missing required columns: %s", ",".join(missing_headers))
            return {}

        for row in reader:
            if not isinstance(row, dict):
                continue

            vendor_name_en = str(row.get("vendor_name_en", "")).strip()
            supplier_name_ko = str(row.get("supplier_name_ko", "")).strip()
            hs_code = str(row.get("hs_code", "")).strip()

            if not vendor_name_en or not supplier_name_ko or not hs_code:
                continue

            key = _normalize_vendor_name(vendor_name_en)
            mapping[key] = _entry(vendor_name_en, supplier_name_ko, hs_code)

    logger.info("Loaded vendor mapping CSV: %s entries from %s", len(mapping), path)
    return mapping


def lookup_vendor_info(
    vendor_name_en: str | None,
    mapping: dict[str, dict[str, str]],
) -> tuple[str | None, str | None]:
    if not vendor_name_en:
        return None, None

    key = _normalize_vendor_name(vendor_name_en)
    record = mapping.get(key)
    if not record:
        return None, None

    supplier_name_ko = record.get("supplier_name_ko")
    hs_code = record.get("hs_code")

    supplier_name_ko = supplier_name_ko.strip() if isinstance(supplier_name_ko, str) else None
    hs_code = hs_code.strip() if isinstance(hs_code, str) else None
    return supplier_name_ko or None, hs_code or None
