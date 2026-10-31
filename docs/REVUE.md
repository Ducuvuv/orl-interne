# Journal de relecture (points à vérifier / corriger)

Signalés par les rédacteurs — à traiter lors de la relecture croisée.

## Spécialités / formes galéniques
- **Vitamine A Dulcis** pommade ophtalmique : **non commercialisée** → remplacer par un gel/une pommade ophtalmique lubrifiant(e) disponible (carbomère, etc.) partout où elle apparaît (paralysie faciale, parotidectomie…).
- **Un-Alfa 0,25 / 1 µg capsules** : absentes de la BDPM ; disponibles : alfacalcidol 0,25 / 1 µg (génériques), Un-Alfa 0,50 µg.
- **Amoxicilline/acide clavulanique 1 g/125 mg** : existe en **sachet-dose**, pas en comprimé (`phlegmon-periamygdalien.md`). Adulte comprimé = 500 mg/62,5 mg.

## Conflits de sources signalés (laisser les deux en le disant, ou trancher avec la source la plus récente)
- Gluconate de calcium IV : PNDS hypoparathyroïdie 2025 (2 ampoules en 10 min) vs RCP (≤ 50 mg/min).
- Clindamycine : SFORL/SPILF 2024 900 mg × 3 si > 70 kg vs RCP oral max 2,4 g/j.

## Non vérifiés en ligne (budget épuisé)
- PTH peropératoire : critère de Miami (baisse > 50 % à 10 min).
- Seuils AFCE 2023 (PTH > 10 pg/mL ; calcium 0,5-1 g/j si PTH > 10 et calcémie ≤ 1,90) : résumés secondaires.

## Rendu
- Listes directement après une ligne de texte : corrigé globalement dans `tools/build.py` (`fix_lists`).

## Cancérologie (rapport rédacteur)
- À confirmer : AMM UE pembrolizumab périopératoire (KEYNOTE-689, 29/10/2025) ; toripalimab AMM UE 09/2024 (cavum) ; TNM 9e éd. AJCC/UICC cavum (2025) ; décret du 24/09/2026 modifiant le tableau RG 47 (partie A) ; vaccination HPV rattrapage jusqu'à 26 ans (HAS 2025).
- Non vérifiés : fibrome nasopharyngien (imagerie/embolisation), papillome inversé, lymphome T/NK ; délai MP 2 ans ; cerfa 11138 ; uracilémie avant 5-FU (obligatoire — à confirmer) ; thiamine 250 mg/j en relais (extrapolé).
- Fluogel : 5 min/j (RCP) vs 15 min (Collège) — trancher.
- Schéma `tumeurs-nasosinusiennes-schema-ethmoide.png` : légendes en anglais → remplacer par une figure du Collège si disponible.

## Contrainte
- Quota de recherche web partagé épuisé chez certains rédacteurs : la relecture doit s'appuyer sur WebFetch / `tools/fetchtext.py` (pages officielles HAS, BDPM, SFORL…).

## Infections cervicales / phlegmon (rapport rédacteur — RPC SFORL/SPILF 2024)
- Doses amox-clav SFORL 2024 : adulte 100 mg/kg/j (IV > max RCP 6 g/j — signalé), enfant 150 mg/kg/j IV : vérifier sur le texte de la RPC.
- Forme « amox-clav 1 g/125 mg » = sachet-dose (pas comprimé) ; schéma « amox-clav + amoxicilline 1 g » non cité par la RPC (marqué à valider).
- Repère de ponction du phlegmon : décrit d'après MSD Manual — vérifier avec le Collège (fig. 11.5) et le geste classique (jonction pilier antérieur / voile, au-dessus du pôle supérieur de l'amygdale).
- Paracétamol IV enfant : vérifier RCP (< 10 kg : 7,5 mg/kg ; ≥ 10 kg : 15 mg/kg, max 60 mg/kg/j).
- Lemierre : durée 3-6 semaines selon sources ; anticoagulation controversée.
- Ludwig : la RPC 2024 exclut l'origine dentaire de son champ — vérifier la formulation.
- Pas de relecture visuelle du rendu par ce rédacteur.

