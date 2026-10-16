"""IMBA Widgets backend: OBS overlay state (score + rank), hotkeys, AHK helper."""
import asyncio
import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query, Request
from fastapi.responses import PlainTextResponse, Response, FileResponse
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from helper_script import build_ahk_script, numpad_variants
from storage import get_db

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

db, client, DB_MODE = get_db()
IS_LOCAL = os.environ.get("IMBA_LOCAL") == "1"
STATIC_DIR = Path(os.environ["STATIC_DIR"]).resolve() if os.environ.get("STATIC_DIR") else None
HELPER_SCRIPT_PATH = os.environ.get("HELPER_SCRIPT_PATH")
LOCAL_BASE_URL = os.environ.get("LOCAL_BASE_URL", "http://127.0.0.1:8765")
WINDOWS_DIR = ROOT_DIR.parent / "windows"

app = FastAPI(title="IMBA Widgets")
api = APIRouter(prefix="/api")
logger = logging.getLogger("imba")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
if os.environ.get("IMBA_LOCAL") == "1":
    # local Windows build: short console lines + a log file in data/
    for h in logging.getLogger().handlers:
        h.setFormatter(logging.Formatter("  %(asctime)s  %(message)s", "%H:%M:%S"))
    try:
        _dd = Path(os.environ.get("DATA_DIR") or ".")
        _dd.mkdir(parents=True, exist_ok=True)
        _fh = logging.FileHandler(_dd / "server.log", mode="w", encoding="utf-8")
        _fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
        logging.getLogger().addHandler(_fh)
    except OSError:
        pass

MAX_UNDO = 100
MAX_RESULTS = 200
HELPER_ONLINE_SEC = 12

DEFAULT_HOTKEYS = {
    "win": {"ahk": "^!Numpad1", "label": "Ctrl + Alt + Num 1"},
    "lose": {"ahk": "^!Numpad2", "label": "Ctrl + Alt + Num 2"},
    "undo": {"ahk": "^!Numpad0", "label": "Ctrl + Alt + Num 0"},
}
DEFAULT_RANK = {
    "current": {"rank": 5, "stars": 3, "place": None},
    "goal": {"rank": 8, "stars": 0, "place": None},
}


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ---------------- change notification (long-poll) ----------------
class Notifier:
    def __init__(self):
        self.events = {}

    def get(self, ch):
        if ch not in self.events:
            self.events[ch] = asyncio.Event()
        return self.events[ch]

    def notify(self, ch):
        ev = self.get(ch)
        ev.set()
        self.events[ch] = asyncio.Event()


notifier = Notifier()


# ---------------- password hashing ----------------
def hash_pw(pw: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 200_000).hex()
    return f"{salt}${dk}"


