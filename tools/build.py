#!/usr/bin/env python3
"""Compile content/**/*.md -> data/content.js

Usage :  python tools/build.py            (build + rapport)
         python tools/build.py --strict   (échoue au moindre avertissement)

Syntaxe des blocs : voir docs/STYLE.md
"""
import html
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
IMG = ROOT / "img"
OUT = ROOT / "data" / "content.js"
EXCLUDE_IMG = []  # préfixes d'images à exclure (ex. version partagée sans figures du Collège)

SECTIONS = {
    "fiches": "Fiche",
    "urgences": "Urgence de garde",
    "postop": "Post-op",
    "textes": "Texte type",
    "outils": "Outil",
}
SPECIALITES = {
    "otologie": "Otologie",
    "rhinologie": "Rhinologie",
    "pharynx-larynx": "Pharynx · Larynx",
    "cervical": "Cou · Glandes",
    "cancerologie": "Cancérologie",
    "transversal": "Transversal",
}
REQUIRED_H2 = {
    "fiches": ["L'essentiel", "Clinique", "Paraclinique", "Prise en charge",
               "Surveillance et quand reconsulter", "Ordonnances"],
    "postop": ["L'essentiel", "Suites normales", "Complications à surveiller",
               "Consignes post-opératoires", "Ordonnances de sortie", "Quand reconsulter en urgence"],
    "urgences": ["Reconnaître", "Gestes immédiats", "Traitement"],
}
ORDO_TYPES = ["Traitement", "Bilan", "Imagerie", "Soins infirmiers", "Kinésithérapie", "Orthophonie",
              "Matériel", "Arrêt de travail", "Certificat", "Transport", "Courrier"]
BLOCK_TYPES = ["alerte", "info", "astuce", "conseil", "ordo", "modele", "figure", "widget"]

warnings = []


def warn(doc, msg):
    warnings.append(f"[{doc}] {msg}")


def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "section"


def fold(s):
    """minuscule sans accents, pour la recherche"""
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s.lower()).strip()


def strip_tags(h):
    h = re.sub(r"<(br|/p|/li|/h\d|/tr|/div)[^>]*>", "\n", h)
    t = re.sub(r"<[^>]+>", "", h)
    t = html.unescape(t)
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n\s*\n+", "\n", t)
    return t.strip()


MD_EXT = ["tables", "sane_lists", "attr_list", "def_list", "abbr"]


def stack_table(m):
    """Tableaux >= 3 colonnes : classe 'stack' + data-label (affichage en cartes sur mobile)."""
    t = m.group(0)
    heads = [strip_tags(x).strip() for x in re.findall(r"<th[^>]*>(.*?)</th>", t, re.S)]
    if len(heads) >= 3:
        def row(rm):
            i = [0]

            def cell(cm):
                lab = heads[i[0]] if i[0] < len(heads) else ""
                i[0] += 1
                return f'<td{cm.group(1)} data-label="{html.escape(lab, quote=True)}">'
            return re.sub(r"<td([^>]*)>", cell, rm.group(0))
        t = re.sub(r"<tr>.*?</tr>", row, t, flags=re.S)
        t = t.replace("<table>", '<table class="stack">', 1)
    return f'<div class="tbl">{t}</div>'


LIST_ITEM = re.compile(r"^\s{0,3}([-*+]|\d+[.)])\s+\S")


def fix_lists(text):
    """Insère une ligne vide avant une liste qui suit directement un paragraphe (sinon Markdown ne la voit pas)."""
    out = []
    for line in text.split("\n"):
        # sous-listes indentées de 2-3 espaces → 4 (sinon Markdown les affiche à plat)
        m = re.match(r"^( +)([-*+]|\d+[.)])\s", line)
        if m:
            n = len(m.group(1))
            if n in (2, 3):
                line = "    " + line[n:]
            elif n in (5, 6, 7):
                line = "        " + line[n:]
        if out and LIST_ITEM.match(line):
            prev = out[-1]
            if prev.strip() and not LIST_ITEM.match(prev) and not prev.startswith((" ", "\t", "|", "#", ">")) \
                    and not re.match(r"^\s*$", prev):
                out.append("")
        out.append(line)
    return "\n".join(out)