## Otologie A (rapport rédacteur)
- **Cohérence** : `adenoidectomie-aerateurs` (postop) doit suivre la reco **SFORL 2025 OSM de l'enfant** (ATT ≥ 30 dB meilleure oreille, max 3 ans, baignade non interdite systématiquement, pas d'ATT < 3 ans pour OMA récidivantes sans OSM intercurrente) — même chose dans `otite-seromuqueuse`.
- Ciloxan auriculaire non commercialisé ; Ciloxadex (cipro + dexa) AMM OEA ≥ 1 an, otorrhée sur ATT ≥ 6 mois ; ofloxacine auriculaire hors AMM dans l'OEA → harmoniser toutes les fiches (otite-externe, OSM, ATT, chirurgie-otologique).
- OMA adulte HAS : amoxicilline 1 g × 3/j 5 j — vérifier sur la fiche HAS.
- Non sourcés : antibioprophylaxie othématome ; morsure enfant 50 mg/kg/j ; mastoïdite adulte (doses RCP) ; OE nécrosante (ceftazidime/cipro ≥ 6 sem) ; tétanos (calendrier vaccinal non consulté) ; délais pratiques (mèche, bourdonnets, perforation).

## Glandes salivaires / thyroïde / algies (rapport rédacteur)
- Spécialité `transversal` : nouveau dossier img/transversal/ (ok).
- À confirmer : ATA 2025 (lobectomie ≤ 2 cm cN0, surveillance active cT1aN0M0) ; Bethesda 2023 (risques depuis synthèse secondaire) ; cibles TSH (ATA 2015 utilisées) ; Horton PNDS 2024 (prednisone 40-80 mg, max 80 per os ; bolus MP ≤ 500 mg/j) ; vérapamil AMM AVF 2022 ; O2 12-15 L/min 15-20 min.
- Non sourcés : sialadénite aiguë (pas de reco : amox-clav 1re intention, 10 j) ; éviction oreillons 15 j (HCSP à vérifier) ; paliers carbamazépine +200 mg/3 j (indicatif) ; oxcarbazépine (synthèse secondaire).

## Trachéo / laryngectomie / évidement / endoscopie / lambeaux (rapport rédacteur)
- Sources principales : RFE SRLF-SFAR 2018, AFSOS 2023, ONCO AURA 2024, NTSP.
- Variabilités signalées « à adapter » : 1er changement de canule (J3 AFSOS vs prudence < 48-72 h NTSP), pression ballonnet (20-25 / ≤ 30 cmH2O), aspiration ≤ 150 mmHg, décanulation, reprise orale post-laryngectomie, drains, octréotide (hors AMM), rythme de surveillance des lambeaux, repos vocal post-MLS.
- Non vérifiés : fistule trachéo-artérielle J3-6 sem ; valve phonatoire retirée la nuit ; seuils TRC / aiguille 25 G ; LPPR filtres ECH ; antibioprophylaxie SFAR 2024 ORL (non trouvée → « selon protocole »).
- Images avec légendes en anglais : tracheotomie-position-canule.jpg, cervicotomie-evidement-niveaux.png → préférer la figure Collège 16.2 (topographie ganglionnaire) si plus lisible.

## Otologie B — surdités, acouphènes, rocher (rapport rédacteur)
- Surdité brusque : prednisolone 1 mg/kg/j (max 60 mg) 10-14 j (AAO-HNS 2019) vs 6-8 j Collège ; pas d'antiviraux, pas de vasodilatateurs ; pas de RPC SFORL dédiée trouvée → **cohérence à vérifier avec `corticoides-orl` et `urg-surdite-brusque`**.
- À confirmer : RBP HAS acouphènes juin 2026 ; HAS dépistage néonatal 2025 ; ECCI 2024 CMV (surdité isolée traitée, grade C) ; VPC21 adulte (HAS 07/2026) ; volumes vaccins 0,5 mL.
- Non vérifiés : pas d'antibioprophylaxie si brèche (Collège seul) ; ENoG ≥ 90 % ; corticoïdes intratympaniques (selon protocole) ; valganciclovir 16 mg/kg × 2/j (hors AMM, source CHU Lyon) ; seuils Code du travail 80/85/87 dB(A).

