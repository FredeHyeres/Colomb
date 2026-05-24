# 🦆 Colomd — Gestion d'élevage colombophile

> Application web complète pour éleveurs de **pigeons voyageurs** — suivi des oiseaux, pedigrees, concours, santé et statistiques. Déploiement via **Docker Desktop**.

![Python](https://img.shields.io/badge/Python-FastAPI-blue?logo=python)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🔧 Fonctionnalités

| Module | Description |
|---|---|
| 🐦 **Pigeons** | Fiche individuelle avec photo, bague, lignée, couleur, sexe |
| 🌳 **Pedigree** | Arbre généalogique sur 3 générations, export PDF |
| 📄 **Fiche pigeon** | Document PDF format A5 avec performances, santé et vaccins |
| 💑 **Couples & nichées** | Suivi des accouplements et création des jeunes depuis la nichée |
| 🎨 **Lignées** | Gestion avec code couleur propagé dans toute l'interface |
| 🏆 **Performances** | Enregistrement des concours (vitesse, classement, distance) |
| 💊 **Santé** | Suivi des vaccins et visites vétérinaires |
| 🤝 **Éleveur** | Profil et coordonnées intégrés dans les exports PDF |
| 📊 **Dashboard** | Vue synthétique des statistiques de l'élevage |

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy async |
| Base de données | PostgreSQL |
| Frontend | HTML / CSS / JavaScript vanilla |
| Conteneurisation | Docker Compose |

---

## 🚀 Lancement rapide

### Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/FredeHyeres/colomd.git
cd colomd

# Lancer l'application
docker compose up --build
```

| Service | URL |
|---|---|
| 🖥️ Frontend | http://localhost:8080 |
| ⚙️ API | http://localhost:8001 |

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

> *(Ajoute ici quelques screenshots de l'interface)*

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

*Colomd — pigeon loft management app · colombophilie · racing pigeons · homing pigeons · gestion élevage*
