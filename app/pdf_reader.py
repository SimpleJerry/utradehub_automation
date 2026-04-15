from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from pypdf import PdfReader

from .models import RawPdfData


class PDFReader:
    """PDF extraction layer.

    Current implementation:
    - Extracts text from all pages via pypdf.
    - Parses key header fields for purchase order PDFs.
    - Parses line items from the standard No/Description/Quantity/Unit Price table.
    """

    def __init__(self, logger: logging.Logger) -> None:
        self.logger = logger

    def read_pdf(self, pdf_path: Path) -> RawPdfData:
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        reader = PdfReader(str(pdf_path))
        page_texts = [(page.extract_text() or "") for page in reader.pages]
        full_text = "\n".join(text for text in page_texts if text).strip()
        lines = self._clean_lines(full_text)

        bpo_no = self._extract_blanket_purchase_order_no(lines, full_text)
        document_date = self._extract_document_date(full_text)
        pay_to_vendor_name_en = self._extract_pay_to_vendor_name_en(lines, full_text)
        line_items = self._extract_line_items(lines)

        parse_status = "ok" if full_text else "empty_text"
        if full_text and (not bpo_no or not document_date or not pay_to_vendor_name_en or not line_items):
            parse_status = "partial"

        metadata: dict[str, Any] = {
            "source_path": str(pdf_path),
            "page_count": len(reader.pages),
            "parse_status": parse_status,
            "blanket_purchase_order_no": bpo_no,
            "document_date": document_date,
            "pay_to_vendor_name_en": pay_to_vendor_name_en,
            "line_item_count": len(line_items),
            "target_fields_present": {
                "Blanket Purchase Order No.": bool(bpo_no),
                "Document Date": bool(document_date),
                "Pay-to Vendor No.": bool(pay_to_vendor_name_en),
                "Description": bool(line_items),
                "Quantity": bool(line_items),
                "Unit Price": bool(line_items),
            },
        }

        if line_items:
            first_item = line_items[0]
            metadata["sample_item"] = {
                "description": first_item.get("description"),
                "quantity": first_item.get("quantity"),
                "unit_price": first_item.get("unit_price"),
            }

        self.logger.info(
            "Parsed PDF: %s | BPO=%s | Date=%s | Vendor=%s | items=%s",
            pdf_path.name,
            bpo_no,
            document_date,
            pay_to_vendor_name_en,
            len(line_items),
        )

        return RawPdfData(
            source_file=pdf_path.name,
            text=full_text,
            tables=[{"name": "order_items", "rows": line_items}],
            metadata=metadata,
        )

    @staticmethod
    def _clean_lines(text: str) -> list[str]:
        return [line.strip() for line in text.splitlines() if line and line.strip()]

    @staticmethod
    def _extract_blanket_purchase_order_no(lines: list[str], text: str) -> str | None:
        for line in lines:
            match = re.search(r"\bPBO-\d+\b", line, re.IGNORECASE)
            if match:
                return match.group(0)

        match = re.search(r"\bPBO-\d+\b", text, re.IGNORECASE)
        return match.group(0) if match else None

    @staticmethod
    def _extract_document_date(text: str) -> str | None:
        # Pattern: 2026년 4월 13일
        korean_match = re.search(r"([12]\d{3})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일", text)
        if korean_match:
            year, month, day = korean_match.groups()
            return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"

        # Fallback for slash date formats near "Document Date"
        slash_match = re.search(
            r"Document\s*Date\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})",
            text,
            re.IGNORECASE,
        )
        if slash_match:
            date_text = slash_match.group(1)
            parts = [int(x) for x in date_text.split("/")]
            month, day, year = parts
            return f"{year:04d}-{month:02d}-{day:02d}"

        return None

    def _extract_pay_to_vendor_name_en(self, lines: list[str], text: str) -> str | None:
        inline = re.search(
            r"Pay-to\s*Vendor\s*No\.[^\n:]*:\s*([A-Za-z][A-Za-z0-9 .,&()/-]+)",
            text,
            re.IGNORECASE,
        )
        if inline:
            return inline.group(1).strip()

        label_idx = next((idx for idx, line in enumerate(lines) if "pay-to vendor no." in line.lower()), -1)
        if label_idx >= 0:
            window = lines[label_idx + 1: min(len(lines), label_idx + 30)]
            for candidate in window:
                if self._is_probable_vendor_line(candidate):
                    return candidate.strip()

        # Fallback: vendor is often shown right above "Blanket Purchase Order" title.
        for idx, line in enumerate(lines):
            if line.lower().startswith("blanket purchase order"):
                for back_idx in range(idx - 1, max(idx - 8, -1), -1):
                    candidate = lines[back_idx]
                    if self._is_probable_vendor_line(candidate):
                        return candidate.strip()

        title_fallback = re.search(r"([A-Za-z][A-Za-z .,&()/-]{2,})\s+Blanket\s+Purchase\s+Order", text)
        if title_fallback:
            candidate = title_fallback.group(1).strip()
            if self._is_probable_vendor_line(candidate):
                return candidate

        return None

    @staticmethod
    def _is_probable_vendor_line(line: str) -> bool:
        candidate = line.strip()
        if not candidate:
            return False
        if not re.search(r"[A-Za-z]", candidate):
            return False
        if re.search(r"\d", candidate):
            return False
        if "#" in candidate or ":" in candidate:
            return False

        blocked = {
            "pay-to vendor no.",
            "account no.",
            "bank",
            "purchaser",
            "blanket purchase order",
            "document date",
            "shipment method",
            "page",
            "koru pharma",
        }
        lowered = candidate.lower()
        return not any(token in lowered for token in blocked)

    def _extract_line_items(self, lines: list[str]) -> list[dict[str, Any]]:
        start_idx = self._find_table_start(lines)
        if start_idx < 0:
            return []

        rows: list[dict[str, Any]] = []
        i = start_idx

        while i < len(lines):
            current = lines[i]
            if current.lower().startswith("total"):
                break

            if not re.fullmatch(r"\d+", current):
                i += 1
                continue

            if i + 4 >= len(lines):
                break

            no_text = lines[i]
            description = lines[i + 1]
            quantity_text = lines[i + 2]
            unit_price_text = lines[i + 3]
            amount_text = lines[i + 4]

            quantity = self._to_number(quantity_text)
            unit_price = self._to_number(unit_price_text)
            amount = self._to_number(amount_text)

            if quantity is None or unit_price is None:
                i += 1
                continue

            row: dict[str, Any] = {
                "no": int(no_text),
                "description": description,
                "quantity": quantity,
                "unit_price": unit_price,
                "amount": amount,
            }

            step = 5
            if i + 5 < len(lines):
                remarks = self._to_number(lines[i + 5])
                if remarks is not None:
                    row["remarks"] = remarks
                    step = 6

            rows.append(row)
            i += step

        return rows

    @staticmethod
    def _find_table_start(lines: list[str]) -> int:
        for i in range(len(lines) - 5):
            is_header = (
                    lines[i] in {"No.", "No"}
                    and lines[i + 1].lower() == "description"
                    and lines[i + 2].lower() == "quantity"
                    and lines[i + 3].lower().replace(" ", "") == "unitprice"
            )
            if is_header:
                return i + 6
        return -1

    @staticmethod
    def _to_number(text: str) -> int | float | None:
        normalized = text.replace(",", "").strip()
        if not re.fullmatch(r"-?\d+(?:\.\d+)?", normalized):
            return None

        if "." in normalized:
            return float(normalized)
        return int(normalized)