## Post-op ORL A — amygdale, ATT, nez, oreille, implant (rapport rédacteur)
- Sources lues en entier : SFORL amygdalectomie enfant (2020), antalgie post-amygdalectomie (2014), OSM 2025, aérateurs 2008, chirurgie endonasale 2001, polypose 2023, perforations tympaniques 2019, IC 2018/2020 ; HAS alternatives à la codéine 2016.
- Ibuprofène 20 mg/mL : graduation-kg = 10 mg/kg (3 prises) ou 7,5 mg/kg (Advilmed, 4 prises) selon la marque → toujours écrire mg/kg + mL.
- Vaccination pneumococcique (avis HAS 30/07/2026) : adulte VPC21 de préférence (VPC20 alternative) ; enfant VPC20 → **harmoniser avec fracture-rocher et implant-cochleaire**.
- Tramadol enfant : AMM ≥ 3 ans ; après amygdalectomie = mise en garde RCP ; SFORL : enfants à risque hémorragique sans SAHOS, 1re prise à l'hôpital ; ordonnance sécurisée depuis 03/2025.
- Non vérifiés : plongée après stapédotomie ; délais avion/efforts stapédotomie (par analogie) ; cophose ≈ 1 % ; acide tranexamique enfant 10-15 mg/kg (protocoles) vs RCP ≈ 20 mg/kg/j ; IRM/implant (générique) ; ibuprofène 5 j systématique post-amygdalectomie ; ablation ATT à ~2 ans (pratique).

## Rhinologie (rapport rédacteur) — vérifié par moi sur HAS (MAJ 13/05/2025)
- ✔ Sinusite adulte : amoxicilline 3 g/j en 3 prises 7 j ; échec ou dentaire : amox-clav 3 g/j 7 j ; allergie : cefpodoxime 400 mg/j ou céfuroxime-axétil 500 mg/j (2 prises) 5 j ; CI β-lactamines : pristinamycine 2 g/j 4 j ; frontale/ethmoïdale/sphénoïdale : amox-clav 3 g/j 7 j, CI β-lactamines : lévofloxacine 500 mg/j ou moxifloxacine 400 mg/j 5 j.
- ✔ OMA adulte : amoxicilline 3 g/j en 3 prises 5 j ; allergie : céfuroxime-axétil 500 mg/j ou cefpodoxime 400 mg/j 5 j ; CI β-lactamines : cotrimoxazole (SMX 800 / TMP 160 mg) × 2/j 5 j ou pristinamycine 2 g/j en 2 prises 5 j.
- À vérifier : ethmoïdite (GPIP 2023-2024 : amox-clav 150 mg/kg/j IV ; céfotaxime 200 mg/kg/j + métronidazole 40 mg/kg/j) ; classification Chandler vs Hubert ; omalizumab remboursement ; dupilumab conditions ; cotrimoxazole suspension 200/40 mg par 5 mL ; corticoïdes fracture du nez (Collège seul) ; prophylaxie sous méchage (dose choisie).

## Vertiges / PF (rapport rédacteur)
- À confirmer : GRACE-3 2023 ; VPPB HAS 2017 (pas de restriction posturale) ; névrite Bárány 2022 ; BEMED négatif ; diurétiques hors AMM (Menière) ; PF SFORL 2020 (ENMG J9-J20) ; enfant Babl 2022 ; Lyme : pas de corticoïdes (DGN 2025) ; Vitamine A Dulcis arrêtée (ANSM 02/2026) → « Vitamine A Blache 15 000 UI/g » à vérifier ; Vogalène 5 j max (RCP 03/2026).
- Non vérifiés : AAO-HNS 2020 Menière (forces de reco) ; seuils audiométriques Bárány ; Strupp 2004 (décroissance) ; doses Lyme SPILF 2019 (source secondaire).
- Photos PF : côté indiqué « sur l'image » (miroir possible).

