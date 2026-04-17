from __future__ import annotations

import os
import queue
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from .run_service import RunSummary, run_batch, startup_hints, to_user_message
from .settings import UserSettings, ensure_settings_file, load_settings, resolve_path, save_settings


class DesktopApp:
    def __init__(self, root: tk.Tk, install_root: Path, user_data_root: Path, settings_path: Path) -> None:
        self.root = root
        self.install_root = install_root
        self.user_data_root = user_data_root
        self.settings_path = settings_path

        ensure_settings_file(install_root, user_data_root, settings_path)
        self.settings = load_settings(user_data_root, settings_path)

        self.event_queue: queue.Queue[tuple[str, object]] = queue.Queue()
        self.worker: threading.Thread | None = None

        self.site_base_url_var = tk.StringVar()
        self.site_form_url_var = tk.StringVar()
        self.site_username_var = tk.StringVar()
        self.site_password_var = tk.StringVar()
        self.vendor_mapping_var = tk.StringVar()
        self.input_dir_var = tk.StringVar()
        self.extracted_dir_var = tk.StringVar()
        self.dry_run_var = tk.BooleanVar(value=False)
        self.status_var = tk.StringVar(value="就绪")

        self._build_ui()
        self._apply_settings(self.settings)
        self._show_startup_hints()

        self.root.after(120, self._poll_events)

    def _build_ui(self) -> None:
        self.root.title("UTradeHub Automation")
        self.root.geometry("980x720")
        self.root.minsize(900, 620)

        wrapper = ttk.Frame(self.root, padding=12)
        wrapper.pack(fill="both", expand=True)

        form = ttk.LabelFrame(wrapper, text="运行设置", padding=10)
        form.pack(fill="x")

        self._add_row(form, 0, "网站入口 URL", self.site_base_url_var)
        self._add_row(form, 1, "表单 URL（可选）", self.site_form_url_var)
        self._add_row(form, 2, "登录账号", self.site_username_var)
        self._add_row(form, 3, "登录密码", self.site_password_var, show="*")
        self._add_row(form, 4, "供应商映射 CSV", self.vendor_mapping_var, browse_file=True)
        self._add_row(form, 5, "PDF 输入目录", self.input_dir_var, browse_dir=True)
        self._add_row(form, 6, "结果输出目录", self.extracted_dir_var, browse_dir=True)

        dry_run_chk = ttk.Checkbutton(form, text="Dry Run（仅解析，不执行网页提交）", variable=self.dry_run_var)
        dry_run_chk.grid(row=7, column=0, columnspan=3, sticky="w", pady=(8, 0))

        action_bar = ttk.Frame(wrapper)
        action_bar.pack(fill="x", pady=(12, 8))

        self.save_btn = ttk.Button(action_bar, text="保存设置", command=self._on_save)
        self.save_btn.pack(side="left")

        self.start_btn = ttk.Button(action_bar, text="开始处理", command=self._on_start)
        self.start_btn.pack(side="left", padx=(8, 0))

        self.open_output_btn = ttk.Button(action_bar, text="打开结果目录", command=self._open_output_dir)
        self.open_output_btn.pack(side="left", padx=(8, 0))

        self.open_logs_btn = ttk.Button(action_bar, text="打开日志目录", command=self._open_logs_dir)
        self.open_logs_btn.pack(side="left", padx=(8, 0))

        status_frame = ttk.Frame(wrapper)
        status_frame.pack(fill="x")
        ttk.Label(status_frame, text="状态：").pack(side="left")
        ttk.Label(status_frame, textvariable=self.status_var).pack(side="left")

        log_frame = ttk.LabelFrame(wrapper, text="运行日志", padding=8)
        log_frame.pack(fill="both", expand=True, pady=(8, 0))

        self.log_text = tk.Text(log_frame, height=18, wrap="word", state="disabled")
        self.log_text.pack(side="left", fill="both", expand=True)
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.log_text.configure(yscrollcommand=scrollbar.set)

    def _add_row(
        self,
        form: ttk.LabelFrame,
        row: int,
        label: str,
        variable: tk.StringVar,
        show: str | None = None,
        browse_file: bool = False,
        browse_dir: bool = False,
    ) -> None:
        ttk.Label(form, text=label).grid(row=row, column=0, sticky="w", pady=4)

        entry = ttk.Entry(form, textvariable=variable, show=show or "")
        entry.grid(row=row, column=1, sticky="ew", pady=4, padx=(8, 8))

        if browse_file:
            btn = ttk.Button(form, text="浏览", command=lambda: self._choose_file(variable))
            btn.grid(row=row, column=2, sticky="ew", pady=4)
        elif browse_dir:
            btn = ttk.Button(form, text="浏览", command=lambda: self._choose_dir(variable))
            btn.grid(row=row, column=2, sticky="ew", pady=4)

        form.columnconfigure(1, weight=1)

    def _apply_settings(self, settings: UserSettings) -> None:
        self.site_base_url_var.set(settings.site_base_url)
        self.site_form_url_var.set(settings.site_form_url)
        self.site_username_var.set(settings.site_username)
        self.site_password_var.set(settings.site_password)
        self.vendor_mapping_var.set(settings.vendor_mapping_path)
        self.input_dir_var.set(settings.input_pdf_dir)
        self.extracted_dir_var.set(settings.extracted_dir)
        self.dry_run_var.set(bool(settings.dry_run))

    def _collect_settings(self) -> UserSettings:
        return UserSettings(
            site_base_url=self.site_base_url_var.get().strip(),
            site_form_url=self.site_form_url_var.get().strip(),
            site_username=self.site_username_var.get().strip(),
            site_password=self.site_password_var.get().strip(),
            vendor_mapping_path=self.vendor_mapping_var.get().strip(),
            input_pdf_dir=self.input_dir_var.get().strip(),
            extracted_dir=self.extracted_dir_var.get().strip(),
            dry_run=bool(self.dry_run_var.get()),
        )

    def _show_startup_hints(self) -> None:
        hints = startup_hints(self.user_data_root, self.settings)
        if hints:
            text = "首次使用请先补全设置：\n- " + "\n- ".join(hints)
            self._append_log(text)
            self.status_var.set("请先完善设置")

    def _on_save(self) -> None:
        try:
            settings = self._collect_settings()
            save_settings(settings, self.settings_path)
            self.settings = settings
            self.status_var.set("设置已保存")
            messagebox.showinfo("保存成功", f"设置已保存到：\n{self.settings_path}")
        except Exception as exc:
            messagebox.showerror("保存失败", to_user_message(exc))

    def _on_start(self) -> None:
        if self.worker is not None and self.worker.is_alive():
            return

        try:
            settings = self._collect_settings()
            save_settings(settings, self.settings_path)
            self.settings = settings
        except Exception as exc:
            messagebox.showerror("启动失败", to_user_message(exc))
            return

        self._append_log("开始执行批处理...")
        self._set_running(True)

        self.worker = threading.Thread(target=self._run_worker, daemon=True)
        self.worker.start()

    def _run_worker(self) -> None:
        try:
            summary = run_batch(self.user_data_root, self.settings_path, log_callback=self._log_from_worker)
            self.event_queue.put(("done", summary))
        except Exception as exc:
            self.event_queue.put(("error", to_user_message(exc)))

    def _log_from_worker(self, message: str) -> None:
        self.event_queue.put(("log", message))

    def _poll_events(self) -> None:
        while True:
            try:
                kind, payload = self.event_queue.get_nowait()
            except queue.Empty:
                break

            if kind == "log":
                self._append_log(str(payload))
            elif kind == "done":
                summary = payload
                if isinstance(summary, RunSummary):
                    self._set_running(False)
                    self.status_var.set("处理完成")
                    self._append_log(summary.to_text())
                    messagebox.showinfo("处理完成", summary.to_text())
            elif kind == "error":
                self._set_running(False)
                self.status_var.set("执行失败")
                messagebox.showerror("执行失败", str(payload))

        self.root.after(120, self._poll_events)

    def _set_running(self, running: bool) -> None:
        if running:
            self.status_var.set("运行中...")
        self.start_btn.configure(state="disabled" if running else "normal")
        self.save_btn.configure(state="disabled" if running else "normal")

    def _append_log(self, text: str) -> None:
        self.log_text.configure(state="normal")
        self.log_text.insert("end", text.rstrip() + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    @staticmethod
    def _browse_initial_dir(target_var: tk.StringVar) -> str:
        raw = target_var.get().strip()
        if not raw:
            return str(Path.home())

        candidate = Path(raw).expanduser()
        if not candidate.is_absolute():
            candidate = (Path.cwd() / candidate).resolve()

        if candidate.exists():
            if candidate.is_dir():
                return str(candidate)
            return str(candidate.parent)

        parent = candidate.parent
        if parent.exists():
            return str(parent)

        return str(Path.home())

    @staticmethod
    def _choose_file(target_var: tk.StringVar) -> None:
        selected = filedialog.askopenfilename(
            title="选择 CSV 文件",
            filetypes=[("CSV files", "*.csv"), ("All files", "*.*")],
            initialdir=DesktopApp._browse_initial_dir(target_var),
        )
        if selected:
            target_var.set(selected)

    @staticmethod
    def _choose_dir(target_var: tk.StringVar) -> None:
        selected = filedialog.askdirectory(
            title="选择文件夹",
            initialdir=DesktopApp._browse_initial_dir(target_var),
        )
        if selected:
            target_var.set(selected)

    def _open_output_dir(self) -> None:
        path = resolve_path(self.user_data_root, self.extracted_dir_var.get().strip())
        if not path.exists():
            messagebox.showwarning("目录不存在", f"结果目录不存在：\n{path}")
            return
        os.startfile(str(path))

    def _open_logs_dir(self) -> None:
        path = self.user_data_root / "logs"
        path.mkdir(parents=True, exist_ok=True)
        os.startfile(str(path))


def launch_gui(install_root: Path, user_data_root: Path, settings_path: Path | None = None) -> int:
    if settings_path is None:
        settings_path = user_data_root / "config.user.json"

    root = tk.Tk()
    DesktopApp(root=root, install_root=install_root, user_data_root=user_data_root, settings_path=settings_path)
    root.mainloop()
    return 0


