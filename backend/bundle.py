"""Builds the ready-to-run Windows folder (zip) for the local version.

The zip has EXACTLY the same layout as the GitHub repository, so both ways work:
  IMBA-Widgets/
    1_FIRST_START_INSTALL.bat  2_START.bat  3_STOP.bat  README_RU.txt
    backend/   server.py storage.py helper_script.py bundle.py
    windows/   scripts/*.ps1 + messages.ru.json, web/ (prebuilt site), requirements-local.txt
    data/      (database + logs, created on first start)
"""
import os
import tempfile
import time
import zipfile
from pathlib import Path

ROOT_NAME = "IMBA-Widgets"
BACKEND_FILES = ["server.py", "helper_script.py", "storage.py", "bundle.py"]
LAUNCHERS = ["1_FIRST_START_INSTALL.bat", "2_START.bat", "3_STOP.bat", "README_RU.txt"]
CRLF_EXT = {".bat", ".cmd", ".ps1", ".txt", ".json"}


def _norm(path: Path) -> bytes:
    data = path.read_bytes()
    if path.suffix.lower() in CRLF_EXT:
        data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    return data


def build_windows_zip(backend_dir: Path, windows_dir: Path) -> str:
    backend_dir = Path(backend_dir)
    windows_dir = Path(windows_dir)
    project_root = windows_dir.parent
    out = Path(tempfile.gettempdir()) / f"IMBA-Widgets-Windows-{int(time.time())}.zip"
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        def put(arc: str, data: bytes):
            z.writestr(f"{ROOT_NAME}/{arc}", data)

        for name in LAUNCHERS:
            put(name, _norm(project_root / name))
        for f in sorted((windows_dir / "scripts").iterdir()):
            if f.is_file():
                put(f"windows/scripts/{f.name}", _norm(f))
        put("windows/requirements-local.txt", _norm(windows_dir / "requirements-local.txt"))
        for name in BACKEND_FILES:
            put(f"backend/{name}", (backend_dir / name).read_bytes())
        web = windows_dir / "web"
        for root, _dirs, files in os.walk(web):
            for fn in files:
                p = Path(root) / fn
                rel = p.relative_to(web).as_posix()
                if rel.endswith(".map"):
                    continue
                z.write(p, f"{ROOT_NAME}/windows/web/{rel}")
        put("data/.keep", b"")
    for old in Path(tempfile.gettempdir()).glob("IMBA-Widgets-Windows-*.zip"):
        if old != out and time.time() - old.stat().st_mtime > 600:
            try:
                old.unlink()
            except OSError:
                pass
    return str(out)
