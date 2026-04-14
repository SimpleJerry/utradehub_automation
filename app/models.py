from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


@dataclass
class RawPdfData:
    source_file: str
    text: str = ""
    tables: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    extracted_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class FormRecord:
    source_file: str
    full_name: str | None = None
    id_number: str | None = None
    birth_date: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    attachments: list[str] = field(default_factory=list)
    raw_text: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ValidationResult:
    is_valid: bool
    missing_fields: list[str] = field(default_factory=list)
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class SubmitResult:
    success: bool
    reference_no: str | None = None
    message: str = ""
    screenshot_path: str | None = None
    trace_path: str | None = None
    submitted_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ProcessResult:
    source_file: str
    status: str
    message: str
    reference_no: str | None = None
    raw_json_path: str | None = None
    record_json_path: str | None = None
    screenshot_path: str | None = None
    trace_path: str | None = None
    processed_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
