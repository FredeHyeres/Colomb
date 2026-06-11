# ??? Colombophilie App — Contexte Projet pour Claude AI

> **Usage** : Coller ce fichier en début de chaque nouveau chat Claude AI (Projet) ou dans les instructions système Claude Code.  
> **Objectif** : Donner à Claude le contexte complet pour produire du code cohérent sans répéter l'historique.

---

## ??? Stack technique

| Composant   | Technologie            |
|-------------|------------------------|
| Backend     | FastAPI (Python)       |
| Base de données | PostgreSQL 16      |
| Conteneurs  | Docker + Docker Compose|
| Frontend    | HTML / CSS / JS vanilla|
| PDF         | Génération côté client |
| Repo GitHub | https://github.com/FredeHyeres/Colomb |
| Local       | `C:\Users\frede\Documents\Colombophilie` |

---

## ?? Lancer le projet

```powershell
cd C:\Users\frede\Documents\Colombophilie
docker compose up -d
```

| Service    | URL                          | Credentials              |
|------------|------------------------------|--------------------------|
| Frontend   | http://localhost:8080        | —                        |
| API Swagger| http://localhost:8001/docs   | —                        |
| pgAdmin    | http://localhost:5052        | admin@colombo.fr / admin2024 |

**Ports** (cohabitation projet Mouches) : PostgreSQL `5434` · FastAPI `8001` · pgAdmin `5052` · Nginx `8080`

---

## ?? Structure projet

```
Colombophilie/
+-- docker-compose.yml
+-- .env                        # ?? ne jamais committer
+-- backend/
¦   +-- main.py
¦   +-- database.py
¦   +-- seed.py / reset_db.py
¦   +-- models/                 # pigeon, lignee, couple, nichee, performance, sante, eleveur
¦   +-- schemas/                # même liste
¦   +-- routers/                # pigeons, lignees, couples, performances, sante, eleveur
+-- frontend/
    +-- index.html / style.css
    +-- js/
        +-- app.js              # routeur + utilitaires
        +-- dashboard.js
        +-- pigeons.js          # + performances + santé intégrées
        +-- lignees.js / couples.js / eleveur.js
        +-- pedigree.js         # arbre généalogique visuel (5 générations)
        +-- pedigree-pdf.js     # export PDF A4 paysage
        +-- fiche-pdf.js        # impression fiche A5
```

---

## ? Modules existants et fonctionnels

- **Pigeons** : filtres, tri, couleurs lignées, fiche complète, upload photo, validation sexes parents
- **Lignées** : couleurs propagées dans toute l'interface
- **Couples & Reproduction** : actifs + historique, nichées ponte?éclosion, création jeune depuis nichée
- **Performances** : badges or/argent/bronze
- **Santé** : badges par type (vaccination / traitement / visite / observation)
- **Arbre généalogique** : horizontal, jusqu'à 5 générations dynamiques
- **Export PDF Pedigree** (A4 paysage) : photo, parents, performances, vaccins, en-tête éleveur
- **Impression fiche pigeon** (A5) : deux colonnes identité + performances/santé
- **Mon Élevage** : infos éleveur, photo colombier, carte de visite, intégrée dans en-têtes PDF

---

## ?? Règles métier critiques

### Santé dans les PDFs
| Type              | PDFs |
|-------------------|------|
| Vaccination       | ? Toutes |
| Visite vétérinaire| ? Dernière uniquement |
| Traitement        | ? Jamais |
| Observation       | ? Jamais |

### Pedigree
- Père = forcément **mâle** (validé backend)
- Mère = forcément **femelle** (validé backend)

### ENUMs PostgreSQL (sans accents — critique !)
```
Sexe   : "male" | "femelle"
Statut : "actif" | "reproducteur" | "concours" | "retraite" | "perdu" | "decede"
Santé  : "vaccination" | "traitement" | "visite_veterinaire" | "observation"
```

---

## ?? MODULE EN COURS — Sport & Entraînements (XAI)

> **Priorité absolue** : construire ce module de zéro de façon cohérente avec l'existant.

### Vision fonctionnelle

Ce module permet de **suivre les entraînements**, **analyser les performances sportives** et fournir des **recommandations expliquées** (Explainable AI) sur l'orientation des pigeons (concours, reproduction, retraite).

### Entités à créer

#### `Entrainement`
```
id, pigeon_id, date, distance_km, duree_minutes,
vitesse_mpm (m/min), conditions_meteo, vent_kmh,
direction_vent, observations, created_at
```

#### `Analyse` (calculée, stockée pour historique)
```
id, pigeon_id, date_analyse,
score_forme (0-100), score_endurance (0-100), score_vitesse (0-100),
score_global (0-100), tendance ("progression"|"stable"|"declin"),
recommendation ("concours"|"repos"|"entrainement_leger"|"reforme"),
facteurs_explicatifs (JSON),   ? cœur XAI
created_at
```

### Règles de calcul XAI (Explainable AI)