def md(text, nl2br=False):
    ext = MD_EXT + (["nl2br"] if nl2br else [])
    h = markdown.markdown(fix_lists(text), extensions=ext, output_format="html")
    return re.sub(r"<table>.*?</table>", stack_table, h, flags=re.S)


def md_to_plain(text):
    """Texte brut copiable (pour ordonnances / modèles)."""
    t = text.replace("\r", "")
    t = re.sub(r"(?im)^[ \t]*dose\s*:.*\n?", "", t)
    t = re.sub(r"\{(mg|mL|ml|g|kg)\}", "____", t)
    t = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", t)
    t = re.sub(r"\[\[([^\]]+)\]\]", r"\1", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"\1", t)
    t = re.sub(r"(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)", r"\1", t)
    t = re.sub(r"^#+\s*", "", t, flags=re.M)
    t = re.sub(r"^\s*[-*+]\s+", "- ", t, flags=re.M)
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


# ---------- Ordonnances : rendu « vraie ordonnance » + données de calcul pédiatrique ----------
BLANK = "⟦B⟧"
NUM = r"(\d+(?:[.,]\d+)?)"
NOTE_START = re.compile(r"^\s*(renseignements|question|indication|recherche|r[ée]sultats|nb\b|n\.b\.|pas d|pas de|"
                        r"reconsulter|consulter|appeler|[àa] r[ée]aliser|merci|conseil|important|attention|si |en cas)",
                        re.I)


def _num(x):
    return float(x.replace(",", "."))


def inline_md(s):
    s = re.sub(r"_{3,}", BLANK, s)
    # champs calculés {mg} {mL} {g} {kg} (remplis selon le poids de l'enfant)
    s = re.sub(r"\{(mg|mL|ml|g|kg)\}", lambda m: "⟦U" + m.group(1).replace("ml", "mL") + "⟧", s)
    h = markdown.markdown(s, output_format="html").strip()
    h = re.sub(r"^<p>(.*)</p>$", r"\1", h, flags=re.S)
    h = re.sub(r"⟦U(mg|mL|g|kg)⟧", lambda m: f'<span class="blank" data-u="{m.group(1)}"></span>', h)
    return h


def _blanks(h):
    """remplace les marqueurs de blanc par des champs, en devinant l'unité qui suit (mg / mL / kg)"""
    parts = h.split(BLANK)
    out = [parts[0]]
    for nxt in parts[1:]:
        mm = re.match(r"\s*(?:</?\w+[^>]*>\s*)*(mg|mL|ml|kg|g)\b", nxt)
        unit = mm.group(1).replace("ml", "mL") if mm else ""
        out.append(f'<span class="blank" data-u="{unit}"></span>')
        out.append(nxt)
    return "".join(out)


def _fill(h):
    h = re.sub(r"\[([^\[\]<>\n]{1,120})\]", lambda m: f'<span class="fill">{m.group(1)}</span>', h)
    return _blanks(h) if BLANK in h else h


# plafonds de sécurité par molécule (dose adulte maximale usuelle en ORL) si l'ordonnance n'en précise pas
DEFAULT_MAX = [
    ("paracetamol", {"maxp": 1000, "maxj": 4000, "maxkgj": 80}),
    ("ibuprofene", {"maxp": 400, "maxj": 1200, "maxkgj": 30}),
    ("amoxicilline", {"maxj": 3000}),
    ("cefpodoxime", {"maxj": 400}),
    ("clarithromycine", {"maxj": 1000}),
    ("azithromycine", {"maxj": 500}),
    ("josamycine", {"maxj": 2000}),
    ("pristinamycine", {"maxj": 2000}),
    ("sulfamethoxazole", {"maxj": 1600}),
    ("cotrimoxazole", {"maxj": 1600}),
    ("prednisolone", {"maxj": 60}),
    ("prednisone", {"maxj": 60}),
    ("metronidazole", {"maxj": 1500}),
]


def _fold(s):
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower()