## Textes types (rapport rédacteur — quasi rien vérifié en ligne, quota épuisé)
- À vérifier : art. R. 1112-1-2 CSP (lettre de liaison) ; formulaire sécurisé d'arrêt de travail (07/2025) ; SFAR 2012 (bilan préop enfant/ECG) ; D. 6322-30 (15 j esthétique) ; check-list HAS 2018 ; HAS 2011 (certificat) ; arrêté 26/01/2007 (traçabilité DMI).
- Éponymes/instruments à recouper : Lubet-Barbon, Walsham, Asch, Moure, Beckmann, Boyce-Jackson ; règle 24-12-6 mm ethmoïdales ; INMSG < 100 µV ; EU-TIRADS seuils (> 20/15/10 mm — à aligner avec outils/thyroide-classifications).
- Paramètres d'imagerie = « usuels, à valider avec l'imagerie du CHU ».

## Larynx / VAS (rapport rédacteur)
- À confirmer : laryngite enfant (fiche AFOP/GFRUP 2025 : dexaméthasone 0,15 mg/kg PO dose unique ; bétaméthasone 10 gouttes/kg/j 3 j ; adrénaline nébulisée 0,1 mg/kg max 1 mg) ; PPC (LPPR, avis HAS/CNEDiMTS 03/2026 : 112 h/28 j) ; pile bouton (reco STC labellisée HAS 2022 ; miel/sucralfate ESPGHAN = divergence) ; ESGE 2016 ; AOH PNDS CREAK 2024 (icatibant 30 mg SC ; C1-INH 20 UI/kg ; Ruconest arrêté 05/2022) ; anaphylaxie SFMU 2016 (adrénaline IM 0,01 mg/kg max 0,5 mg).
- Non vérifiés : arrêté permis 28/03/2022 (TME, groupe lourd) ; stimulation XII (critères France) ; OAM HAS 2014 ; ERC 2025 (désobstruction) ; épiglottite adulte (durée 7-10 j, corticoïdes) ; IDDSI en français ; dexaméthasone PO enfant (pas de forme pédiatrique).

## Outils (rapport rédacteur)
- **TNM : outils/tnm-vads.md = UICC 9e éd. (appliquée depuis 01/2026), différences TNM8 signalées** → fiches cancers-vads / cancer-cavum doivent renvoyer à [[tnm-vads]] sans contredire (préciser « TNM UICC 9 ; comptes rendus parfois encore en TNM8 »).
- Thyroïde : EU-TIRADS 2017 + ETA 2023 + SFE 2022 (EU-TIRADS 5 ≤ 10 mm : pas de cytoponction systématique) ; Bethesda 2023 ; TNM9 thyroïde = TNM8 + 2 ajouts.
- Non vérifiés : BIAP (sources secondaires, formule asymétrique omise) ; stades des poches de rétraction (remplacés par critères Collège) ; TNM9 oropharynx HPV+ cN2 (reconstitué) ; atténuation interaurale ≈ 40 dB ; Fukuda 45° vs 60° (Collège) ; Epworth paraphrasé.
- Widgets à insérer dans scores-classifications : score-mcisaac, score-epworth, score-stopbang.

## Passe 2 — cohérence à reporter dans les outils
- `outils/corticoides-orl` : surdité brusque = prednisolone 1 mg/kg/j (max 60 mg) 10 j (AAO-HNS 2019 : 7-14 j ; Rev Prat 2026 : 10-14 j ; Collège 6-8 j) ; HODOKORT 2024 (fortes doses non supérieures).
- Vaccin pneumococcique (HAS 30/07/2026, MAJ 07/08/2026) : adulte VPC21 (Capvaxive, solution injectable 0,5 mL) dose unique ; enfant VPC20 (2-4-6 mois + 11 mois ; 15 mois-5 ans : 1 dose ; 5-18 ans : 1 dose ≥ 8 sem après tout vaccin pneumococcique).
- TNM : cancers-vads et cancer-cavum alignés sur UICC 9.
- `urgences/urg-epistaxis.md` : aligner sur la fiche épistaxis passe 2 — tamponnement non résorbable 48-72 h (SFORL 2016) ; double ballonnet 48-72 h avec dégonflage progressif dès 24-48 h ; retirer « Xylocaïne jamais plus de 30 min » (absent du RCP) ; Aturgyl non commercialisé → Pernazene 0,05 %.
- Bactrim suspension : nouvelle présentation 40 mg/mL + 8 mg/mL (même concentration).
- Omalizumab : non remboursé dans la polypose (avis HAS 05/2024).