L'IA doit être **totalement transparente** : chaque recommandation affiche les facteurs qui l'ont générée.

#### Score de forme (30 derniers jours)
```python
# Basé sur les 5 derniers entraînements
# Facteurs pondérés :
vitesse_relative    = vitesse / moyenne_lignee          # 40%
regularite          = 1 - (écart_type_vitesses / moy)  # 30%
progression         = pente_régression_vitesses          # 20%
ratio_completions   = entrainements_termines / total    # 10%
```

#### Score d'endurance
```python
# Ratio distance effectuée vs distances progressives
# Bonus si distances croissantes sur 4 semaines
# Pénalité si repos > 10 jours
```

#### Recommandation et explication
```json
{
  "recommendation": "concours",
  "confiance": 0.82,
  "facteurs": [
    {"nom": "Vitesse", "valeur": 1456, "vs_moyenne": "+8%", "impact": "positif", "poids": 0.4},
    {"nom": "Régularité", "valeur": 0.91, "seuil": 0.85, "impact": "positif", "poids": 0.3},
    {"nom": "Progression", "valeur": "+5% / mois", "impact": "positif", "poids": 0.2},
    {"nom": "Repos récent", "valeur": "3 jours", "impact": "neutre", "poids": 0.1}
  ],
  "contre_indications": [],
  "historique_sante": "Aucun traitement récent"
}
```

### UI à créer (cohérente avec le style existant)

1. **Liste entraînements** par pigeon (dans la fiche pigeon, nouvel onglet)
2. **Formulaire saisie entraînement** (même style que santé/performances)
3. **Dashboard Sport** : vue globale de l'écurie
   - Top 5 pigeons en forme
   - Pigeons à reposer / en déclin
   - Graphique progression moyenne de l'écurie
4. **Fiche analyse XAI** par pigeon :
   - Jauges visuelles (scores)
   - Panneau "Pourquoi cette recommandation ?" avec les facteurs
   - Badge recommandation coloré (vert=concours, orange=repos, rouge=réforme)
5. **Intégration PDF** : ajouter un bloc "Performances Sport" dans la fiche pigeon existante

### Fichiers à créer

```
backend/
  models/entrainement.py
  models/analyse_sport.py
  schemas/entrainement.py
  schemas/analyse_sport.py
  routers/entrainements.py
  routers/analyses_sport.py
  services/xai_engine.py     ? logique de calcul et explication

frontend/js/
  sport.js                   ? liste + formulaire entraînements
  sport-dashboard.js         ? vue globale écurie
  sport-analyse.js           ? fiche XAI par pigeon
```

### Endpoints API à créer

```
POST   /api/entrainements/               ? créer un entraînement
GET    /api/entrainements/?pigeon_id=X  ? liste par pigeon
DELETE /api/entrainements/{id}          ? supprimer

POST   /api/analyses/pigeon/{id}        ? déclencher une analyse XAI
GET    /api/analyses/pigeon/{id}        ? historique analyses
GET    /api/analyses/ecurie/            ? vue globale (top pigeons)
```

---

## ?? Commandes utiles

```powershell
# Logs en temps réel
docker logs colombo_backend -f

# Relancer après modif backend
docker compose restart backend

# Rebuild complet
docker compose up --build -d

# Données de test
docker exec colombo_backend python seed.py

# Vider la base (garder structure)
docker exec colombo_backend python reset_db.py
```

---

## ??? Roadmap globale

| Priorité | Module | Statut |
|----------|--------|--------|
| P0 | Module Sport + XAI V3 | ✅ Terminé |
| P1 | Recherche globale par matricule | ⬜ À faire |
| P1 | Dashboard graphiques réels | ⬜ À faire |
| P2 | Responsive mobile | ⬜ À faire |
| P2 | Backup automatique PostgreSQL | ⬜ À faire |
| P3 | Authentification utilisateurs | ⬜ À faire |
| P3 | Déploiement VPS | ⬜ À faire |
| P3 | Rappels vaccinations email | ⬜ À faire |

---

## ?? Instructions pour Claude

1. **Toujours** respecter le style JS vanilla existant (pas de framework JS)
2. **Toujours** valider les ENUMs PostgreSQL sans accents
3. **Ne jamais** exposer de clé API ou secret dans le code
4. Pour le module XAI : **chaque recommandation doit afficher ses facteurs explicatifs** — c'est non-négociable UX
5. Les nouveaux modèles SQLAlchemy suivent le même pattern que `backend/models/pigeon.py`
6. Les nouveaux routers FastAPI suivent le même pattern que `backend/routers/pigeons.py`
7. Tester via `http://localhost:8001/docs` (Swagger) après chaque création d'endpoint



## Session 27 mai 2026 — V3 IA finalisée

### Statut
- V3 complète · toutes les prochaines étapes de la session précédente soldées
- `main` = dev actif · prêt pour roadmap P1

