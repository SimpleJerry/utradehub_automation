from __future__ import annotations

import logging
from pathlib import Path

from .models import RawPdfData


class PDFReader:
    """PDF extraction layer (scaffold).

    TODO:
    1) Implement text extraction via pypdf for text-based PDFs.
    2) Implement table extraction via pdfplumber for table-based PDFs.
    3) Add OCR fallback only for scanned PDFs.
    """

    def __init__(self, logger: logging.Logger) -> None:
        self.logger = logger

    def read_pdf(self, pdf_path: Path) -> RawPdfData:
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        self.logger.info("[TODO] PDF parsing not implemented yet: %s", pdf_path.name)

        return RawPdfData(
            source_file=pdf_path.name,
            text="",
            tables=[],
            metadata={
                "source_path": str(pdf_path),
                "parse_status": "todo",
            },
        )
