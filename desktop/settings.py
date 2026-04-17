from __future__ import annotations

import json
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path


def _legacy_install_settings(install_root: Path) -> dict:
    """Load legacy settings from install dir for one-time migration."""
    legacy_path = install_root / "config.user.json"
    if not legacy_path.exists():
        return {}

    try:
        payload = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
    except Exception:
        return {}

    if not isinstance(payload, dict):
        return {}

    allowed = set(UserSettings.__dataclass_fields__.keys())
    return {k: payload[k] for k in allowed if k in payload}


@dataclass
class UserSettings:
    site_base_url: str = ""
    site_form_url: str = ""
    site_username: str = ""
    site_password: str = ""
    vendor_mapping_path: str = ""
    input_pdf_dir: str = ""
    extracted_dir: str = ""
    dry_run: bool = False

    @staticmethod
    def defaults(user_data_root: Path) -> "UserSettings":
        return UserSettings(
            site_base_url="",
            site_form_url="",
            site_username="",
            site_password="",
            vendor_mapping_path=str((user_data_root / "data" / "local" / "vendor_mapping.csv").resolve()),
            input_pdf_dir=str((user_data_root / "data" / "input_pdfs").resolve()),
            extracted_dir=str((user_data_root / "data" / "extracted").resolve()),
            dry_run=False,
        )


def _seed_vendor_mapping(install_root: Path, user_data_root: Path) -> None:
    """Copy vendor mapping template to user data directory on first run."""
    source_example = install_root / "data" / "local" / "vendor_mapping.example.csv"
    if not source_example.exists():
        source_example = install_root / "_internal" / "data" / "local" / "vendor_mapping.example.csv"
    target_mapping = user_data_root / "data" / "local" / "vendor_mapping.csv"

    target_mapping.parent.mkdir(parents=True, exist_ok=True)
    if target_mapping.exists() or not source_example.exists():
        return

    shutil.copyfile(source_example, target_mapping)


def ensure_settings_file(install_root: Path, user_data_root: Path, settings_path: Path) -> None:
    """Ensure GUI runtime settings file exists in user-writable directory."""
    settings_path.parent.mkdir(parents=True, exist_ok=True)

    defaults = UserSettings.defaults(user_data_root)
    Path(defaults.input_pdf_dir).mkdir(parents=True, exist_ok=True)
    Path(defaults.extracted_dir).mkdir(parents=True, exist_ok=True)

    _seed_vendor_mapping(install_root, user_data_root)

    if settings_path.exists():
        return

    merged = asdict(defaults)
    # One-time migration: reuse install-root config if user has old package layout.
    legacy = _legacy_install_settings(install_root)
    merged.update(legacy)

    settings_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")


def load_settings(user_data_root: Path, settings_path: Path) -> UserSettings:
    """Load settings with defaults and normalize local filesystem paths."""
    defaults = asdict(UserSettings.defaults(user_data_root))
    payload: dict = {}

    try:
        raw = settings_path.read_text(encoding="utf-8-sig")
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            payload = parsed
    except Exception:
        payload = {}

    merged = dict(defaults)
    for key in defaults:
        if key in payload:
            merged[key] = payload[key]

    for key in ("vendor_mapping_path", "input_pdf_dir", "extracted_dir"):
        value = str(merged.get(key, "")).strip()
        if value:
            merged[key] = str(resolve_path(user_data_root, value))

    return UserSettings(**merged)


def save_settings(settings: UserSettings, settings_path: Path) -> None:
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(json.dumps(asdict(settings), ensure_ascii=False, indent=2), encoding="utf-8")


def resolve_path(base_root: Path, raw_value: str) -> Path:
    path = Path((raw_value or "").strip()).expanduser()
    if not path.is_absolute():
        path = base_root / path
    return path.resolve()