def parse_dose(name, lines):
    """Données de calcul d'une ligne pédiatrique : mg/kg/j ou mg/kg/prise, nb de prises, concentration, maxima."""
    t = " ".join([name] + lines).replace(" ", " ").replace("\xa0", " ")
    t = re.sub(r"\*\*|`", "", t)
    d = {}
    m = re.search(NUM + r"\s*mg\s*/\s*kg\s*/\s*j(?:our)?\b", t)
    mp = re.search(NUM + r"\s*mg\s*/\s*kg\s*(?:par prise|toutes les|/\s*prise)", t)
    if m:
        d["mgkgj"] = _num(m.group(1))
    elif mp:
        d["mgkgp"] = _num(mp.group(1))
    else:
        return None
    n = None
    mm = re.search(r"en\s+(\d)\s+prises?", t) or re.search(r"(\d)\s+fois\s+par\s+jour", t)
    if mm:
        n = int(mm.group(1))
    elif re.search(r"matin,\s*midi et soir", t):
        n = 3
    elif re.search(r"matin et soir", t):
        n = 2
    elif re.search(r"toutes les 6\s*h", t):
        n = 4
    elif re.search(r"toutes les 8\s*h", t):
        n = 3
    elif re.search(r"toutes les 12\s*h", t):
        n = 2
    elif re.search(r"en (une|1) prise|une fois par jour|1 prise", t):
        n = 1
    if not n:
        return None
    d["n"] = n
    nm = name.replace(" ", " ")
    c = re.search(NUM + r"\s*mg\s*/\s*" + NUM + r"\s*mL", nm)
    c2 = re.search(NUM + r"\s*mg\s*(?:/\s*" + NUM + r"\s*mg)?\s*(?:/|par)\s*mL", nm)
    c3 = re.search(NUM + r"\s*%", nm)
    if c:
        d["conc"] = _num(c.group(1)) / _num(c.group(2))
    elif c2:
        d["conc"] = _num(c2.group(1))
    elif c3 and ("suspension" in nm.lower() or "solution" in nm.lower()):
        d["conc"] = _num(c3.group(1)) * 10
    mx = re.search(r"(?:max(?:imum)?|sans d[ée]passer|ne pas d[ée]passer|plafond)\s*:?\s*" + NUM + r"\s*(g|mg)\s*(?:par jour|/\s*j(?:our)?\b)", t, re.I)
    if mx:
        d["maxj"] = _num(mx.group(1)) * (1000 if mx.group(2) == "g" else 1)
    mxp = re.search(r"(?:max(?:imum)?|sans d[ée]passer|ne pas d[ée]passer)\s*:?\s*" + NUM + r"\s*(g|mg)\s*par prise", t, re.I)
    if mxp:
        d["maxp"] = _num(mxp.group(1)) * (1000 if mxp.group(2) == "g" else 1)
    mk = re.search(r"(?:max(?:imum)?|sans d[ée]passer|ne pas d[ée]passer)[^.;]{0,12}?" + NUM + r"\s*mg\s*/\s*kg\s*/\s*j", t, re.I)
    if mk and d.get("mgkgj") != _num(mk.group(1)):
        d["maxkgj"] = _num(mk.group(1))
    fn = _fold(name)
    for dci, caps in DEFAULT_MAX:
        if dci in fn:
            for k, v in caps.items():
                d.setdefault(k, v)
            break
    return d


