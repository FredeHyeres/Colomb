# Colomd — Gestion d'élevage colombophile

Application web de gestion complète pour éleveurs de pigeons voyageurs. sous DOCKER DESKTOP

## Fonctionnalités

- **Pigeons** — fiche individuelle avec photo, bague, lignée, couleur, sexe
- **Pedigree** — arbre généalogique sur 3 générations, export PDF
- **Fiche pigeon** — document PDF format A5 avec performances, santé et vaccins
- **Couples & nichées** — suivi des accouplements et création des jeunes depuis la nichée
- **Lignées** — gestion avec code couleur propagé dans toute l'interface
- **Performances** — enregistrement des concours (vitesse, classement, distance)
- **Santé** — suivi des vaccins et visites vétérinaires
- **Éleveur** — profil et coordonnées intégrés dans les exports PDF
- **Dashboard** — vue synthétique des statistiques de l'élevage

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy async |
| Base de données | PostgreSQL |
| Frontend | HTML / CSS / JavaScript vanilla |
| Conteneurisation | Docker Compose |

## Lancement

```bash
docker compose up --build
```

- Frontend : http://localhost:8080
- API : http://localhost:8001

## Utilitaires

```bash
# Vider la base de données (conserve la structure)
docker exec colombo_backend python reset_db.py

# Injecter des données de test
docker exec colombo_backend python seed.py
```
