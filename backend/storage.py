"""Storage layer.

- Cloud / dev: MongoDB via motor (when MONGO_URL is set).
- Local Windows build: tiny JSON-file database (no MongoDB install needed).

The JSON backend implements only the small subset of the Mongo API used by server.py.
"""
import asyncio
import copy
import json
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("imba.storage")


def _enc(o):
    if isinstance(o, datetime):
        return {"$dt": o.isoformat()}
    raise TypeError(f"not serializable: {type(o)}")


def _dec(d):
    if isinstance(d, dict) and set(d.keys()) == {"$dt"}:
        return datetime.fromisoformat(d["$dt"])
    return d


def _match(doc, flt):
    for k, v in (flt or {}).items():
        if isinstance(v, dict) and "$ne" in v:
            if doc.get(k) == v["$ne"]:
                return False
        elif doc.get(k) != v:
            return False
    return True


def _project(doc, proj):
    d = copy.deepcopy(doc)
    if proj:
        for k, v in proj.items():
            if v == 0:
                d.pop(k, None)
    return d


class JsonStore:
    CAPS = {"score_log": 500, "sessions": 200}

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.data = {}
        if self.path.exists():
            try:
                self.data = json.loads(self.path.read_text("utf-8"), object_hook=_dec)
            except Exception as e:  # corrupted file -> keep a backup, start clean
                bak = self.path.with_suffix(f".broken-{int(time.time())}.json")
                try:
                    self.path.replace(bak)
                except OSError:
                    pass
                logger.warning("DB file was damaged, backup saved to %s (%s)", bak, e)
                self.data = {}

    def save(self):
        with self.lock:
            for name, cap in self.CAPS.items():
                if name in self.data and len(self.data[name]) > cap:
                    self.data[name] = self.data[name][-cap:]
            raw = json.dumps(self.data, default=_enc, ensure_ascii=False, indent=1)
            tmp = self.path.with_suffix(".tmp")
            for attempt in range(5):
                try:
                    tmp.write_text(raw, "utf-8")
                    os.replace(tmp, self.path)
                    return
                except OSError:
                    time.sleep(0.05 * (attempt + 1))
            logger.error("Could not write DB file %s", self.path)

    def __getattr__(self, name):
        if name.startswith("_") or name in ("path", "lock", "data"):
            raise AttributeError(name)
        return JsonCollection(self, name)

    def __getitem__(self, name):
        return JsonCollection(self, name)


class JsonCursor:
    def __init__(self, docs, proj):
        self.docs = docs
        self.proj = proj

    def sort(self, key, direction=1):
        self.docs = sorted(self.docs, key=lambda d: (d.get(key) is None, d.get(key)), reverse=direction < 0)
        return self

    async def to_list(self, n=None):
        docs = self.docs if n is None else self.docs[:n]
        return [_project(d, self.proj) for d in docs]


class JsonCollection:
    def __init__(self, store: JsonStore, name: str):
        self.store = store
        self.name = name

    @property
    def docs(self):
        return self.store.data.setdefault(self.name, [])

    async def find_one(self, flt=None, proj=None):
        for d in self.docs:
            if _match(d, flt):
                return _project(d, proj)
        return None

    def find(self, flt=None, proj=None):
        return JsonCursor([d for d in self.docs if _match(d, flt)], proj)

    async def update_one(self, flt, upd, upsert=False):
        target = next((d for d in self.docs if _match(d, flt)), None)
        if target is None:
            if not upsert:
                return
            target = {k: v for k, v in flt.items() if not isinstance(v, dict)}
            target.update(copy.deepcopy(upd.get("$setOnInsert", {})))
            self.docs.append(target)
        target.update(copy.deepcopy(upd.get("$set", {})))
        self.store.save()

    async def insert_one(self, doc):
        self.docs.append(copy.deepcopy(doc))
        self.store.save()

    async def delete_one(self, flt):
        for i, d in enumerate(self.docs):
            if _match(d, flt):
                del self.docs[i]
                self.store.save()
                return

    async def delete_many(self, flt):
        self.store.data[self.name] = [d for d in self.docs if not _match(d, flt)]
        self.store.save()


class _NoClient:
    def close(self):
        pass


def get_db():
    """Returns (db, client, mode)."""
    mongo_url = os.environ.get("MONGO_URL")
    if mongo_url:
        from motor.motor_asyncio import AsyncIOMotorClient

        client = AsyncIOMotorClient(mongo_url)
        return client[os.environ.get("DB_NAME", "imba_widgets")], client, "mongo"
    data_dir = Path(os.environ.get("DATA_DIR") or (Path(__file__).parent / "data"))
    store = JsonStore(data_dir / "imba-db.json")
    return store, _NoClient(), "json"


# silence "unused" linters
_ = asyncio
