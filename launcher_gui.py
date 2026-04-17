from __future__ import annotations

import os
import sys
from pathlib import Path

from desktop.gui_main import launch_gui


def _install_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def _user_data_root() -> Path:
    local_app_data = os.getenv("LOCALAPPDATA", "").strip()
    if local_app_data:
        return Path(local_app_data) / "UTradeHubAutomation"
    return Path.home() / ".utradehub_automation"


if __name__ == "__main__":
    raise SystemExit(launch_gui(install_root=_install_root(), user_data_root=_user_data_root()))
