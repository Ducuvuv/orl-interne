# Harmonisation finale — liste des incohérences à corriger

Signalées par les relecteurs (protocoles de garde, outils pharmaco). Pour chacune : lire les passages concernés, trancher avec la source primaire la plus récente (RCP BDPM `https://base-donnees-publique.medicaments.gouv.fr/medicament/<CIS>/extrait`, HAS, SFORL…), corriger TOUS les fichiers concernés (fiche + protocole de garde + outil) pour qu'ils disent la même chose.

## Vérifié par le coordinateur (appliquer tel quel)
- **Aciclovir IV, insuffisance rénale (RCP Zovirax IV, MAJ 10/06/2026)** — colonne « Infections à HSV ou VZV (sauf méningo-encéphalite) » chez l'adulte : 25-50 mL/min → 5 mg/kg toutes les 12 h ; 10-25 → 5 mg/kg toutes les 24 h ; < 10 → 2,5 mg/kg toutes les 24 h ; hémodialyse → 2,5 mg/kg/24 h après la séance. (La colonne 10 mg/kg concerne l'enfant immunodéprimé VZV et la méningo-encéphalite.) Dose normale zona adulte : 10 mg/kg toutes les 8 h, 8 à 10 jours. → `fiches/paralysie-faciale.md` est juste ; aligner `urgences/urg-paralysie-faciale.md` si différent.
- **Lyme, neuroborréliose (HAS 02/2025)** : doxycycline 4 mg/kg/j en 2 prises, max **200 mg par prise chez l'enfant** (y compris < 8 ans), max 400 mg/j chez l'adulte, 14 j (< 6 mois d'évolution) ; < 20 kg : ceftriaxone 75 mg/kg/j (max 2 g) ; < 6 ans et > 20 kg : « doxycycline diluable ». → déjà corrigé dans la fiche PF et l'outil antibiothérapie ; aligner `urg-paralysie-faciale.md`.

## À trancher et corriger
1. **Acide tranexamique** (amygdalectomie, urg-hemorragie-amygdalectomie, épistaxis, drainage) : RCP Exacyl — hémorragie par fibrinolyse **locale** (chirurgie ORL) : 0,5 à 1 g 2 à 3 fois/j ; fibrinolyse générale : 1 g toutes les 6-8 h. Utiliser la ligne adaptée à l'indication, partout pareil. Enfant : protocoles 10-15 mg/kg vs RCP ≈ 20 mg/kg/j → l'écrire clairement.
2. **Paralysie faciale** : critères d'hospitalisation du zona identiques partout (alerte vs note) ; prednisolone à 2 mg/kg/j → donner la dose maximale de la source ou retirer ce schéma s'il n'est pas sourcé.
3. **Dyspnée laryngée / anaphylaxie** :
   - auto-injecteur d'adrénaline enfant : dose selon le poids (RCP : 0,15 mg ou 0,3 mg selon les tranches du produit) — l'ordonnance doit être cohérente avec la note ;
   - § titré « (Collège) » contenant l'héliox (absent du Collège) et « renouvelé » vs « en continu » → corriger titre/contenu ;
   - « adrénaline nébulisée + corticoïde » présenté comme geste pour toute dyspnée → préciser les indications (pas dans l'épiglottite de l'enfant manipulée, pas pour la laryngite légère, anaphylaxie = adrénaline IM) ;
   - nasofibroscopie pendant une crise bradykinique : une seule position (PNDS CREAK 2024) dans fiche et urg-angioedeme.
4. **Laryngectomie totale** : algorithme NTSP « laryngectomie » dans le bon ordre (retrait de la canule seulement si échec du passage de la sonde), identique dans la fiche et urg-canule-tracheo.
5. **Trachéotomie** : un seul découpage temporel pour l'hémorragie (précoce / fistule trachéo-artérielle) et pour « récente / mature » (couvrir J7-J10) ; « jamais > 30 cmH2O » avec l'exception du surgonflage en cas de fistule trachéo-artérielle. Idem dans urg-canule-tracheo.
6. **Amox-clav IV enfant 150 mg/kg/j** : dose max selon la source de chaque indication (GPIP mastoïdite/ethmoïdite vs SFORL/SPILF 2024 cervical) — chaque fiche cite sa source, pas de contradiction affichée sans explication ; ordonnance ethmoïdite : utiliser la forme pédiatrique adaptée (500 mg/50 mg) pour ne pas dépasser la dose d'acide clavulanique ; clindamycine IV « après 6 ans » : vérifier (probablement une règle de la voie orale).
7. **AINS après chirurgie endonasale** : SFORL 2026 (Recommandations soins périopératoires en chirurgie endonasale de l'adulte, Q17 — https://www.sforl.org/wp-content/uploads/2026/06/RECO-SPOCEA-VERSION-FINALE-2026_06_14_4_sans-filigrane.pdf) autorise AINS ou néfopam en complément du paracétamol, sauf polypose / maladie de Widal ; antibioprophylaxie peropératoire si brèche, sans poursuite → mettre à jour `postop/chirurgie-endoscopique-sinus.md` et `postop/septoplastie-turbinoplastie.md` (texte, ordonnances, conseils patient, sous-titre) en cohérence avec `outils/antalgie-postop.md`.
8. **Tramadol / codéine** (ordonnance sécurisée) : dans toutes les ordonnances de tramadol (thyroidectomie, parotidectomie, submandibulectomie, drainage-abces-cervical, amygdalectomie, otites, rhino, outils…), écrire dosage, posologie et durée **en toutes lettres** (ex. « Tramadol cinquante milligrammes, gélule — une gélule toutes les six heures si douleur intense, quatre gélules par jour au maximum — pendant cinq jours ») et `note:` « Ordonnance sécurisée ».
9. **Anticoagulants et épistaxis** (`fiches/epistaxis.md`, `urgences/urg-epistaxis.md`) : remplacer les références HAS 2008 par les valeurs de `outils/anticoagulants-perioperatoire.md` (RFE 2024 réversion ; RFE GIHP/SFAR 2026 périopératoire) ou y renvoyer par un lien [[anticoagulants-perioperatoire]] sans dose contradictoire.
10. **Mineurs** :
    - IRM dans le VPPB atypique : même délai dans vertige-demarche et vppb ;
    - surdite-brusque, oreille unique : une seule formulation ;
    - otite-moyenne-aigue : dose maximale du relais oral de la mastoïdite ;
    - otite-externe : durée de l'ibuprofène identique texte/ordonnance ;
    - traumatismes-oreille : doxycycline chez l'enfant → condition d'âge (≥ 8 ans) ou alternative ;
    - Xylocaïne naphazolinée : « contre-indiquée avant 6 ans » (RCP) formulé pareil dans epistaxis et corps-etrangers ;
    - corps-etrangers : tranches d'âge identiques tableau/note ;
    - infections-cervicales-profondes : clindamycine orale de l'enfant, une seule dose maximale (RCP).