def render_rx(content, pediatric):
    """Corps d'ordonnance : une entrée numérotée par médicament/examen (nom puis lignes de posologie), conseils à part."""
    nodes = []  # ("item", name, [lines]) | ("note", text) | ("poids",)
    for para in re.split(r"\n\s*\n", content.strip()):
        cur = None
        for raw in para.split("\n"):
            line = raw.strip()
            if not line:
                continue
            if re.match(r"^poids\s*:", line, re.I):
                nodes.append(("poids",))
                cur = None
                continue
            if line.startswith("**") and not NOTE_START.match(line.lstrip("*")):
                cur = ["item", line, [], ""]
                nodes.append(cur)
            elif cur is not None and re.match(r"^dose\s*:", line, re.I):
                cur[3] = re.sub(r"^dose\s*:\s*", "", line, flags=re.I)
            elif cur is not None and not NOTE_START.match(line):
                cur[2].append(line)
            else:
                nodes.append(("note", line))
                cur = None
    out, k = [], 0
    for nd in nodes:
        if nd[0] == "poids":
            out.append('<div class="rx-poids">Poids : <span class="blank" data-u="kg"></span> kg</div>')
        elif nd[0] == "note":
            out.append(f'<div class="rx-note">{_fill(inline_md(nd[1]))}</div>')
        else:
            k += 1
            name, lines, dose = nd[1], nd[2], nd[3]
            attrs = ""
            if pediatric:
                dd = parse_dose(name, [dose] if dose else lines)
                if dd:
                    attrs = " " + " ".join(f'data-{a}="{v:g}"' for a, v in dd.items())
            body = "".join(f'<div class="rx-l">{_fill(inline_md(l))}</div>' for l in lines)
            dose_html = f'<div class="rx-dose">{html.escape(dose)}</div>' if dose else ""
            out.append(f'<div class="rx-item"{attrs}><span class="rx-n">{k}</span><div class="rx-c">'
                       f'<div class="rx-name">{_fill(inline_md(name))}</div>{body}{dose_html}</div></div>')
    return f'<div class="rx{" rx-ped" if pediatric else ""}">{"".join(out)}</div>'


def parse_meta_body(inner):
    """Lignes 'clé: valeur' jusqu'à '---', puis corps. Sans '---' : tout est corps."""
    lines = inner.split("\n")
    if "---" in [l.strip() for l in lines]:
        idx = [l.strip() for l in lines].index("---")
        head, body = lines[:idx], lines[idx + 1:]
        meta = {}
        ok = True
        for l in head:
            if not l.strip():
                continue
            m = re.match(r"^\s*([a-zA-Zéè_]+)\s*:\s*(.*)$", l)
            if not m:
                ok = False
                break
            meta[m.group(1).lower()] = m.group(2).strip()
        if ok:
            return meta, "\n".join(body).strip("\n")
    return {}, inner.strip("\n")


def load_credits():
    credits = {}
    for p in IMG.rglob("*.json"):
        if p.name.endswith(".json") and p.stem and Path(p.stem).suffix:
            rel = p.relative_to(ROOT).as_posix()[:-5]  # img/x.jpg
            try:
                credits[rel] = json.loads(p.read_text(encoding="utf-8"))
            except Exception as e:  # noqa
                warnings.append(f"[credits] {p}: JSON invalide ({e})")
    return credits


def credit_html(c):
    if not c:
        return ""
    author = html.escape(c.get("author", "").strip() or "Auteur inconnu")
    lic = html.escape(c.get("license", "").strip())
    src = c.get("source", "")
    lic_url = c.get("license_url", "")
    parts = [author]
    if lic:
        parts.append(f'<a href="{html.escape(lic_url)}" target="_blank" rel="noopener">{lic}</a>' if lic_url else lic)
    if src:
        parts.append(f'<a href="{html.escape(src)}" target="_blank" rel="noopener">source</a>')
    return " · ".join(parts)


