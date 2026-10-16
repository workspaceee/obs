"""POC: download original Dota 2 rank medals (transparent PNG), verify alpha, build crisp 2x versions."""
import io
import json
import time
import urllib.request
from pathlib import Path

from PIL import Image, ImageFilter

OUT = Path("/app/frontend/public/medals")
OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 IMBAWidgets/1.0"}
API = "https://dota2.fandom.com/api.php"

names = ["SeasonalRank0-0.png"]
names += [f"SeasonalRank{r}-{s}.png" for r in range(1, 8) for s in range(1, 6)]
names += [f"SeasonalRankTop{i}.png" for i in range(0, 5)]


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


urls = {}
for i in range(0, len(names), 40):
    chunk = names[i:i + 40]
    q = f"{API}?action=query&prop=imageinfo&iiprop=url&format=json&titles=" + "|".join("File:" + n for n in chunk)
    data = json.loads(get(q))
    for p in data["query"]["pages"].values():
        urls[p["title"].replace("File:", "")] = p["imageinfo"][0]["url"]

ok, fail = 0, []
for n in names:
    try:
        raw = get(urls[n])
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
        a = img.getchannel("A")
        corners = [a.getpixel(p) for p in [(0, 0), (255, 0), (0, 255), (255, 255)]]
        assert all(c == 0 for c in corners), f"corners not transparent {corners}"
        assert a.getextrema()[1] == 255, "no opaque pixels"
        slug = n.replace("SeasonalRank", "").replace(".png", "").lower()  # 1-3 / top0
        # premultiply-safe 2x upscale: resize in premultiplied space to avoid dark fringes
        big = img.resize((512, 512), Image.LANCZOS)
        big = big.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        big.save(OUT / f"{slug}.png", optimize=True)
        ok += 1
        time.sleep(0.15)
    except Exception as e:  # noqa
        fail.append((n, str(e)))

print(f"OK {ok}/{len(names)}")
print("FAIL", fail)
assert not fail
