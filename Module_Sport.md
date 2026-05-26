# 🏆 Colomb — Module SPORT & Nutrition

## Vision du module

Le module **SPORT** a pour objectif de transformer Colomb en véritable plateforme de gestion sportive colombophile moderne.

Contrairement aux logiciels classiques centrés uniquement sur :

* les bagues
* les pedigrees
* les concours

Colomb vise une approche complète intégrant :

* préparation sportive
* suivi d'entraînement
* récupération
* nutrition
* condition physique
* analytics avancés
* sélection des pigeons

Le module est conçu pour :

* les amateurs sérieux
* les colonies demi-fond/fond
* les systèmes naturels ou veuvage
* une architecture évolutive orientée data.

---

# ⚠️ Distinction métier importante

## PERFORMANCE

Le domaine PERFORMANCE concerne :

* les résultats officiels
* classements
* vitesses
* coefficients
* statistiques concours

## SPORT

Le domaine SPORT concerne :

* la préparation du pigeon
* les entraînements
* la récupération
* la nutrition
* la motivation
* la condition physique
* le suivi de forme

Cette séparation est volontaire afin de :

* garder une architecture claire
* faciliter les analytics futurs
* préparer l’intégration IA.

---

# 🧱 Architecture technique

## Stack actuelle

| Élément     | Technologie         |
| ----------- | ------------------- |
| API         | FastAPI 0.111       |
| ORM         | SQLAlchemy 2 async  |
| DB          | PostgreSQL          |
| Driver      | asyncpg             |
| Validation  | Pydantic v2         |
| Migration   | Alembic             |
| Déploiement | Docker Compose      |
| Frontend    | HTML/CSS/JS vanilla |

---

# 📁 Nouvelle architecture SPORT

```text
backend/
├── services/
├── sport/
│   ├── analytics/
│   ├── nutrition/
│   ├── recovery/
│   ├── training/
│   └── selectors/
```

Le domaine SPORT est volontairement séparé afin :

* d’éviter une logique métier monolithique
* de préparer les futurs calculs sportifs
* de faciliter les statistiques avancées.

---

# 🏋️ Module Training

## Objectif

Permettre :

* le suivi des entraînements
* les lancers privés
* les vols libres
* les préparations concours
* les analyses de récupération.

---

# 🧩 Modèles principaux

## TrainingSession

Séance collective.

### Champs

| Champ        | Description            |
| ------------ | ---------------------- |
| date         | Date séance            |
| session_type | loft / toss / race     |
| distance_km  | Distance entraînement  |
| weather      | Conditions météo       |
| temperature  | Température            |
| wind         | Direction/force vent   |
| notes        | Observations générales |

---

## PigeonTrainingResult

Résultat individuel lié à une séance.

### Champs

| Champ            | Description                |
| ---------------- | -------------------------- |
| pigeon_id        | Référence pigeon           |
| session_id       | Référence séance           |
| return_time      | Heure retour               |
| internal_rank    | Ordre arrivée              |
| recovery_score   | Qualité récupération       |
| motivation_score | Motivation                 |
| condition_score  | Condition physique         |
| hydration_score  | Hydratation                |
| notes            | Observations individuelles |

---

# 📈 Analytics sportifs V1

Le module prépare des analytics avancés.

## Calculs prévus

### recovery_index

Basé sur :

* vitesse retour
* récupération
* hydratation
* régularité

---

### condition_index

Basé sur :

* forme récente
* fréquence entraînement
* stabilité résultats

---

### regularity_index

Basé sur :

* constance
* retours
* récupération
* engagements.

---

# 🍽️ Module Nutrition

## Philosophie

La nutrition est intégrée directement au domaine SPORT.

Le système doit permettre :

* la gestion des mélanges
* la planification hebdomadaire
* la récupération
* l’adaptation météo
* la préparation demi-fond/fond.

---

# 🌽 FeedIngredient

Bibliothèque des aliments.

## Exemples métier

| Aliment              | Catégorie    |
| -------------------- | ------------ |
| Maïs                 | Énergie      |
| Orge                 | Dépuratif    |
| Dari                 | Sport        |
| Pois                 | Protéine     |
| Cardi                | Graisse      |
| Tournesol décortiqué | Énergie      |
| Chanvre              | Motivation   |
| Cacahuètes           | Pré-concours |

---

# 🥣 FeedMix

Gestion des mélanges alimentaires.

## Exemples

| Mélange      | Usage        |
| ------------ | ------------ |
| Dépuratif    | récupération |
| Sport        | entraînement |
| Énergie      | pré-panier   |
| Pré-concours | enlogement   |

---

# 📅 NutritionPlan

Gestion des plans hebdomadaires.

## Exemple demi-fond yearlings Provence

| Jour     | Objectif                    |
| -------- | --------------------------- |
| Samedi   | récupération + électrolytes |
| Dimanche | dépuratif léger             |
| Lundi    | sport léger                 |
| Mardi    | travail                     |
| Mercredi | recharge énergétique        |
| Jeudi    | préparation motivation      |
| Vendredi | pré-enlogement              |

---

# 💧 Gestion hydratation

Le climat méditerranéen impose une gestion spécifique.

## Gestion prévue

* électrolytes retour concours
* protocoles canicule
* suivi hydratation
* récupération estivale.

---

# 🩺 Philosophie sanitaire

Le module suit une approche moderne :

## Priorités

* récupération
* hydratation
* respiration
* stabilité digestive

## Éviter

* surmédication
* antibiotiques systématiques
* surdosage vitamines.

---

# 📊 Dashboard SPORT

## Widgets envisagés

### Colonie

* taux retour
* pigeons en forme
* pertes saison
* récupération moyenne
* prochains concours

### Individuel

* historique entraînement
* forme actuelle
* progression
* récupération
* régularité.

---

# 🧠 Vision long terme

Le module SPORT prépare :

* analytics avancés
* IA sportive
* recommandations nutritionnelles
* détection fatigue
* aide sélection reproducteurs
* optimisation préparation concours.

---

# 🚀 Objectif produit

Créer une application colombophile moderne capable de :

* gérer l’élevage
* gérer le sportif
* exploiter les données
* assister la sélection
* améliorer les performances.

Le projet vise une architecture :

* moderne
* modulaire
* évolutive
* data-driven.

---

# 🔮 Évolutions futures possibles

## V2

* indice de forme
* gestion météo avancée
* préparation automatique concours
* statistiques poussées

## V3

* IA prédictive
* recommandations automatiques
* analyse performances lignées
* sélection intelligente reproducteurs
* analyse récupération automatique.

---

# 🕊️ Philosophie colombophile du projet

Le module SPORT est conçu selon une approche réaliste terrain :

* priorité récupération
* régularité avant vitesse pure
* suivi yearlings
* adaptation climat PACA
* gestion demi-fond moderne
* préparation progressive.

L’objectif est de fournir un outil réellement utile aux colombophiles actifs et compétiteurs.
