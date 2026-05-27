# 🕊️ Colomb — Application Colombophile

> Application web complète pour éleveurs de **pigeons voyageurs** — suivi des oiseaux, pedigrees, concours, santé, sport et intelligence artificielle. Déploiement via **Docker Desktop**.

![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

---

> ## Statut du projet
>
> **Branche `main`** : V3 stable — XAI Engine finalisé, boucle feedback, ELEVEUR_RULES
> **Branche `v2`** : archive — Élevage + Sport + XAI expérimental
> **Tag `v3.0.0`** · **Tag `v2.0.0`** · **Tag `v1.0.0`**

---

## 🗺️ Versions

| Tag | Contenu | Statut |
|---|---|---|
| `v1.0.0` | Élevage (pigeons, pedigree, couples, santé, performances) | ✅ Archive |
| `v2.0.0` | V1 + Sport (séances, analytics, nutrition) + XAI expérimental | ✅ Archive |
| `v3.0.0` | XAI Engine finalisé · boucle feedback · ELEVEUR_RULES · robustesse UI | ✅ Stable |

---

## 🔧 Fonctionnalités

### ✅ V1 — Élevage (stable)

| Module | Description |
|---|---|
| 🐦 **Pigeons** | Fiche individuelle avec photo, bague, lignée, couleur, sexe, statut |
| 🌳 **Pedigree** | Arbre généalogique sur 3 générations, export PDF |
| 📄 **Fiche pigeon** | Document PDF format A5 avec performances, santé et vaccins |
| 💑 **Couples & nichées** | Suivi des accouplements et création des jeunes depuis la nichée |
| 🎨 **Lignées** | Gestion avec code couleur propagé dans toute l'interface |
| 🏆 **Performances** | Enregistrement des concours (vitesse, classement, distance) |
| 💊 **Santé** | Suivi des vaccins, traitements et visites vétérinaires |
| 🤝 **Éleveur** | Profil et coordonnées intégrés dans les exports PDF |
| 📊 **Dashboard** | Vue synthétique des statistiques de l'élevage |

### ✅ V2 — Sport (stable)

| Module | Description |
|---|---|
| 🏃 **Séances d'entraînement** | Saisie des entraînements loft / lancer / concours avec scores |
| 📅 **Historique pigeon** | Timeline des séances avec récupération, condition, motivation |
| 🌍 **Monitoring colonie** | Vue d'ensemble de tous les pigeons actifs avec état de forme |
| 📈 **Analytics** | 4 graphiques : évolution récupération, charge hebdo, température vs récup, régularité |
| 💪 **Condition sportive** | Indices de condition, tendances 90j, impact santé, performances récentes |
| 🥗 **Plans alimentaires** | Calendrier des plans de nutrition selon la période sportive |
| 🤖 **XAI expérimental** | Recommandations explicables, snapshots sportifs, event store |

### ✅ V3 — XAI Engine finalisé (stable sur `main`)

| Module | Description |
|---|---|
| 📊 **Snapshots versionnés** | Fenêtre de calcul étendue 30j, `recovery_trend` calculé, seuils ajustés 70/50/30 |
| 🧠 **XAI Engine** | `compute_age_category()` automatique · yearling/adulte · ELEVEUR_RULES source de vérité |
| ⏱️ **Repos différencié** | 12j yearling / 10j adulte post-concours · messages adaptés par profil |
| 📝 **Boucle feedback** | Outcome modal · résultat concours · share anonymisé · pending feedback dashboard |
| 🛡️ **Robustesse UI** | `renderEmptyState()` · zones blanches éliminées · erreurs API gérées partout |

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy async (asyncpg) |
| Base de données | PostgreSQL 16 |
| Frontend | HTML / CSS / JavaScript vanilla |
| Conteneurisation | Docker Compose |

---

## 🚀 Lancement rapide

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### Installation

```bash
# Cloner la version stable V3 (recommandé)
git clone https://github.com/FredeHyeres/Colomb.git
cd Colomb

# Ou une version archivée spécifique
git clone -b v2 https://github.com/FredeHyeres/Colomb.git

# Lancer l'application
docker compose up --build
```

| Service | URL |
|---|---|
| 🖥️ Frontend | http://localhost:8080 |
| ⚙️ API | http://localhost:8001 |
| 📚 Documentation API | http://localhost:8001/docs |

---

## 🧰 Utilitaires

```bash
# Vider la base de données (conserve la structure)
docker exec colombo_backend python reset_db.py

# Injecter des données de test
docker exec colombo_backend python seed.py
```

---

## 📸 Captures d'écran

![Accueil](Images/acceuil.PNG)
![Mon élevage](Images/mon_elevage.PNG)
![Menu](Images/Menu.PNG)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésite pas à ouvrir une [issue](../../issues) ou une [pull request](../../pulls).

---

## 📜 Licence

© 2025 Tourneur Fred — Tous droits réservés.

- ✅ Utilisation gratuite autorisée
- ✅ Distribution gratuite autorisée
- ❌ Modification interdite sans autorisation
- ❌ Usage commercial interdit sans autorisation

---

## 💬 Contact

**Tourneur Fred**
- GitHub : [@FredeHyeres](https://github.com/FredeHyeres)
- Email : [fredtour86@gmail.com](mailto:fredtour86@gmail.com)

---

*Colomb — pigeon loft management app · colombophilie · racing pigeons · homing pigeons · gestion élevage*
