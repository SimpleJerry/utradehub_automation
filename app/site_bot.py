from __future__ import annotations

import logging

from .config import AppConfig
from .models import FormRecord, SubmitResult


class SiteBot:
    """Website automation layer (scaffold).

    TODO:
    - Implement Playwright flow functions:
      login(page), open_form(page), fill_basic_info(page, record), upload_files(page, record), submit(page)
    - Add login-state reuse, screenshots, trace, and error capture.
    """

    def __init__(self, config: AppConfig, logger: logging.Logger) -> None:
        self.config = config
        self.logger = logger

    def submit_record(self, record: FormRecord) -> SubmitResult:
        if self.config.dry_run:
            return SubmitResult(
                success=True,
                reference_no="DRY-RUN",
                message="dry run: site submission skipped",
            )

        self.logger.info("[TODO] Site automation not implemented yet: %s", record.source_file)
        return SubmitResult(
            success=False,
            message="site_bot not implemented",
        )