### Formulaire outcome feedback (`sport-ai.js` + `sport-dashboard.js`)
- 2 nouvelles méthodes dans `sport-api.js` :
  - `resolveRecommendationWithOutcome(recId, body)` → `PATCH /recommendations/{id}/resolve`
  - `submitConcoursFeedback(body)` → `POST /feedback/concours`
- `renderRecommendations()` : 4e paramètre `snapId`, deux boutons côte à côte (✅ Résoudre + 📝 Outcome)
- `openOutcomeModal(recId, pigeonId, snapId)` : modale complète 3 blocs
  - Bloc 1 : outcome + outcome_date + outcome_notes
  - Bloc 2 : résultat réel concours (distance_km, classement, nb_partants)
  - Bloc 3 : share_anonymized opt-in
  - Double appel API : PATCH resolve + POST feedback conditionnel (indépendants)
- `loadPendingFeedbackWidget()` dans dashboard : carte "Pigeons en attente de feedback"
- CSS modale : animations `fadeIn` / `slideUp` dans `sport.css`

### `age_category` automatique
- `compute_age_category(annee_naissance)` ajoutée dans `xai_engine.py`
- Règle standard fédéral : `annee_naissance >= annee_courante` → `yearling`, sinon `adulte`
- Fallback `None` → `adulte` (sécurisé)
- `generate_ai_recommendation()` calcule `age_category` dynamiquement — plus de hardcode
- Router `ai_router.py` inchangé (ne passait pas `age_category` en paramètre)
- `seed.py` : 2 yearlings 2026 ajoutés (`P_G313` Vent'Neuf ♂, `P_G314` Aube ♀)

### ELEVEUR_RULES.md
- Créé dans `Docs/ELEVEUR_RULES.md` — source de vérité métier colombophile
- Contenu : catégories d'âge, scores 0–10, seuils XAI, logique de priorité des recos,
  adaptation yearling/adulte, spécificités PACA (THI), templates commentaires, glossaire
- Version : `rules_v1` — 2026-05-27

### Repos post-concours différencié
- `ELEVEUR_PROFILE["repos_post_concours_jours"]` : `10` → `{"yearling": 12, "adulte": 10}`
- Template `repos` : lit `_rest_days` via `.get(age_category, 10)`
- Message action dynamique : affiche `J+12` (yearling) ou `J+10` (adulte)
- Yearlings : note "Première saison — la récupération complète est prioritaire sur le calendrier." ajoutée

### Robustesse graphiques analytics
- `renderEmptyState(icon, title, subtitle)` ajoutée dans `sport-dashboard.js` et `sport-ai.js`
- `sport-dashboard.js` : try/catch sur chargement initial, 6 widgets robustifiés, `activeCount` inutilisé supprimé
- `sport-ai.js` : `renderSnapshot()`, `renderEventStore()`, catch `loadAIForPigeon()` — zones blanches éliminées

---

## Session 26 mai 2026 — V3 IA

### Versioning
- Branche `v2` créée et figée (élevage + sport + XAI expérimental)
- `main` = dev V3 actif

### XAI Engine (`backend/services/xai_engine.py`)
- Fenêtre de calcul étendue **7j → 30j** dans `generate_ai_recommendation()`
- `compute_forme_score()` : progression réelle = récupération 7j vs 8-30j (plus de hardcoded)
- `build_snapshot()` : `recovery_trend` calculé (était "stable" en dur)
- 3 nouvelles features dans le snapshot : `recovery_avg_30d`, `condition_avg_30d`, `hydration_avg_30d`
- Seuils ajustés : 75/55/35 → **70/50/30**

### Templates commentaires (`generate_comment()`)
- Nouvelle fonction dans `xai_engine.py` — pur Python, zéro LLM
- Calibrée sur le profil éleveur : demi-fond PACA, naturel (yearlings) + veuvage simplifié (adultes)
- Critère concours combiné : 3 séances + recovery ≥ 7 + progression visible
- Repos post-concours difficile : 10 jours minimum
- `ELEVEUR_PROFILE` = constante modifiable en haut du fichier
- Champs `title`, `message`, `action` alimentés sur `AIRecommendation` (déjà dans le modèle)

### Outcome + feedback collectif (`71b59c4`)
- 4 champs ajoutés sur `AIRecommendation` : `resolved_at`, `outcome`, `outcome_notes`, `outcome_date`
- Nouvelle table `concours_feedback` : lie snapshot + recommandation IA + résultat réel concours
- 3 endpoints : `POST /feedback/concours` · `GET /feedback/concours/pigeon/{id}` · `GET /feedback/export/anonymized`
- `AnonymizedSnapshot` : schéma épuré features numériques + outcome, sans PII, prêt pour modèle collectif
- `share_anonymized` : opt-in explicite par feedback
- Migration : `0008_add_outcome_and_feedback.py`

### Vision architecture collective (V4)
- App locale gratuite (Docker) + serveur central opt-in
- Chaque éleveur configure ses propres seuils (`ELEVEUR_PROFILE`)
- Snapshots anonymisés → agrégation → RandomForest commun → redescend en `.pkl`
- RGPD : données purement numériques, consentement explicite