#!/usr/bin/env python3
"""Contrôles de sécurité sur les ordonnances et le contenu compilé (data/content.js).

  python tools/lint.py            (après python tools/build.py)

Signale des MOTIFS À RISQUE à relire (ce ne sont pas forcément des erreurs).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "content.js"


def fold(s):
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


INFECTIEUX = {"angine", "phlegmon-periamygdalien", "infections-cervicales-profondes", "otite-moyenne-aigue",
              "otite-externe", "rhinosinusite-aigue", "otite-chronique", "adenopathie-cervicale",
              "glandes-salivaires", "drainage-abces-cervical", "urg-cellulite-cervicale",
              "urg-otomastoidite", "urg-complications-sinusiennes", "kystes-cervicaux-congenitaux"}
NEG = re.compile(r"(pas d|pas de|ne pas|n'est pas|jamais|sans |eviter|evitez|proscri|contre-indiqu|\bci\b|ni |aucun|interdit|non recommande|deconseill|ne prenez pas|ne donnez pas|pas l')[^.\n]{0,40}$")


def risky(t, pattern):
    """vrai si le motif apparaît au moins une fois SANS négation juste avant"""
    for m in re.finditer(pattern, t):
        if not NEG.search(t[max(0, m.start() - 60):m.start()]):
            return True
    return False


DUREE = re.compile(r"pendant|jours?\b|semaines?\b|mois\b|duree|dose unique|qsp|a renouveler|jusqu'a|"
                   r"si besoin|si douleur|au long cours|a vie|en continu|24 h|48 h|72 h|heures", re.I)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    raw = DATA.read_text(encoding="utf-8")
    d = json.loads(raw[len("window.ORL="):].rstrip().rstrip(";"))
    issues = []

    def add(ref, msg):
        issues.append(f"[{ref}] {msg}")

    for o in d["ordos"]:
        t = fold(o["text"] + " " + " ".join(o.get("doses", [])))
        pub = fold(o["public"])
        ref = f'{o["ref"]} « {o["titre"]} »'
        if o["type"] == "Traitement" and not DUREE.search(t):
            add(ref, "traitement sans durée explicite")
        if o["type"] == "Traitement" and re.search(r"enfant|nourrisson", pub) and "poids" not in t:
            add(ref, "ordonnance pédiatrique sans ligne « Poids »")
        if re.search(r"enfant|nourrisson", pub) and risky(t, r"codeine"):
            add(ref, "CODÉINE dans une ordonnance pédiatrique")
        if re.search(r"enfant|nourrisson", pub) and risky(t, r"\baspirine|acide acetylsalicylique"):
            add(ref, "aspirine chez l'enfant")
        if risky(t, r"azithromycine"):
            add(ref, "azithromycine (plus recommandée dans l'angine depuis HAS 2024) — vérifier l'indication")
        if risky(t, r"pseudoephedrine|phenylephrine|naphazoline|oxymetazoline|tuaminoheptane"):
            add(ref, "vasoconstricteur — vérifier (ANSM : déconseillés ; CI < 15 ans)")
        if re.search(r"\bcp/j\b|\bx ?/ ?j\b|\bgtt\b|\bcpr\b|\bamp\b", t):
            add(ref, "abréviation ambiguë (cp/j, x/j, gtt…)")
        if o["doc"] in INFECTIEUX and risky(t, r"ibuprofene|ketoprofene|diclofenac|naproxene|\bains\b"):
            add(ref, "AINS dans un contexte infectieux ORL — vérifier (ANSM/HAS 2025)")
        if re.search(r"\b(\d+)\s*g\s*(?:x|×)\s*(\d)", t):
            pass
        if "paracetamol" in t and re.search(r"enfant|nourrisson", pub) and not re.search(r"15 mg/kg|dose-poids|dose poids|mg/kg", t):
            add(ref, "paracétamol pédiatrique sans dose en mg/kg ni dose-poids")
        if not o["text"].strip():
            add(ref, "ordonnance vide")

    for doc in d["docs"]:
        t = fold(doc["text"])
        if "azithromycine" in t and doc["id"] in ("angine",):
            pass
        if doc["section"] != "textes" and re.search(r"\[a completer\]|todo|tbd|xxx", t):
            add(doc["id"], "marqueur de travail non résolu (TODO / xxx / [à compléter])")

    print(f"{len(d['ordos'])} ordonnances contrôlées · {len(issues)} point(s) à relire")
    for i in issues:
        print("  - " + i)


if __name__ == "__main__":
    main()
