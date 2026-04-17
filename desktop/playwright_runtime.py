from __future__ import annotations

import os
from pathlib import Path


def configure_playwright_environment(install_root: Path) -> Path | None:
    """Pin PLAYWRIGHT_BROWSERS_PATH to bundled browsers when available."""
    current = os.getenv("PLAYWRIGHT_BROWSERS_PATH", "").strip()
    if current:
        return Path(current).expanduser()

    candidates = [
        install_root / "playwright-browsers",
        install_root / "_internal" / "playwright-browsers",
    ]
    for candidate in candidates:
        if candidate.exists():
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(candidate)
            return candidate

    return None


def playwright_runtime_error() -> str | None:
    """Return a user-facing error if Chromium runtime is unavailable."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:  # pragma: no cover
        return f"Playwright import failed: {exc}"

    try:
        with sync_playwright() as pw:
            executable = Path(pw.chromium.executable_path)
    except Exception as exc:
        return f"Playwright driver start failed: {exc}"

    if not executable.exists():
        return (
            "Playwright Chromium executable is missing: "
            f"{executable}. "
            "Please ensure packaged folder 'playwright-browsers' exists "
            "or run `python -m playwright install chromium` in development."
        )

    return None
