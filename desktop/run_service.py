from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from app.config import AppConfig, setup_logger
from app.workflow import WorkflowRunner

from .settings import UserSettings, load_settings, resolve_path
from .playwright_runtime import playwright_runtime_error


class UserInputError(Exception):
    """Raised when required user inputs are invalid."""


@dataclass
class RunSummary:
    total: int
    success: int
    failed: int
    csv_path: Path
    jsonl_path: Path

    def to_text(self) -> str:
        return (
            "处理完成\n"
            f"总数: {self.total}\n"
            f"成功: {self.success}\n"
            f"失败: {self.failed}\n"
            f"CSV: {self.csv_path}\n"
            f"JSONL: {self.jsonl_path}"
        )


def startup_hints(base_root: Path, settings: UserSettings) -> list[str]:
    hints: list[str] = []

    if not settings.site_base_url.strip():
        hints.append("请填写网站入口地址（SITE_BASE_URL）。")
    if not settings.site_username.strip():
        hints.append("请填写登录账号。")
    if not settings.site_password.strip():
        hints.append("请填写登录密码。")

    if not settings.vendor_mapping_path.strip():
        hints.append("请设置供应商映射 CSV 路径。")
    else:
        mapping_path = resolve_path(base_root, settings.vendor_mapping_path)
        if not mapping_path.exists():
            hints.append(f"供应商映射文件不存在：{mapping_path}")

    return hints


def validate_for_run(base_root: Path, settings: UserSettings) -> list[str]:
    errors: list[str] = []

    if not settings.dry_run:
        if not settings.site_base_url.strip():
            errors.append("Missing site base URL.")
        if not settings.site_username.strip():
            errors.append("Missing login username.")
        if not settings.site_password.strip():
            errors.append("Missing login password.")

        browser_error = playwright_runtime_error()
        if browser_error:
            errors.append(browser_error)

    if not settings.vendor_mapping_path.strip():
        errors.append("Missing vendor mapping CSV path.")
    else:
        mapping_path = resolve_path(base_root, settings.vendor_mapping_path)
        if not mapping_path.exists():
            errors.append(f"Vendor mapping file not found: {mapping_path}")

    input_dir = resolve_path(base_root, settings.input_pdf_dir)
    if not input_dir.exists() or not input_dir.is_dir():
        errors.append(f"PDF input directory not found: {input_dir}")
    else:
        pdf_count = len(list(input_dir.glob("*.pdf")))
        if pdf_count == 0:
            errors.append(f"No PDF files in input directory: {input_dir}")

    extracted_dir = resolve_path(base_root, settings.extracted_dir)
    try:
        extracted_dir.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        errors.append(f"Cannot create output directory: {extracted_dir} ({exc})")

    return errors


class _CallbackHandler(logging.Handler):
    def __init__(self, callback):
        super().__init__()
        self._callback = callback

    def emit(self, record: logging.LogRecord) -> None:
        message = self.format(record)
        self._callback(message)


def _build_config(base_root: Path, settings: UserSettings) -> AppConfig:
    input_dir = resolve_path(base_root, settings.input_pdf_dir)
    extracted_dir = resolve_path(base_root, settings.extracted_dir)
    logs_dir = base_root / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    vendor_mapping_path = None
    if settings.vendor_mapping_path.strip():
        vendor_mapping_path = resolve_path(base_root, settings.vendor_mapping_path)

    return AppConfig(
        project_root=base_root,
        input_pdf_dir=input_dir,
        extracted_dir=extracted_dir,
        logs_dir=logs_dir,
        result_csv_path=extracted_dir / "batch_results.csv",
        result_jsonl_path=extracted_dir / "batch_results.jsonl",
        site_base_url=settings.site_base_url.strip(),
        site_form_url=settings.site_form_url.strip(),
        site_username=settings.site_username.strip(),
        site_password=settings.site_password.strip(),
        vendor_mapping_path=vendor_mapping_path,
        dry_run=bool(settings.dry_run),
    )


def run_batch(base_root: Path, settings_path: Path, log_callback=None) -> RunSummary:
    settings = load_settings(base_root, settings_path)

    errors = validate_for_run(base_root, settings)
    if errors:
        raise UserInputError("请先修正以下问题：\n- " + "\n- ".join(errors))

    config = _build_config(base_root, settings)
    logger = setup_logger(config)

    callback_handler = None
    if log_callback is not None:
        callback_handler = _CallbackHandler(log_callback)
        callback_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
        logger.addHandler(callback_handler)

    try:
        runner = WorkflowRunner(config=config, logger=logger)
        results = runner.run_batch()
        success = len([row for row in results if row.status == "success"])
        failed = len(results) - success
        return RunSummary(
            total=len(results),
            success=success,
            failed=failed,
            csv_path=config.result_csv_path,
            jsonl_path=config.result_jsonl_path,
        )
    finally:
        if callback_handler is not None:
            logger.removeHandler(callback_handler)


def to_user_message(exc: Exception) -> str:
    if isinstance(exc, UserInputError):
        return str(exc)

    text = str(exc).strip()
    if not text:
        return "发生未知错误，请导出日志并联系维护人员。"

    if "Could not find mainFrame" in text:
        return "页面结构发生变化（未找到主框架）。请联系维护人员更新自动化脚本。"

    if "site_flow_error" in text:
        return "网页自动化执行失败，请检查登录信息、网络状态和页面是否可正常打开。"

    return f"执行失败：{text}"
