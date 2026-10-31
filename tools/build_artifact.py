#!/usr/bin/env python3
"""Prépare la version « Artifact » (page partagée claude.ai) dans dist/.

  python tools/build_artifact.py

- dist/content.js : contenu compilé SANS les figures du Collège (œuvre protégée : version personnelle uniquement)
- dist/orl-interne.html : page (sans <html>/<head>/<body> : le squelette est ajouté à la publication)
- dist/files.json : correspondance chemin publié → fichier source, à passer à la publication
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    DIST.mkdir(exist_ok=True)
    r = subprocess.run([sys.executable, str(ROOT / "tools" / "build.py"), "--out", "dist/content.js",
                        "--exclude-img", "img/college/"], capture_output=True, text=True, encoding="utf-8")
    print(r.stdout.splitlines()[0] if r.stdout else r.stderr)
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    body = re.sub(r'<script src="data/content\.js[^"]*"></script>\s*<script src="assets/app\.js[^"]*"></script>', "", body)
    draft = "false" if "--final" in sys.argv else "true"
    page = f"""<title>ORL Interne</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Fiches ORL, ordonnances types, post-op et urgences de garde pour l'interne d'ORL.">
<link rel="stylesheet" href="assets/app.css">
{body.strip()}
<script>window.ORL_ARTIFACT = true; window.ORL_DRAFT = {draft};</script>
<script src="data/content.js"></script>
<script src="assets/app.js"></script>
"""
    (DIST / "orl-interne.html").write_text(page, encoding="utf-8")
    raw = (DIST / "content.js").read_text(encoding="utf-8")
    data = json.loads(raw[len("window.ORL="):].rstrip().rstrip(";"))
    files = {"assets/app.css": "assets/app.css", "assets/app.js": "assets/app.js", "data/content.js": "dist/content.js"}
    for f in data["figures"]:
        files[f["src"]] = f["src"]
    (DIST / "files.json").write_text(json.dumps(files, ensure_ascii=False, indent=1), encoding="utf-8")
    size = sum((ROOT / v).stat().st_size for v in files.values())
    print(f"{len(files)} fichiers à publier · {size // 1024} Ko")


if __name__ == "__main__":
    main()