def verify_pw(pw: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return hmac.compare_digest(hash_pw(pw, salt), stored)


# ---------------- docs ----------------
async def get_settings():
    doc = await db.settings.find_one({"_id": "main"})
    if not doc:
        doc = {
            "_id": "main",
            "password_hash": hash_pw(os.environ.get("PANEL_PASSWORD", "imba2025")),
            "helper_token": secrets.token_urlsafe(24),
            "helper_last_seen": None,
        }
        await db.settings.update_one({"_id": "main"}, {"$setOnInsert": doc}, upsert=True)
        doc = await db.settings.find_one({"_id": "main"})
    return doc


async def get_score_doc():
    doc = await db.state.find_one({"_id": "score"})
    if not doc:
        base = {"_id": "score", "wins": 0, "losses": 0, "results": [], "undo": [], "version": 1,
                "last_event": {"type": "init", "at": iso(now())}}
        await db.state.update_one({"_id": "score"}, {"$setOnInsert": base}, upsert=True)
        doc = await db.state.find_one({"_id": "score"})
    return doc


async def get_rank_doc():
    doc = await db.state.find_one({"_id": "rank"})
    if not doc:
        base = {"_id": "rank", **DEFAULT_RANK, "version": 1}
        await db.state.update_one({"_id": "rank"}, {"$setOnInsert": base}, upsert=True)
        doc = await db.state.find_one({"_id": "rank"})
    return doc


async def get_hotkeys_doc():
    doc = await db.state.find_one({"_id": "hotkeys"})
    if not doc:
        base = {"_id": "hotkeys", "keys": DEFAULT_HOTKEYS, "version": 1}
        await db.state.update_one({"_id": "hotkeys"}, {"$setOnInsert": base}, upsert=True)
        doc = await db.state.find_one({"_id": "hotkeys"})
    return doc


def calc_streak(results):
    if not results:
        return {"type": None, "count": 0}
    last = results[-1]
    c = 0
    for r in reversed(results):
        if r != last:
            break
        c += 1
    return {"type": "win" if last == "W" else "lose", "count": c}


def score_public(doc):
    total = doc["wins"] + doc["losses"]
    return {
        "wins": doc["wins"],
        "losses": doc["losses"],
        "streak": calc_streak(doc.get("results", [])),
        "winrate": round(doc["wins"] * 100 / total) if total else None,
        "version": doc["version"],
        "last_event": doc.get("last_event"),
        "can_undo": len(doc.get("undo", [])) > 0,
        "recent": doc.get("results", [])[-10:],
    }


def rank_public(doc):
    return {"current": doc["current"], "goal": doc["goal"], "version": doc["version"]}


score_lock = asyncio.Lock()


async def apply_score_action(action: str, payload: Optional[dict] = None, source: str = "panel"):
    async with score_lock:
        doc = await get_score_doc()
        snap = {"wins": doc["wins"], "losses": doc["losses"], "results": doc.get("results", [])}
        undo = doc.get("undo", [])
        wins, losses, results = doc["wins"], doc["losses"], list(doc.get("results", []))
        if action == "win":
            wins += 1
            results.append("W")
            undo.append(snap)
        elif action == "lose":
            losses += 1
            results.append("L")
            undo.append(snap)
        elif action == "undo":
            if not undo:
                return score_public(doc), False
            prev = undo.pop()
            wins, losses, results = prev["wins"], prev["losses"], prev["results"]
        elif action == "set":
            nw, nl = int(payload["wins"]), int(payload["losses"])
            # keep streak sequence consistent with new totals: trim if counts dropped
            if nw < wins or nl < losses:
                results = []
            wins, losses = nw, nl
            undo.append(snap)
        elif action == "reset":
            wins, losses, results = 0, 0, []
            undo.append(snap)
        undo = undo[-MAX_UNDO:]
        results = results[-MAX_RESULTS:]
        version = doc["version"] + 1
        event = {"type": action, "at": iso(now()), "source": source}
        await db.state.update_one(
            {"_id": "score"},
            {"$set": {"wins": wins, "losses": losses, "results": results, "undo": undo,
                      "version": version, "last_event": event}},
        )
        await db.score_log.insert_one({"type": action, "at": iso(now()), "source": source,
                                       "wins": wins, "losses": losses})
        doc = await get_score_doc()
    notifier.notify("score")
    src = "клавиша" if source == "hotkey" else "панель"
    logger.info("%-6s -> WIN %d : LOSE %d  (%s)", action.upper(), wins, losses, src)
    return score_public(doc), True


# ---------------- auth ----------------
async def require_auth(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Требуется вход")
    token = authorization.split(" ", 1)[1].strip()
    sess = await db.sessions.find_one({"_id": token})
    if not sess:
        raise HTTPException(401, "Сессия истекла")
    exp = sess.get("expires_at")
    if exp is not None:
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < now():
            await db.sessions.delete_one({"_id": token})
            raise HTTPException(401, "Сессия истекла")
    return token


async def require_helper(token: str = Query(...)):
    s = await get_settings()
    if not hmac.compare_digest(token, s["helper_token"]):
        raise HTTPException(403, "bad token")
    await db.settings.update_one({"_id": "main"}, {"$set": {"helper_last_seen": now()}})
    return True


class LoginIn(BaseModel):
    password: str


class PasswordIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=4, max_length=128)


@api.get("/")
async def root():
    return {"service": "imba-widgets", "ok": True}


@api.post("/auth/login")
async def login(body: LoginIn):
    s = await get_settings()
    if not verify_pw(body.password, s["password_hash"]):
        await asyncio.sleep(0.4)
        raise HTTPException(401, "Неверный пароль")
    token = secrets.token_urlsafe(32)
    await db.sessions.insert_one({"_id": token, "created_at": now(), "expires_at": now() + timedelta(days=60)})
    return {"token": token}


@api.post("/auth/logout")
async def logout(token: str = Depends(require_auth)):
    await db.sessions.delete_one({"_id": token})
    return {"ok": True}


@api.get("/auth/me")
async def me(_: str = Depends(require_auth)):
    return {"ok": True}


@api.post("/auth/password")
async def change_password(body: PasswordIn, token: str = Depends(require_auth)):
    s = await get_settings()
    if not verify_pw(body.old_password, s["password_hash"]):
        raise HTTPException(400, "Текущий пароль неверный")
    await db.settings.update_one({"_id": "main"}, {"$set": {"password_hash": hash_pw(body.new_password)}})
    await db.sessions.delete_many({"_id": {"$ne": token}})
    return {"ok": True}


# ---------------- public widget endpoints (long-poll) ----------------
async def long_poll(channel: str, since: Optional[int], getter, public):
    doc = await getter()
    if since is not None and doc["version"] == since:
        ev = notifier.get(channel)
        try:
            await asyncio.wait_for(ev.wait(), timeout=20)
        except asyncio.TimeoutError:
            pass
        doc = await getter()
    return public(doc)


@api.get("/widget/score")
async def widget_score(since: Optional[int] = None):
    return await long_poll("score", since, get_score_doc, score_public)


@api.get("/widget/rank")
async def widget_rank(since: Optional[int] = None):
    return await long_poll("rank", since, get_rank_doc, rank_public)


# ---------------- panel: score ----------------
class ScoreSet(BaseModel):
    wins: int = Field(ge=0, le=9999)
    losses: int = Field(ge=0, le=9999)


@api.post("/score/{action}")
async def score_action(action: Literal["win", "lose", "undo", "reset"], _: str = Depends(require_auth)):
    state, changed = await apply_score_action(action)
    return {**state, "changed": changed}


@api.put("/score")
async def score_set(body: ScoreSet, _: str = Depends(require_auth)):
    state, _c = await apply_score_action("set", body.model_dump())
    return state


@api.get("/score/log")
async def score_log(_: str = Depends(require_auth)):
    items = await db.score_log.find({}, {"_id": 0}).sort("at", -1).to_list(20)
    return items


# ---------------- panel: rank ----------------
class RankSlot(BaseModel):
    rank: int = Field(ge=1, le=8)
    stars: int = Field(ge=0, le=5)
    place: Optional[int] = Field(default=None, ge=1, le=99999)


class RankIn(BaseModel):
    current: RankSlot
    goal: RankSlot


def norm_slot(s: RankSlot):
    d = s.model_dump()
    if d["rank"] == 8:
        d["stars"] = 0
    else:
        d["stars"] = max(1, d["stars"])
        d["place"] = None
    return d


@api.put("/rank")
async def rank_set(body: RankIn, _: str = Depends(require_auth)):
    doc = await get_rank_doc()
    await db.state.update_one(
        {"_id": "rank"},
        {"$set": {"current": norm_slot(body.current), "goal": norm_slot(body.goal), "version": doc["version"] + 1}},
    )
    notifier.notify("rank")
    logger.info("RANK   -> %s  =>  %s", body.current.model_dump(), body.goal.model_dump())
    return rank_public(await get_rank_doc())


# ---------------- panel: hotkeys ----------------
class HotkeyItem(BaseModel):
    ahk: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=60)


