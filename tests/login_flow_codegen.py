# -*- coding: utf-8 -*-
import os
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import Page, TimeoutError, sync_playwright


def login(page: Page, site_base_url: str, site_username: str, site_password: str) -> Page:
    page.goto(site_base_url)
    page.get_by_placeholder("아이디").click()
    page.get_by_placeholder("아이디").fill(site_username)
    page.get_by_placeholder("비밀번호").click()
    page.get_by_placeholder("비밀번호").fill(site_password)
    page.get_by_role("button", name="로그인", exact=True).click()

    try:
        popup_page = page.context.wait_for_event("page", timeout=3000)
        popup_page.close()
    except TimeoutError:
        pass

    page.wait_for_load_state("domcontentloaded")
    return page


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    site_base_url = os.getenv("SITE_BASE_URL", "").strip()
    site_username = os.getenv("SITE_USERNAME", "").strip()
    site_password = os.getenv("SITE_PASSWORD", "").strip()
    if not all([site_base_url, site_username, site_password]):
        raise ValueError("Please set SITE_BASE_URL, SITE_USERNAME, SITE_PASSWORD in .env")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        current_page = login(page, site_base_url, site_username, site_password)
        current_page.wait_for_timeout(10 * 1000) # wait for 10 seconds


if __name__ == "__main__":
    main()
