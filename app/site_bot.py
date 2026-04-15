# -*- coding: utf-8 -*-
from __future__ import annotations

import logging
import re

from playwright.sync_api import Dialog, Error, Frame, Page, TimeoutError, sync_playwright

from .config import AppConfig
from .models import FormRecord, SaveResult


class SiteBot:
    """Website automation layer.

    Current status:
    - `login(page)` is implemented from approved codegen flow.
    - Flow is split into `fill_basic_info` + `select_supplier` + `fill_order_from_pdf` + `save`.
    - `fill_order_from_pdf` currently stays as an items-loop placeholder.
    """

    def __init__(self, config: AppConfig, logger: logging.Logger) -> None:
        self.config = config
        self.logger = logger

    @staticmethod
    def _extra_text(record: FormRecord, key: str, default: str) -> str:
        value = record.extra.get(key) if isinstance(record.extra, dict) else None
        if value is None:
            return default
        text = str(value).strip()
        return text if text else default

    @staticmethod
    def _main_frame(page: Page) -> Frame:
        page.wait_for_selector('iframe[name^="mainFrame"]', timeout=15000)
        frames = [frame for frame in page.frames if frame.name and frame.name.startswith("mainFrame")]
        if not frames:
            raise RuntimeError("Could not find mainFrame iframe after opening form page.")
        return frames[-1]

    @staticmethod
    def _resolve_supplier_button(main_frame: Frame):
        buttons = main_frame.locator("#splybutton")
        count = buttons.count()
        if count == 0:
            return None

        for idx in range(count):
            candidate = buttons.nth(idx)
            if candidate.is_visible():
                return candidate

        return buttons.first

    def save_record(self, record: FormRecord) -> SaveResult:
        if self.config.dry_run:
            return SaveResult(
                success=True,
                reference_no="DRY-RUN",
                message="dry run: site save skipped",
            )

        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=False)
                context = browser.new_context()
                page = context.new_page()

                current_page = self.login(page)
                self.open_form(current_page)
                self.fill_basic_info(current_page, record)
                self.select_supplier(current_page, record)
                self.fill_order_from_pdf(current_page, record)
                return self.save(current_page, record)
        except Exception as exc:
            self.logger.exception("Site flow failed for %s", record.source_file)
            return SaveResult(success=False, message=f"site_flow_error: {exc}")

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
        """Open the form page and click the initial 작성 action."""
        if self.config.site_form_url.strip():
            page.goto(self.config.site_form_url)
            page.wait_for_load_state("domcontentloaded")
            self.logger.info("Form opened by SITE_FORM_URL.")
        else:
            page.get_by_role("link", name="구매확인서 통합서비스").click()
            page.get_by_role("button", name="구매확인서 신청 바로가기").click()
            page.wait_for_load_state("domcontentloaded")
            self.logger.info("Form opened from main menu flow.")

        main_frame = self._main_frame(page)
        main_frame.get_by_role("button", name="작성").click()
        self.logger.info("Clicked 작성 button in main frame.")

    def fill_basic_info(self, page: Page, record: FormRecord) -> None:
        """Fill stable default/basic fields that do not depend on supplier or item rows."""
        receiver_name = self._extra_text(record, "receiver_name", "EKTNET@")
        material_type_code = self._extra_text(record, "material_type_code", "2AJ")
        currency_code = self._extra_text(record, "currency_code", "KRW")

        main_frame = self._main_frame(page)

        with page.expect_popup() as receiver_popup_info:
            main_frame.locator('button[name="rcvCd_b"]').click()
        receiver_popup = receiver_popup_info.value
        receiver_popup.get_by_text(receiver_name).first.click()
        receiver_popup.close()

        main_frame.locator("#splyMtrlTypCd").select_option(material_type_code)
        try:
            dialog = page.wait_for_event("dialog", timeout=1000)
            dialog.dismiss()
        except TimeoutError:
            pass

        with page.expect_popup() as currency_popup_info:
            main_frame.get_by_role("button", name="찾기").nth(3).click()
        currency_popup = currency_popup_info.value
        currency_popup.get_by_role("textbox", name="코드 입력").fill(currency_code)
        currency_popup.get_by_role("button", name="조회").click()
        currency_popup.get_by_text(currency_code).first.click()
        currency_popup.close()

        self.logger.info("Filled basic form fields.")

    def select_supplier(self, page: Page, record: FormRecord) -> None:
        """Select supplier using mapped vendor name (not hardcoded in code)."""
        supplier_name = self._extra_text(record, "supplier_name", "")
        supplier_keyword = self._extra_text(record, "supplier_keyword", supplier_name)

        if not supplier_name:
            self.logger.info("[TODO] select_supplier not executed: supplier_name is missing in record.extra")
            return

        main_frame = self._main_frame(page)
        iframe_locator = page.locator('iframe[name^="mainFrame"]').last

        for attempt in range(1, 5):
            try:
                # Keep host page iframe and frame content in view before each retry.
                try:
                    iframe_locator.scroll_into_view_if_needed(timeout=3000)
                except Exception:
                    pass

                if attempt == 1:
                    page.evaluate("() => window.scrollTo(0, 0)")
                    main_frame.evaluate("() => window.scrollTo(0, 0)")
                else:
                    page.mouse.wheel(0, -900)
                    main_frame.evaluate("offset => window.scrollBy(0, offset)", -700)

                supplier_button = self._resolve_supplier_button(main_frame)
                if supplier_button is None:
                    raise RuntimeError("#splybutton not found")

                supplier_button.scroll_into_view_if_needed(timeout=3000)
                supplier_button.wait_for(state="visible", timeout=5000)

                with page.expect_popup(timeout=6000) as supplier_popup_info:
                    try:
                        supplier_button.click(timeout=4000)
                    except Exception:
                        try:
                            supplier_button.click(timeout=4000, force=True)
                        except Exception:
                            main_frame.evaluate(
                                "() => { const el = document.querySelector('#splybutton'); if (el) el.click(); }"
                            )
                supplier_popup = supplier_popup_info.value

                supplier_popup.locator("#searchOptionText1").click()
                supplier_popup.locator("#searchOptionText1").fill(supplier_keyword)
                supplier_popup.get_by_role("button", name="조회").click()
                supplier_popup.get_by_text(supplier_name).first.click()
                supplier_popup.close()

                self.logger.info("Selected supplier: %s (attempt=%s)", supplier_name, attempt)
                return
            except TimeoutError:
                self.logger.warning(
                    "select_supplier retry %s/4: popup not opened yet (supplier=%s)",
                    attempt,
                    supplier_name,
                )
            except Exception as exc:
                self.logger.warning(
                    "select_supplier retry %s/4 failed: %s",
                    attempt,
                    exc,
                )

        self.logger.warning(
            "[TODO] select_supplier skipped after retries; supplier=%s keyword=%s",
            supplier_name,
            supplier_keyword,
        )

    def fill_order_from_pdf(self, page: Page, record: FormRecord) -> None:
        """Placeholder: loop through mapped item rows and fill order lines.

        Specific selectors and interaction details will be finalized after codegen validation.
        """
        _ = page
        if not isinstance(record.extra, dict):
            self.logger.info("[TODO] fill_order_from_pdf not implemented yet (record.extra missing)")
            return

        doc_number = record.extra.get("doc_number")
        document_date = record.extra.get("document_date")
        hs_code = record.extra.get("hs_code")
        line_items = record.extra.get("line_items")

        item_count = len(line_items) if isinstance(line_items, list) else 0
        first_item = line_items[0] if item_count > 0 and isinstance(line_items[0], dict) else {}

        self.logger.info(
            "[TODO] fill_order_from_pdf placeholder | doc_number=%s date=%s hs=%s items=%s first_item=%s/%s/%s",
            doc_number,
            document_date,
            hs_code,
            item_count,
            first_item.get("description"),
            first_item.get("quantity"),
            first_item.get("unit_price"),
        )

    def save(self, page: Page, record: FormRecord) -> SaveResult:
        """Run temporary save and return a normalized SaveResult."""
        _ = record
        dialog_message: str | None = None

        def _capture_dialog(dialog: Dialog) -> None:
            nonlocal dialog_message
            dialog_message = dialog.message.strip()
            try:
                dialog.dismiss()
            except Error:
                self.logger.debug("Dialog already handled before save capture.")

        page.once("dialog", _capture_dialog)

        main_frame = self._main_frame(page)
        main_frame.get_by_role("button", name="임시저장", exact=True).click()
        page.wait_for_timeout(1000)

        if dialog_message:
            is_success = any(token in dialog_message for token in ["저장", "완료", "성공"])
            reference_match = re.search(r"\d{6,}", dialog_message)
            reference_no = reference_match.group(0) if reference_match else None
            message = dialog_message
        else:
            is_success = True
            reference_no = None
            message = "임시저장 clicked (no dialog captured)."

        self.logger.info("Save result: success=%s, message=%s", is_success, message)
        return SaveResult(success=is_success, reference_no=reference_no, message=message)

