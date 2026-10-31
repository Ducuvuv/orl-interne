# ORL Interne

Application de poche pour l'**interne de chirurgie ORL** : fiches par item (clinique, paraclinique, prise en charge avec posologies exactes, surveillance, quand reconsulter), **ordonnances types prêtes à copier** (esprit Ordotype), **consignes post-opératoires**, **réflexes de garde**, **textes types** (observation, CRO, courriers), **outils & scores**, **atlas d'imagerie légendé**.

- Base : Collège Français d'ORL et CCF, 5e éd. 2022.
- Toujours mis à jour avec **les recommandations les plus récentes** (HAS / SPILF / GPIP 2024-2025, SFORL, ANSM, SFE, INCa…) ; les écarts avec le Collège sont signalés `(MAJ …)`.
- Images : **uniquement libres de droits** (Wikimedia Commons : CC0, domaine public, CC BY, CC BY-SA — crédit sous chaque image) + schémas originaux. Le build refuse toute image non libre.
- Ordonnances : format d'ordonnance réelle (une entrée par médicament) ; chez l'enfant, **saisir le poids** remplit automatiquement les volumes (lignes `dose:` + champs `{mL}`/`{mg}`), avec plafonds de sécurité.

> Aide-mémoire personnel. Ne remplace ni le jugement clinique, ni l'avis du senior, ni les protocoles du service.

## Utiliser

- **En ligne / téléphone** : ouvrir la page publiée, puis « Ajouter à l'écran d'accueil » → fonctionne **hors-ligne** (Réglages → *Tout télécharger pour le hors-ligne*).
- **En local** : `python -m http.server 8765` puis http://localhost:8765 (ou ouvrir `index.html` directement).
- Recherche : `/` au clavier. Ordonnances : **Copier** (pour le logiciel de prescription) ou **Imprimer** (en-tête prescripteur à remplir dans Réglages).

## Structure

```
content/
  fiches/    pathologies (1 fichier .md par fiche)
  postop/    chirurgies : suites, complications, consignes, ordonnances de sortie
  urgences/  protocoles de garde « 1 écran »
  textes/    observation, CRO, courriers types
  outils/    audiométrie, scores, TNM, classifications, calculateurs
img/         images (+ fichier .json de crédits à côté de chaque image)
tools/
  build.py      compile content/ → data/content.js (et vérifie liens, images, sections, ordonnances)
  commons.py    recherche / téléchargement d'images libres sur Wikimedia Commons avec crédits
  fetchtext.py  lecture texte d'une page de recommandations (HAS…)
docs/
  STYLE.md   guide de rédaction (plan imposé, syntaxe des ordonnances, règles de sources)
  PLAN.md    registre des documents
assets/      app.js, app.css, icônes
```

## Modifier / ajouter une fiche

1. Écrire `content/<section>/<id>.md` en suivant `docs/STYLE.md` (blocs `:::ordo`, `:::conseil`, `:::figure`, `:::alerte`…).
2. `pip install markdown pyyaml` (une fois), puis `python tools/build.py` → doit afficher **0 avertissement**, et `python tools/lint.py` (contrôles de sécurité des ordonnances).
3. Commit + push : la page publiée se met à jour.

Le PDF du Collège, son texte extrait et ses figures restent dans `sources/` (exclu de Git : œuvre protégée). Version partagée (Artifact) : `python tools/build_artifact.py`.
