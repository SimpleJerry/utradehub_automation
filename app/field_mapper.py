from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from .models import FormRecord, RawPdfData, ValidationResult
from .vendor_mapping_loader import load_vendor_mapping, lookup_vendor_info


class FieldMapper:
    """Field mapping layer.

    Minimal mapper for current purchase-order PDFs:
    - Blanket Purchase Order No.
    - Document Date
    - Pay-to Vendor No. (English vendor name)
    - Description / Quantity / Unit Price (line items)
    - Supplier/HS mapping from external CSV file (fixed columns)
    """

    def __init__(self, logger: logging.Logger, vendor_mapping_path: Path | None = None) -> None:
        self.logger = logger
        self.vendor_mapping_path = vendor_mapping_path
        self.vendor_mapping = load_vendor_mapping(vendor_mapping_path, logger)

    def map_fields(self, raw_data: RawPdfData) -> FormRecord:
        metadata = raw_data.metadata if isinstance(raw_data.metadata, dict) else {}
        line_items = self._extract_line_items(raw_data.tables)

        bpo_no = self._as_text(metadata.get("blanket_purchase_order_no"))
        document_date = self._as_text(metadata.get("document_date"))
        pay_to_vendor_name_en = self._as_text(metadata.get("pay_to_vendor_name_en"))

        supplier_name, hs_code = lookup_vendor_info(pay_to_vendor_name_en, self.vendor_mapping)

        extra: dict[str, Any] = {
            "blanket_purchase_order_no": bpo_no,
            "document_date": document_date,
            "pay_to_vendor_name_en": pay_to_vendor_name_en,
            "supplier_name": supplier_name,
            "supplier_keyword": supplier_name,
            "hs_code": hs_code,
            "line_items": line_items,
            # Convenience key for the current site flow.
            "doc_number": bpo_no,
        }

        self.logger.info(
            "Mapped record: %s | BPO=%s | date=%s | vendor=%s | supplier=%s | hs=%s | items=%s",
            raw_data.source_file,
            bpo_no,
            document_date,
            pay_to_vendor_name_en,
            supplier_name,
            hs_code,
            len(line_items),
        )

        return FormRecord(
            source_file=raw_data.source_file,
            raw_text=raw_data.text,
            extra=extra,
        )

    @staticmethod
    def _extract_line_items(tables: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not tables:
            return []

        for table in tables:
            rows = table.get("rows") if isinstance(table, dict) else None
            if isinstance(rows, list) and rows:
                normalized: list[dict[str, Any]] = []
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    normalized.append(
                        {
                            "description": FieldMapper._as_text(row.get("description")),
                            "quantity": FieldMapper._as_number_text(row.get("quantity")),
                            "unit_price": FieldMapper._as_number_text(row.get("unit_price")),
                        }
                    )
                return normalized

        return []

    @staticmethod
    def _as_text(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text if text else None

    @staticmethod
    def _as_number_text(value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, bool):
            return None
        if isinstance(value, int):
            return str(value)
        if isinstance(value, float):
            return str(int(value)) if value.is_integer() else str(value)

        text = str(value).strip()
        if not text:
            return None
        return text.replace(",", "")


def validate_record(record: FormRecord) -> ValidationResult:
    # Unified preflight checks for current site flow.
    required_fields = ["source_file", "supplier_name", "hs_code", "line_items"]

    missing_fields: list[str] = []
    for field_name in required_fields:
        if field_name == "line_items":
            if not _has_valid_line_items(record):
                missing_fields.append(field_name)
            continue

        value = _get_record_value(record, field_name)
        if _is_blank(value):
            missing_fields.append(field_name)

    if missing_fields:
        return ValidationResult(
            is_valid=False,
            missing_fields=missing_fields,
            message="preflight required fields missing",
        )

    return ValidationResult(is_valid=True, missing_fields=[], message="preflight ok")


def _get_record_value(record: FormRecord, field_name: str) -> Any:
    value = getattr(record, field_name, None)
    if not _is_blank(value):
        return value

    if isinstance(record.extra, dict):
        return record.extra.get(field_name)
    return None


def _has_valid_line_items(record: FormRecord) -> bool:
    if not isinstance(record.extra, dict):
        return False

    line_items = record.extra.get("line_items")
    if not isinstance(line_items, list):
        return False

    for row in line_items:
        if not isinstance(row, dict):
            continue

        description = str(row.get("description") or "").strip()
        quantity = str(row.get("quantity") or "").strip()
        unit_price = str(row.get("unit_price") or "").strip()
        if description and quantity and unit_price:
            return True

    return False


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    return str(value).strip() == ""


