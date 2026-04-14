from __future__ import annotations

import logging

from .models import FormRecord, RawPdfData, ValidationResult


class FieldMapper:
    """Field mapping layer (scaffold).

    TODO:
    1) Define explicit mapping rules based on real PDF samples.
    2) Add normalization and conflict resolution per field.
    3) Keep all parsing rules in this module, not in site_bot.
    """

    def __init__(self, logger: logging.Logger) -> None:
        self.logger = logger

    def map_fields(self, raw_data: RawPdfData) -> FormRecord:
        self.logger.info("[TODO] Field mapping not implemented yet: %s", raw_data.source_file)
        return FormRecord(
            source_file=raw_data.source_file,
            raw_text=raw_data.text,
            extra={"map_status": "todo"},
        )


def validate_record(record: FormRecord, required_fields: list[str]) -> ValidationResult:
    missing_fields: list[str] = []

    for field_name in required_fields:
        value = getattr(record, field_name, None)
        if value is None or str(value).strip() == "":
            missing_fields.append(field_name)

    if missing_fields:
        return ValidationResult(
            is_valid=False,
            missing_fields=missing_fields,
            message="required fields missing",
        )

    return ValidationResult(is_valid=True, missing_fields=[], message="ok")
