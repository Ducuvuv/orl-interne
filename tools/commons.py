#!/usr/bin/env python3
"""Recherche et téléchargement d'images libres sur Wikimedia Commons (avec crédits).

  python tools/commons.py search "otitis media" [--limit 20]
  python tools/commons.py info  "File:Otitis media.jpg"
  python tools/commons.py get   "File:Otitis media.jpg" img/otologie/oma-bombement.jpg [--width 1200]

`get` enregistre l'image + un fichier de crédits voisin (img/.../nom.jpg.json) lu par build.py.
"""
import html
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
UA = "ORLInterneBot/1.0 (https://github.com/Ducuvuv/orl-interne; personal study app) python-urllib/3.12"
ROOT = Path(__file__).resolve().parent.parent


def api(params):
    params = {**params, "format": "json", "formatversion": "2"}
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def imageinfo(titles, width=None):
    p = {"action": "query", "prop": "imageinfo", "titles": "|".join(titles),
         "iiprop": "url|size|mime|extmetadata"}
    if width:
        p["iiurlwidth"] = str(width)
    return api(p)["query"]["pages"]


def meta_of(page):
    ii = page["imageinfo"][0]
    em = ii.get("extmetadata", {})
    g = lambda k: clean(em.get(k, {}).get("value", ""))  # noqa
    return {
        "title": page["title"],
        "author": g("Artist") or g("Credit"),
        "license": g("LicenseShortName"),
        "license_url": em.get("LicenseUrl", {}).get("value", ""),
        "source": ii.get("descriptionurl", ""),
        "description": g("ImageDescription")[:400],
        "width": ii.get("width"), "height": ii.get("height"), "mime": ii.get("mime"),
        "url": ii.get("url"), "thumburl": ii.get("thumburl"),
    }


def cmd_search(q, limit=20):
    r = api({"action": "query", "list": "search", "srsearch": q + " filetype:bitmap|drawing", "srnamespace": "6", "srlimit": str(limit)})
    titles = [x["title"] for x in r["query"]["search"]]
    if not titles:
        print("Aucun résultat"); return
    pages = imageinfo(titles)
    for p in pages:
        if "imageinfo" not in p:
            continue
        m = meta_of(p)
        if not (m["mime"] or "").startswith("image/"):
            continue
        print(f"- {m['title']}  [{m['width']}x{m['height']} {m['mime']}]  {m['license']}")
        if m["description"]:
            print(f"    {m['description'][:220]}")


def cmd_info(title):
    for p in imageinfo([title]):
        if "imageinfo" in p:
            print(json.dumps(meta_of(p), ensure_ascii=False, indent=2))
        else:
            print("Introuvable :", title)


def cmd_get(title, dest, width=1200):
    pages = imageinfo([title], width=width)
    p = pages[0]
    if "imageinfo" not in p:
        sys.exit(f"Introuvable : {title}")
    m = meta_of(p)
    url = m["thumburl"] or m["url"]
    if m["mime"] == "image/svg+xml" and dest.endswith(".svg"):
        url = m["url"]
    dest_p = (ROOT / dest).resolve()
    if ROOT / "img" not in dest_p.parents:
        sys.exit("La destination doit être dans img/")
    dest_p.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    dest_p.write_bytes(data)
    credit = {k: m[k] for k in ("title", "author", "license", "license_url", "source", "description")}
    Path(str(dest_p) + ".json").write_text(json.dumps(credit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK {dest} ({len(data)//1024} Ko) — {m['author']} · {m['license']}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(0)
    if a[0] == "search":
        lim = int(a[a.index("--limit") + 1]) if "--limit" in a else 20
        cmd_search(a[1], lim)
    elif a[0] == "info":
        cmd_info(a[1])
    elif a[0] == "get":
        w = int(a[a.index("--width") + 1]) if "--width" in a else 1200
        cmd_get(a[1], a[2], w)
    else:
        print(__doc__)