class HotkeysIn(BaseModel):
    win: HotkeyItem
    lose: HotkeyItem
    undo: HotkeyItem


ALLOWED_AHK_CHARS = set("^!+#") | set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")


@api.put("/hotkeys")
async def hotkeys_set(body: HotkeysIn, _: str = Depends(require_auth)):
    data = body.model_dump()
    keys = [v["ahk"] for v in data.values()]
    for k in keys:
        if not set(k) <= ALLOWED_AHK_CHARS:
            raise HTTPException(400, f"Недопустимая клавиша: {k}")
    if len(set(keys)) != len(keys):
        raise HTTPException(400, "Одна и та же клавиша назначена на несколько действий")
    doc = await get_hotkeys_doc()
    await db.state.update_one({"_id": "hotkeys"}, {"$set": {"keys": data, "version": doc["version"] + 1}})
    return {"keys": data, "version": doc["version"] + 1}


@api.post("/hotkeys/reset")
async def hotkeys_reset(_: str = Depends(require_auth)):
    doc = await get_hotkeys_doc()
    await db.state.update_one({"_id": "hotkeys"}, {"$set": {"keys": DEFAULT_HOTKEYS, "version": doc["version"] + 1}})
    return {"keys": DEFAULT_HOTKEYS, "version": doc["version"] + 1}


# ---------------- panel: overview ----------------
def helper_status(s):
    last = s.get("helper_last_seen")
    if last is not None and last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    online = bool(last and (now() - last).total_seconds() < HELPER_ONLINE_SEC)
    return {"online": online, "last_seen": iso(last)}


