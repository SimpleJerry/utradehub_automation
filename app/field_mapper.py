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

        first_item = line_items[0] if line_items else {}
        first_description = self._as_text(first_item.get("description"))
        first_quantity = self._as_number_text(first_item.get("quantity"))
        first_unit_price = self._as_number_text(first_item.get("unit_price"))

        map_status = "ok" if all([bpo_no, document_date, pay_to_vendor_name_en, line_items]) else "partial"

        extra: dict[str, Any] = {
            "map_status": map_status,
            "blanket_purchase_order_no": bpo_no,
            "document_date": document_date,
            "pay_to_vendor_name_en": pay_to_vendor_name_en,
            "supplier_name": supplier_name,
            "supplier_keyword": supplier_name,
            "hs_code": hs_code,
            "line_items": line_items,
            # Convenience keys for the current site flow.
            "doc_number": bpo_no,
            "item_name": first_description,
            "item_quantity": first_quantity,
            "item_unit_price": first_unit_price,
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


def validate_record(record: FormRecord, required_fields: list[str]) -> ValidationResult:
    missing_fields: list[str] = []

    for field_name in required_fields:
        value = getattr(record, field_name, None)

        # Allow validating keys stored in record.extra without changing model fields.
        if (value is None or str(value).strip() == "") and isinstance(record.extra, dict):
            extra_value = record.extra.get(field_name)
            if extra_value is not None and str(extra_value).strip() != "":
                value = extra_value

        if value is None or str(value).strip() == "":
            missing_fields.append(field_name)

    if missing_fields:
        return ValidationResult(
            is_valid=False,
            missing_fields=missing_fields,
            message="required fields missing",
        )

    return ValidationResult(is_valid=True, missing_fields=[], message="ok")

