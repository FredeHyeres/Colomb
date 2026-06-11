# Audit i18n — Colombophilie Frontend

Audit en lecture seule du dossier `frontend/` en vue d'une internationalisation FR/NL/EN. Aucun fichier source modifié.

## 1. Résumé global

| Fichier | Lignes | Chaînes ~estimées | Notes |
|---|---:|---:|---|
| index.html | 128 | ~25 | nav, topbar, modal |
| sport/index.html | 108 | ~20 | nav, topbar, modal |
| ai_widget.html | 617 | ~50 | toasts, labels snapshot |
| sport.html (legacy) | 1175 | ~140 | doublon partiel de sport/js/* |
| MANUEL_UTILISATION.html | 745 | — | exclu de l'audit détaillé |
| js/app.js | 314 | ~25 | titres pages, badges statut |
| js/calendrier.js | 224 | ~20 | mois, jours, légendes |
| js/dashboard.js | 191 | ~25 | stats, tableaux |
| js/concours.js | 989 | ~150 | formulaires, statuts, Benzing |
| js/couples.js | 632 | ~90 | modals nichées/couples |
| js/eleveur.js | 276 | ~30 | profil éleveur |
| js/lignees.js | 160 | ~20 | CRUD lignées |
| js/pedigree.js | 188 | ~10 | modal arbre |
| js/fiche-pdf.js | 451 | ~35 | PDF (accents partiels) |
| js/pedigree-pdf.js | 521 | ~25 | PDF (accents partiels) |
| js/pigeons.js | 1249 | ~180 | le plus gros module métier |
| sport/js/sport-app.js | 225 | ~15 | titres pages sport |
| sport/js/sport-api.js | 302 | ~15 | helpers partagés |
| sport/js/sport-dashboard.js | 417 | ~50 | dashboard sport |
| sport/js/sport-sessions.js | 533 | ~70 | séances |
| sport/js/sport-history.js | 250 | ~30 | historique pigeon |
| sport/js/sport-colony.js | 319 | ~35 | monitoring colonie |
| sport/js/sport-condition.js | 320 | ~40 | condition sportive |
| sport/js/sport-analytics.js | 451 | ~30 | analytics |
| sport/js/sport-ai.js | 490 | ~60 | recommandations IA |
| sport/js/sport-nutrition.js | 2190 | ~220 | le plus gros fichier global |

**Total estimé : ~1 400 chaînes uniques** (avant déduplication ~1 700, après dédup des labels/badges/empty-states répétés ~1 400).

---

## 2. Détail par fichier (échantillon représentatif)

> Les tableaux ci-dessous ne listent pas chaque chaîne individuellement (volume trop important) mais regroupent par **bloc fonctionnel**, avec exemples représentatifs. La clé proposée suit la convention décrite en section 3.

### frontend/index.html
| Texte original (FR) | Clé i18n proposée | Type |
|---|---|---|
| Colomb - Gestion d'élevage | `app.title` | attribut (title) |
| Tableau de bord / Pigeons / Lignées / Performances / Santé / Couples / Mon Élevage / Calendrier / Concours / Sport & IA | `nav.dashboard`, `nav.pigeons`, `nav.lignees`, `nav.performances`, `nav.sante`, `nav.couples`, `nav.eleveur`, `nav.calendrier`, `nav.concours`, `nav.sport` | élément texte |
| Aide | `nav.aide` | élément texte |
| Rechercher un pigeon... | `search.placeholder.pigeon` | attribut placeholder |
| + Ajouter | `common.add` | élément texte |
| Navigation principale / Menu / Basculer le thème / Fermer | `a11y.nav`, `a11y.menu`, `a11y.theme`, `a11y.close` | attribut aria-label |
| Titre | `modal.title.default` | élément texte (placeholder) |

### frontend/sport/index.html
| Texte original (FR) | Clé i18n proposée | Type |
|---|---|---|
| Colomb Sport | `sport.app.title` | élément texte |
| ← Retour Élevage | `sport.nav.back` | élément texte |
| Général / Nutrition / Intelligence | `sport.nav.section.general/nutrition/ia` | élément texte |
| Dashboard / Séances / Historique pigeon / Nutrition / Analytics / Recommandations IA / Condition sportive / Monitoring colonie | `sport.nav.dashboard`...`sport.nav.colony` | élément texte |
| Dashboard Sport | `sport.page.title.default` | élément texte (JS dynamic) |
| Rechercher... | `sport.search.placeholder` | attribut placeholder |
| Mode sombre / clair | `a11y.theme.title` | attribut title |

---

## 3. Conventions de nommage proposées

- Format **`namespace.section.element[.variant]`**, snake/kebab interdits → camelCase ou points uniquement.
- Namespaces racines : `common` (boutons génériques : Annuler/Fermer/Enregistrer/Supprimer), `nav`, `sport.nav`, `modal`, `toast`, `empty`, `status` (badges statut pigeon/concours/engagement/séance), `gender` (`gender.male`/`gender.female`), `pdf.*` (par doc : `pdf.fiche`, `pdf.pedigree`, `pdf.engagement`, `pdf.plan`).
- Pages métier : `page.<module>.<element>` (ex: `page.pigeons.table.matricule`, `page.concours.modal.title.create`).
- Modules sport : `sport.<module>.<element>` (ex: `sport.nutrition.tab.mixes`, `sport.ai.empty.noActive`).
- Messages dynamiques avec pluriel : clé unique + interpolation ICU `{count, plural, one {...} other {...}}` au lieu des ternaires `${n>1?'s':''}`.
- Badges/labels dupliqués (statut pigeon, statut concours, type séance, recommandation IA, sexe) → **une seule clé partagée** par concept, référencée partout (ex: `status.pigeon.actif`, `status.pigeon.reproducteur`, etc.), au lieu des maps locales (badgeStatut, recMap ×2, usageLabels ×3, SESSION_TYPE_LABELS/sessionTypeBadge).
- Emojis conservés hors chaîne traduisible (préfixe/suffixe dans le template, pas dans la valeur traduite).

---

## 4. Points d'attention

1. **PDF jsPDF (fiche-pdf.js, pedigree-pdf.js)** : accents supprimés de façon incohérente ("Annee", "Lignee", "Sante", "Pere/Mere", "eme" sans accent vs `badgeClassement()` dans pigeons.js qui garde "ème"). Police helvetica ne supporte pas bien les caractères NL (ï, é, etc.) → prévoir police custom embarquée (ex: Roboto/Noto) ou table de translittération pour FR/NL.
2. **PDF via `document.write()`** (concours.js `imprimerFeuilleEngagement`, sport-nutrition.js `_planExporterPDF`) : HTML/CSS standard, accents OK, mais texte généré en JS template strings — nécessite extraction i18n complète du HTML imprimé.
3. **Doublons de labels** à fusionner : `badgeStatut` (app.js) vs statuts répétés dans pigeons.js/concours.js ; `recMap` (sport-dashboard.js et sport-ai.js, structures différentes) ; `usageLabels` répété 3× dans sport-nutrition.js ; `sessionTypeBadge` (sport-api.js) vs `SESSION_TYPE_LABELS` (calendrier.js, emojis différents).
4. **Pluriels** : dizaines de ternaires `${n>1?'s':''}` (pigeon(s), séance(s), affectation(s), nichée(s), événement(s)...) → migrer vers ICU MessageFormat plural.
5. **Incohérences de forme** : "Chargement..." vs "Chargement…" ; "— Choisir X —" vs "Choisir un pigeon..." vs "-- Sélectionner --" ; ponctuation finale variable sur les empty-states ("Aucun X." vs "Aucun X").
6. **`frontend/sport.html` (legacy, port 8001, 1175 lignes)** duplique en grande partie `sport/index.html` + `sport/js/*` — décider si à traduire aussi ou à supprimer avant i18n (éviter double effort).
7. **Textes concaténés dynamiques** (concours.js Benzing, sport-nutrition.js confirmations d'affectation, sport-ai.js outcome) mêlent HTML, variables et texte FR dans des template strings longues → nécessitent découpage en sous-clés avec interpolation.
8. **`_showPigeonBlockedDialog()`** (pigeons.js) : dialogue custom hors système modal/notification standard — à harmoniser et i18n séparément.
9. **`ai_widget.html`** utilise le port 8000 (module IA séparé) — vérifier si dans le périmètre de traduction.
10. **`toLocaleDateString('fr-FR', ...)`** codé en dur dans calendrier.js, sport-api.js (formatDate*), sport-nutrition.js, sport-condition.js, etc. → doit devenir dépendant de la langue active (fr-FR/nl-NL/en-US).