@api.get("/panel/state")
async def panel_state(_: str = Depends(require_auth)):
    s = await get_settings()
    hk = await get_hotkeys_doc()
    return {
        "score": score_public(await get_score_doc()),
        "rank": rank_public(await get_rank_doc()),
        "hotkeys": hk["keys"],
        "helper": helper_status(s),
    }


@api.get("/helper/status")
async def helper_status_ep(_: str = Depends(require_auth)):
    return helper_status(await get_settings())


@api.get("/helper/script")
async def helper_script(request: Request, _: str = Depends(require_auth), base: Optional[str] = None):
    s = await get_settings()
    base_url = (base or str(request.base_url)).rstrip("/")
    if base_url.startswith("http://") and "localhost" not in base_url and "127.0.0.1" not in base_url:
        base_url = "https://" + base_url[len("http://"):]
    script = build_ahk_script(base_url, s["helper_token"])
    data = "\ufeff" + script.replace("\r\n", "\n").replace("\n", "\r\n")
    return Response(
        content=data.encode("utf-8"),
        media_type="application/octet-stream",
        headers={"Content-Disposition": 'attachment; filename="IMBA-Hotkeys.ahk"'},
    )


@api.post("/helper/regenerate")
async def helper_regenerate(_: str = Depends(require_auth)):
    await get_settings()
    await db.settings.update_one({"_id": "main"}, {"$set": {"helper_token": secrets.token_urlsafe(24)}})
    await write_local_helper()
    return {"ok": True}


@api.get("/meta")
async def meta():
    return {"local": IS_LOCAL, "storage": DB_MODE, "windows_bundle": (WINDOWS_DIR / "web").exists()}


@api.get("/download/windows")
async def download_windows(_: str = Depends(require_auth)):
    from bundle import build_windows_zip

    if not (WINDOWS_DIR / "web").exists():
        raise HTTPException(404, "Сборка для Windows ещё не подготовлена")
    path = await asyncio.to_thread(build_windows_zip, ROOT_DIR, WINDOWS_DIR)
    return FileResponse(path, media_type="application/zip", filename="IMBA-Widgets-Windows.zip")


async def write_local_helper():
    """Local Windows build: keep IMBA-Hotkeys.ahk next to the launchers, always up to date."""
    if not HELPER_SCRIPT_PATH:
        return
    s = await get_settings()
    script = build_ahk_script(LOCAL_BASE_URL, s["helper_token"])
    data = "\ufeff" + script.replace("\r\n", "\n").replace("\n", "\r\n")
    try:
        Path(HELPER_SCRIPT_PATH).write_bytes(data.encode("utf-8"))
    except OSError as e:
        logger.error("Cannot write helper script: %s", e)


# ---------------- helper (AutoHotkey) endpoints ----------------
@api.get("/helper/config", response_class=PlainTextResponse)
async def helper_config(_: bool = Depends(require_helper)):
    hk = await get_hotkeys_doc()
    lines = [f"version={hk['version']}"]
    for action in ("win", "lose", "undo"):
        lines.append(f"{action}=" + "|".join(numpad_variants(hk["keys"][action]["ahk"])))
    return "\n".join(lines) + "\n"


@api.post("/helper/action/{action}", response_class=PlainTextResponse)
async def helper_action(action: Literal["win", "lose", "undo"], _: bool = Depends(require_helper)):
    state, changed = await apply_score_action(action, source="hotkey")
    return f"ok {action} W={state['wins']} L={state['losses']} changed={int(changed)}\n"


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- local build: serve the web app from the same server ----------------
if STATIC_DIR and STATIC_DIR.exists():
    INDEX_HTML = STATIC_DIR / "index.html"

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(404)
        candidate = (STATIC_DIR / full_path).resolve()
        if full_path and candidate.is_file() and str(candidate).startswith(str(STATIC_DIR)):
            headers = {"Cache-Control": "public, max-age=86400"} if "/medals/" in f"/{full_path}" or full_path.startswith("static/") else {}
            return FileResponse(candidate, headers=headers)
        return FileResponse(INDEX_HTML, headers={"Cache-Control": "no-cache"})


@app.on_event("startup")
async def startup():
    await get_settings()
    await get_score_doc()
    await get_rank_doc()
    await get_hotkeys_doc()
    await write_local_helper()
    logger.info("IMBA Widgets backend ready (storage=%s, local=%s)", DB_MODE, IS_LOCAL)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
