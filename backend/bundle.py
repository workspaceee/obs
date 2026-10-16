"""Builds the ready-to-run Windows folder (zip) for the local version."""
import os
import tempfile
import time
import zipfile
from pathlib import Path

ROOT_NAME = "IMBA-Widgets"
BACKEND_FILES = ["server.py", "helper_script.py", "storage.py", "bundle.py"]

LOCAL_ENV = """# IMBA Widgets - local Windows settings
# Panel password used ONLY on the very first start (later change it in the panel, tab OBS)
PANEL_PASSWORD=imba2025
CORS_ORIGINS=*
"""


def _crlf(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\n", "\r\n")


def build_windows_zip(backend_dir: Path, windows_dir: Path) -> str:
    backend_dir = Path(backend_dir)
    windows_dir = Path(windows_dir)
    out = Path(tempfile.gettempdir()) / f"IMBA-Widgets-Windows-{int(time.time())}.zip"
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        def add_text(arc, text, bom=False):
            data = _crlf(text).encode("utf-8")
            if bom:
                data = b"\xef\xbb\xbf" + data
            z.writestr(f"{ROOT_NAME}/{arc}", data)

        # launchers (ASCII .bat) + readme
        for f in sorted((windows_dir / "launchers").iterdir()):
            if f.is_file():
                add_text(f.name, f.read_text("utf-8"), bom=f.suffix.lower() == ".txt")
        # powershell scripts (UTF-8 BOM so Windows PowerShell 5.1 reads Cyrillic correctly)
        for f in sorted((windows_dir / "scripts").iterdir()):
            if f.is_file():
                add_text(f"app/scripts/{f.name}", f.read_text("utf-8"), bom=f.suffix.lower() == ".ps1")
        # backend
        for name in BACKEND_FILES:
            add_text(f"app/backend/{name}", (backend_dir / name).read_text("utf-8"))
        add_text("app/backend/requirements.txt", (windows_dir / "requirements-local.txt").read_text("utf-8"))
        add_text("app/backend/.env", LOCAL_ENV)
        # prebuilt web app (widgets + panel + medals)
        web = windows_dir / "web"
        for root, _dirs, files in os.walk(web):
            for fn in files:
                p = Path(root) / fn
                rel = p.relative_to(web).as_posix()
                if rel.endswith(".map"):
                    continue
                z.write(p, f"{ROOT_NAME}/app/web/{rel}")
        # empty data dir marker
        z.writestr(f"{ROOT_NAME}/data/.keep", b"")
    # cleanup older zips
    for old in Path(tempfile.gettempdir()).glob("IMBA-Widgets-Windows-*.zip"):
        if old != out and time.time() - old.stat().st_mtime > 600:
            try:
                old.unlink()
            except OSError:
                pass
    return str(out)
