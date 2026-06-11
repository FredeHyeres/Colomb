# Déploiement démo — Railway

Ce document décrit le mode **démo** ajouté pour déployer Colomb sur
[Railway](https://railway.app) en un seul service, avec support FR/NL/EN
et isolation des données par schéma PostgreSQL.

> Le mode normal (installation locale via Docker Desktop) **n'est pas
> affecté** par ces changements : tant que `DEMO_MODE` est absent ou
> `false`, le comportement est strictement identique à avant.

---

## 1. Principe

- **Un seul déploiement Railway** (un service web + un addon PostgreSQL).
- **3 schémas PostgreSQL isolés** dans la même base : `demo_fr`, `demo_nl`,
  `demo_en`, créés et seedés au démarrage par
  [`backend/demo_init.py`](backend/demo_init.py).
- Chaque visiteur choisit sa langue via l'assistant `setup.html`, qui pose
  un cookie `demo_lang`. Un middleware FastAPI
  ([`backend/demo_middleware.py`](backend/demo_middleware.py)) bascule
  ensuite le `search_path` PostgreSQL de chaque requête sur le schéma
  correspondant.
- **Aucune donnée n'est persistée par visiteur** : `setup.html` s'affiche à
  chaque nouvelle session (pas de cookie / pas de `localStorage` côté
  config), et `POST /api/config/setup` ne modifie ni `config.json`, ni la
  table `eleveur` en mode démo — il pose seulement le cookie de langue.
- Le frontend est servi par FastAPI lui-même
  (`backend/main.py` monte `/app/frontend` si présent), donc tout est sur
  la même origine — pas de souci CORS pour la démo.

---

## 2. Fichiers ajoutés / modifiés

| Fichier | Rôle |
|---|---|
| [`backend/database.py`](backend/database.py) | Support `DATABASE_URL` (Railway), `DEMO_SCHEMAS`, `get_engine_for_schema()` (schema_translate_map), `get_db()` schema-aware |
| [`backend/demo_init.py`](backend/demo_init.py) | Crée les 3 schémas, crée les tables, seed idempotent par langue |
| [`backend/demo_middleware.py`](backend/demo_middleware.py) | Bascule `request.state.db_schema` selon le cookie/header de langue |
| [`backend/config_manager.py`](backend/config_manager.py) | `DEMO_MODE`, endpoint `GET /api/config/mode`, `POST /api/config/setup` adapté |
| [`backend/main.py`](backend/main.py) | `ALLOWED_ORIGINS` configurable, `allow_credentials=True`, middleware démo, sert le frontend statique si présent |
| [`backend/seed_fr.py`](backend/seed_fr.py), `seed_nl.py`, `seed_en.py` | `main(schema=...)` optionnel pour seeder un schéma spécifique |
| [`frontend/js/config.js`](frontend/js/config.js) | `API_ROOT`/`API_URL` dynamiques (remplace les URLs `localhost:8001` codées en dur) |
| [`frontend/setup.html`](frontend/setup.html), [`setup.js`](frontend/js/setup.js) | Bannière démo, profil pré-rempli, bouton "Explorer la démo" |
| [`Dockerfile.railway`](Dockerfile.railway) | Image unique backend + frontend |
| [`railway.toml`](railway.toml) | Config build/déploiement Railway |
| [`railway.env.example`](railway.env.example) | Variables d'environnement Railway |
| [`.env.example`](.env.example) | Variables d'environnement installation locale |

---

## 3. Déploiement Railway — étapes

1. **Créer un projet Railway** et y ajouter :
   - un addon **PostgreSQL** (Railway fournit `DATABASE_URL`)
   - un **service** pointant sur ce dépôt Git, branche `demo`

2. Le service détecte [`railway.toml`](railway.toml) :
   - build avec [`Dockerfile.railway`](Dockerfile.railway) (backend + frontend dans une seule image)
   - démarrage : `python demo_init.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - healthcheck : `GET /api/config/status`

3. **Variables d'environnement** du service (voir
   [`railway.env.example`](railway.env.example)) :

   ```
   DEMO_MODE=true
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   SECRET_KEY=<valeur aléatoire dédiée à la démo>
   ALLOWED_ORIGINS=https://<votre-domaine>.railway.app
   ```

   `ALLOWED_ORIGINS` doit correspondre au domaine public généré par Railway
   pour ce service (ou votre domaine personnalisé).

4. **Premier démarrage** : `demo_init.py` (lancé par le `startCommand`)
   crée les schémas `demo_fr`/`demo_nl`/`demo_en`, crée les tables, et
   seed chacun avec le catalogue nutrition correspondant. Les logs
   affichent chaque étape (✅ schéma prêt, 🌱 seed, 🎉 terminé).

5. **Redémarrages suivants** : `demo_init.py` détecte que chaque schéma est
   déjà seedé (`COUNT(*)` sur `feed_ingredients`) et passe directement
   (⏭️). Aucune donnée n'est re-seedée.

---

## 4. Comportement visiteur (mode démo)

1. À chaque nouvelle session, `setup.html` s'affiche (pas de cookie
   `demo_lang` → `check_first_launch()` retourne toujours `True`).
2. Une bannière "🎯 Mode démonstration — données fictives à titre
   d'exemple" est affichée (traduite).
3. Au choix de la langue, le profil éleveur est pré-rempli avec des
   données fictives (Jean Dupont / Jan De Smet / John Smith).
4. Le bouton final affiche "Explorer la démo".
5. `POST /api/config/setup` pose le cookie `demo_lang` (24h) et renvoie
   `{"success": true, "demo": true}` — **rien n'est écrit en base ni sur
   disque**.
6. Toutes les requêtes API suivantes utilisent le schéma PostgreSQL
   correspondant à la langue choisie (`demo_fr` / `demo_nl` / `demo_en`),
   via le middleware de schéma.

---

## 5. Mode normal (Docker Desktop) — inchangé

- `DEMO_MODE` absent ou `false` → `config_manager` se comporte exactement
  comme avant (`config.json` sur volume Docker, premier lancement unique,
  un seul schéma `public`).
- `docker-compose.yml` et `backend/Dockerfile` ne sont pas modifiés.
- Le frontend continue d'être servi par le conteneur `nginx` séparé
  (port 8080), l'API par le conteneur backend (port 8001) —
  `frontend/js/config.js` détecte ce cas (`port === '8080'`) et pointe
  vers `http://<host>:8001`.

---

## 6. Limitations connues de la démo

- Les seeds `seed_fr.py`/`seed_nl.py`/`seed_en.py` ne chargent que le
  catalogue nutrition (ingrédients, suppléments, plans alimentaires) —
  pas de pigeons/concours de démonstration.
- Toute donnée saisie par un visiteur (pigeons, performances, profil…)
  est écrite dans le schéma partagé de sa langue (`demo_fr`/`nl`/`en`) et
  **visible par les autres visiteurs de la même langue** tant que la base
  n'est pas réinitialisée. Il n'y a pas d'isolation par visiteur, seulement
  par langue.
- Pour repartir d'une base propre, il suffit de vider les 3 schémas
  (`DROP SCHEMA demo_fr CASCADE`, etc.) — `demo_init.py` les recréera et
  re-seedera au redémarrage suivant.