def main():
    global OUT
    strict = "--strict" in sys.argv
    if "--out" in sys.argv:
        OUT = (ROOT / sys.argv[sys.argv.index("--out") + 1]).resolve()
    if "--exclude-img" in sys.argv:
        EXCLUDE_IMG.append(sys.argv[sys.argv.index("--exclude-img") + 1])
    credits = load_credits()
    files = sorted(CONTENT.rglob("*.md"))
    raw_docs = []
    for f in files:
        section = f.relative_to(CONTENT).parts[0]
        if section not in SECTIONS:
            warn(f.name, f"dossier inconnu '{section}'")
            continue
        txt = f.read_text(encoding="utf-8").replace("\r\n", "\n")
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", txt, re.S)
        if not m:
            warn(f.name, "front matter YAML manquant")
            continue
        try:
            fm = yaml.safe_load(m.group(1)) or {}
        except yaml.YAMLError as e:
            warn(f.name, f"YAML invalide : {e}")
            continue
        fm.setdefault("id", f.stem)
        if fm["id"] != f.stem:
            warn(f.name, f"id '{fm['id']}' ≠ nom de fichier '{f.stem}'")
        raw_docs.append((f, section, fm, m.group(2)))

    titles = {fm["id"]: fm.get("titre", fm["id"]) for _, _, fm, _ in raw_docs}
    ids_seen = set()
    docs, ordos, figures, modeles = [], [], [], []

    for f, section, fm, body in raw_docs:
        did = fm["id"]
        if did in ids_seen:
            warn(did, "id dupliqué")
        ids_seen.add(did)
        for k in ["titre"]:
            if not fm.get(k):
                warn(did, f"champ '{k}' manquant")
        spec = fm.get("specialite")
        if section in ("fiches", "postop") and spec not in SPECIALITES:
            warn(did, f"specialite '{spec}' inconnue ({', '.join(SPECIALITES)})")

        # liens [[id]] / [[id|texte]] / [[id#ancre|texte]]
        def wikilink(mm):
            target, label = mm.group(1), mm.group(2)
            tid, _, anchor = target.partition("#")
            tid = tid.strip()
            if tid not in titles:
                warn(did, f"lien vers id inconnu '{tid}'")
            lab = label or titles.get(tid, tid)
            href = f"#/d/{tid}" + (f"/{slugify(anchor)}" if anchor else "")
            return f"[{lab}]({href})"

        body = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", wikilink, body)

        # blocs :::type Titre ... :::
        placeholders = {}
        counters = {"ordo": 0, "figure": 0, "modele": 0, "conseil": 0}

        def block(mm):
            btype = mm.group(1).lower()
            title = mm.group(2).strip()
            inner = mm.group(3)
            key = f"@@BLOCK{len(placeholders)}@@"
            if btype not in BLOCK_TYPES:
                warn(did, f"bloc inconnu ':::{btype}'")
                placeholders[key] = md(inner)
                return f"\n\n{key}\n\n"
            meta, content = parse_meta_body(inner)
            if btype in ("alerte", "info", "astuce"):
                label = {"alerte": "Attention", "info": "À savoir", "astuce": "En pratique"}[btype]
                t = html.escape(title) if title else label
                placeholders[key] = (f'<div class="box box-{btype}"><div class="box-title">{t}</div>'
                                     f'{md(content)}</div>')
            elif btype == "conseil":
                n = counters["conseil"]; counters["conseil"] += 1
                if not title:
                    warn(did, "conseil sans titre")
                placeholders[key] = (
                    f'<div class="conseil" id="conseil-{did}-{n}"><div class="conseil-head">'
                    f'<span class="tag tag-conseil">Fiche conseil patient</span><h4>{html.escape(title)}</h4></div>'
                    f'<div class="conseil-body">{md(content)}</div>'
                    f'<div class="actions"><button class="btn" data-act="print-conseil" data-ref="{did}:{n}">'
                    f'<svg><use href="#i-print"/></svg>Imprimer</button></div></div>')
                modeles.append({"kind": "conseil", "ref": f"{did}:{n}", "doc": did, "titre": title,
                                "text": md_to_plain(content), "html": md(content)})
            elif btype == "ordo":
                n = counters["ordo"]; counters["ordo"] += 1
                public = meta.get("public", "")
                otype = meta.get("type", "")
                if not title:
                    warn(did, "ordo sans titre")
                if not public:
                    warn(did, f"ordo '{title}' : 'public:' manquant")
                if otype not in ORDO_TYPES:
                    warn(did, f"ordo '{title}' : type '{otype}' invalide ({', '.join(ORDO_TYPES)})")
                note = meta.get("note", "")
                pediatric = bool(re.search(r"enfant|nourrisson", public, re.I)) and not re.search(r"^adulte$", public, re.I)
                if otype == "Courrier":
                    body_html = f'<div class="rx rx-letter">{_fill(md(re.sub(r"_{3,}", BLANK, content), nl2br=True))}</div>'
                else:
                    body_html = render_rx(content, pediatric)
                ref = f"{did}:{n}"
                doses = [re.sub(r"(?i)^\s*dose\s*:\s*", "", l) for l in content.splitlines()
                         if re.match(r"(?i)^\s*dose\s*:", l)]
                ordos.append({"ref": ref, "doc": did, "titre": title, "public": public, "type": otype,
                              "note": note, "html": body_html, "text": md_to_plain(content), "doses": doses})
                parts = [x.strip() for x in re.split(r"\s+[—–-]\s+", title) if x.strip()]
                head_t, head_s = (parts[0], " · ".join(parts[1:])) if parts else (title, "")
                note_html = (f'<details class="ordo-info"><summary>Indication · précautions</summary>'
                             f'<div>{html.escape(note)}</div></details>') if note else ""
                placeholders[key] = (
                    f'<div class="ordo" id="ordo-{did}-{n}" data-ref="{ref}"><div class="ordo-head">'
                    f'<div class="ordo-tags"><span class="tag tag-type">{html.escape(otype)}</span>'
                    f'<span class="tag tag-public">{html.escape(public)}</span></div>'
                    f'<h4>{html.escape(head_t)}</h4>'
                    f'{f"<div class=ordo-sub>{html.escape(head_s)}</div>" if head_s else ""}{note_html}</div>'
                    f'<div class="ordo-body">{body_html}</div>'
                    f'<div class="actions"><button class="btn" data-act="copy" data-ref="{ref}"><svg><use href="#i-copy"/></svg>Copier</button>'
                    f'<button class="btn" data-act="print-ordo" data-ref="{ref}"><svg><use href="#i-print"/></svg>Imprimer</button></div></div>')
            elif btype == "modele":
                n = counters["modele"]; counters["modele"] += 1
                ref = f"{did}:m{n}"
                modeles.append({"kind": "modele", "ref": ref, "doc": did, "titre": title,
                                "text": md_to_plain(content), "html": md(content, nl2br=True)})
                placeholders[key] = (
                    f'<div class="modele" id="modele-{did}-{n}"><div class="modele-head">'
                    f'<span class="tag tag-modele">Texte type</span><h4>{html.escape(title)}</h4></div>'
                    f'<div class="modele-body">{md(content, nl2br=True)}</div>'
                    f'<div class="actions"><button class="btn" data-act="copy" data-ref="{ref}"><svg><use href="#i-copy"/></svg>Copier</button>'
                    f'</div></div>')
            elif btype == "figure":
                n = counters["figure"]; counters["figure"] += 1
                src = meta.get("src", "").strip()
                personal = "usage personnel" in (credits.get(src) or {}).get("license", "").lower()
                if EXCLUDE_IMG and (personal or any(src.startswith(x) for x in EXCLUDE_IMG)):
                    placeholders[key] = ""
                    return f"\n\n{key}\n\n"
                alt = meta.get("alt", "") or title
                c = credits.get(src)
                lic = (c or {}).get("license", "")
                if src.startswith("img/college/") or re.search(r"usage personnel|\bNC\b|\bND\b|non commercial|tous droits",
                                                               lic, re.I):
                    warn(did, f"image NON LIBRE '{src}' ({lic or 'Collège'}) — interdite : images libres uniquement")
                if not src or not (ROOT / src).exists():
                    warn(did, f"figure introuvable '{src}'")
                if c is None:
                    if src.endswith(".svg"):
                        c = {"author": "Schéma original — ORL Interne", "license": ""}
                    else:
                        warn(did, f"figure '{src}' sans crédit (fichier .json manquant)")
                cap = md(content) if content.strip() else ""
                t = f"<strong>{html.escape(title)}</strong>" if title else ""
                cred = credit_html(c)
                figures.append({"doc": did, "src": src, "titre": title, "caption": cap, "credit": cred,
                                "anchor": f"fig-{did}-{n}"})
                placeholders[key] = (
                    f'<figure class="fig" id="fig-{did}-{n}"><a class="fig-img" href="{html.escape(src)}" '
                    f'data-zoom><img src="{html.escape(src)}" alt="{html.escape(alt)}" loading="lazy"></a>'
                    f'<figcaption>{t}{cap}<div class="credit">{cred}</div></figcaption></figure>')
            elif btype == "widget":
                wid = title or meta.get("id", "")
                placeholders[key] = f'<div class="widget" data-widget="{html.escape(wid)}"></div>'
            return f"\n\n{key}\n\n"

        body = re.sub(r"^:::([a-zA-Z]+)[ \t]*(.*?)\n(.*?)^:::[ \t]*$", block, body, flags=re.M | re.S)
        if re.search(r"^:::", body, re.M):
            warn(did, "bloc ':::' non fermé ou mal formé")

        h = md(body)
        for key, val in placeholders.items():
            h = h.replace(f"<p>{key}</p>", val).replace(key, val)

        # ancres H2 / H3
        toc, used = [], set()

        def anchor(mm):
            lvl, inner = mm.group(1), mm.group(2)
            base = slugify(strip_tags(inner))
            a = base
            i = 2
            while a in used:
                a = f"{base}-{i}"; i += 1
            used.add(a)
            if lvl == "2":
                toc.append({"id": a, "titre": strip_tags(inner)})
            return f'<h{lvl} id="{a}">{inner}</h{lvl}>'

        h = re.sub(r"<h([23])>(.*?)</h\1>", anchor, h)

        req = REQUIRED_H2.get(section)
        if req:
            present = [t["titre"] for t in toc]
            for r in req:
                if r not in present:
                    warn(did, f"section H2 manquante : '## {r}'")

        text = strip_tags(h)
        docs.append({
            "id": did,
            "section": section,
            "titre": fm.get("titre", did),
            "sous_titre": fm.get("sous_titre", ""),
            "specialite": spec or "",
            "items": fm.get("items", []) or [],
            "urgence": bool(fm.get("urgence", False)),
            "ordre": fm.get("ordre", 100),
            "tags": fm.get("tags", []) or [],
            "maj": str(fm.get("maj", "")),
            "sources": fm.get("sources", []) or [],
            "voir_aussi": fm.get("voir_aussi", []) or [],
            "toc": toc,
            "html": h,
            "text": unicodedata.normalize("NFC", re.sub(r"\s+", " ", text)),
        })
        for v in fm.get("voir_aussi", []) or []:
            if v not in titles:
                warn(did, f"voir_aussi : id inconnu '{v}'")
        if section == "fiches" and not fm.get("sources"):
            warn(did, "aucune source")

    docs.sort(key=lambda d: (list(SECTIONS).index(d["section"]), d["ordre"], fold(d["titre"])))
    data = {
        "built": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sections": SECTIONS,
        "specialites": SPECIALITES,
        "docs": docs,
        "ordos": ordos,
        "modeles": modeles,
        "figures": figures,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    js = "window.ORL=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT.write_text(js, encoding="utf-8")
    if OUT == ROOT / "data" / "content.js":
        # version des ressources dans index.html (évite le cache du navigateur après une mise à jour)
        import hashlib
        idx = ROOT / "index.html"
        ver = hashlib.sha1(js.encode("utf-8") + (ROOT / "assets" / "app.js").read_bytes()
                           + (ROOT / "assets" / "app.css").read_bytes()).hexdigest()[:10]
        page = idx.read_text(encoding="utf-8")
        page = re.sub(r'(src|href)="(assets/app\.js|assets/app\.css|data/content\.js)(\?v=[0-9a-f]+)?"',
                      lambda m: f'{m.group(1)}="{m.group(2)}?v={ver}"', page)
        idx.write_text(page, encoding="utf-8")

    by_sec = {}
    for d in docs:
        by_sec[d["section"]] = by_sec.get(d["section"], 0) + 1
    print(f"OK  {len(docs)} documents {by_sec} · {len(ordos)} ordonnances · {len(modeles)} modèles/conseils · "
          f"{len(figures)} figures · {OUT.stat().st_size // 1024} Ko")
    if warnings:
        print(f"\n{len(warnings)} avertissement(s) :")
        for w in warnings:
            print("  - " + w)
        if strict:
            sys.exit(1)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    main()
