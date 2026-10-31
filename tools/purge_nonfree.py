#!/usr/bin/env python3
"""Retire du contenu toutes les figures non libres (figures du Collège, « usage personnel », licences NC/ND).

  python tools/purge_nonfree.py          (aperçu)
  python tools/purge_nonfree.py --apply  (modifie les fichiers)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NONFREE = re.compile(r"usage personnel|\bNC\b|\bND\b|non commercial|tous droits", re.I)


def nonfree(src):
    if src.startswith("img/college/"):
        return True
    j = ROOT / (src + ".json")
    if j.exists():
        try:
            lic = json.loads(j.read_text(encoding="utf-8")).get("license", "")
        except Exception:  # noqa
            return False
        return bool(NONFREE.search(lic))
    return False


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    apply = "--apply" in sys.argv
    total = 0
    used_nonfree = set()
    for f in sorted((ROOT / "content").rglob("*.md")):
        s = f.read_text(encoding="utf-8")
        removed = []

        def drop(m):
            src = re.search(r"^src:\s*(\S+)", m.group(0), re.M)
            if src and nonfree(src.group(1)):
                removed.append(src.group(1))
                return ""
            return m.group(0)

        s2 = re.sub(r"^:::figure[^\n]*\n.*?^:::[ \t]*\n?", drop, s, flags=re.M | re.S)
        s2 = re.sub(r"\n{3,}", "\n\n", s2)
        if removed:
            total += len(removed)
            used_nonfree.update(removed)
            print(f"{f.relative_to(ROOT)} : {len(removed)} figure(s) retirée(s)")
            if apply:
                f.write_text(s2, encoding="utf-8")
    # images non libres hors img/college (copies recadrées, etc.)
    extra = [p for p in (ROOT / "img").rglob("*.json")
             if "college" not in p.parts and Path(p.stem).suffix and nonfree(str(p.relative_to(ROOT))[:-5].replace("\\", "/"))]
    for j in extra:
        img = j.with_suffix("")
        print(f"fichier non libre : {img.relative_to(ROOT)}")
        if apply:
            img.unlink(missing_ok=True)
            j.unlink(missing_ok=True)
    print(f"\n{total} figure(s) non libre(s) {'retirée(s)' if apply else 'à retirer'} ; {len(extra)} fichier(s) image non libre(s) hors img/college.")


if __name__ == "__main__":
    main()
