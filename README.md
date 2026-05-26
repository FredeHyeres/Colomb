# 🕊️ Colomb — Gestion d'élevage colombophile

> Application web complète pour éleveurs de **pigeons voyageurs** — suivi des oiseaux, pedigrees, concours, santé et statistiques. Déploiement via **Docker Desktop**.

![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

---

> ## ⚠️ Statut du projet
>
> **L'application est en cours de développement actif.**
>
> | Version | Statut | Description |
> |---|---|---|
> | **V1 — Élevage** | ✅ **Stable — prête à l'utilisation** | Pigeons, pedigrees, couples, santé, performances, éleveur |
> | **V2 — Sport** | 🚧 En développement | Disponible sur la branche `v2` |
> | **V3 — IA** | 🧪 Expérimental | Disponible sur la branche `main` |
>
> **Cette branche (v1) contient uniquement le module Élevage, stable et prêt à l'utilisation.**

---

## 🔧 Fonctionnalités — V1 Élevage

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
# Cloner le dépôt (branche v1)
git clone -b v1 https://github.com/FredeHyeres/Colomb.git
cd Colomb

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
