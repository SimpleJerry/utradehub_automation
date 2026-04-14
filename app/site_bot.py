# -*- coding: utf-8 -*-
from __future__ import annotations

import logging

from playwright.sync_api import Page, TimeoutError, sync_playwright

from .config import AppConfig
from .models import FormRecord, SubmitResult


class SiteBot:
    """Website automation layer.

    Current status:
    - `login(page)` is implemented from approved codegen flow.
    - Other steps stay as placeholders and will be completed incrementally.
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

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=False)
                context = browser.new_context()
                page = context.new_page()

                current_page = self.login(page)
                self.open_form(current_page)
                self.fill_basic_info(current_page, record)
                self.upload_files(current_page, record)
                return self.submit(current_page, record)
        except Exception as exc:
            self.logger.exception("Site flow failed for %s", record.source_file)
            return SubmitResult(success=False, message=f"site_flow_error: {exc}")

    def login(self, page: Page) -> Page:
        """Login using SITE_BASE_URL with embedded login form.

        Keep using the original page for subsequent actions.
        Any popup created during login is treated as ad/aux window and closed.
        """
        site_base_url = self.config.site_base_url.strip()
        site_username = self.config.site_username.strip()
        site_password = self.config.site_password.strip()

        if not all([site_base_url, site_username, site_password]):
            raise ValueError("Please set SITE_BASE_URL, SITE_USERNAME, SITE_PASSWORD in .env")

        page.goto(site_base_url)
        page.get_by_placeholder("아이디").click()
        page.get_by_placeholder("아이디").fill(site_username)
        page.get_by_placeholder("비밀번호").click()
        page.get_by_placeholder("비밀번호").fill(site_password)
        page.get_by_role("button", name="로그인", exact=True).click()

        try:
            popup_page = page.context.wait_for_event("page", timeout=3000)
            popup_page.close()
            self.logger.info("Login popup detected and closed.")
        except TimeoutError:
            pass

        page.wait_for_load_state("domcontentloaded")
        self.logger.info("Login completed on original page.")
        return page

    def open_form(self, page: Page) -> None:
        """Placeholder: navigate to target form page."""
        if not self.config.site_form_url.strip():
            self.logger.info("[TODO] SITE_FORM_URL is empty; skipping open_form")
            return

        page.goto(self.config.site_form_url)
        page.wait_for_load_state("domcontentloaded")

    def fill_basic_info(self, page: Page, record: FormRecord) -> None:
        """Placeholder: fill form fields from mapped record."""
        _ = page
        _ = record
        self.logger.info("[TODO] fill_basic_info not implemented")

    def upload_files(self, page: Page, record: FormRecord) -> None:
        """Placeholder: upload attachments from record."""
        _ = page
        _ = record
        self.logger.info("[TODO] upload_files not implemented")

    def submit(self, page: Page, record: FormRecord) -> SubmitResult:
        """Placeholder: submit form and parse receipt number."""
        _ = page
        _ = record
        self.logger.info("[TODO] submit not implemented")
        return SubmitResult(success=False, message="submit not implemented yet")
