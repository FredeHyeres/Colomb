# 🕊️ ELEVEUR_RULES.md — Règles métier colombophiles
## Source de vérité pour le moteur XAI de Colomd

> **Usage** : Ce fichier documente en français les règles métier qui pilotent
> `xai_engine.py`. Toute modification de seuil ou de logique de recommandation
> doit d'abord être discutée ici, puis répercutée dans le code.
>
> **Profil éleveur cible** : Demi-fond PACA (Provence-Alpes-Côte d'Azur)
> Système naturel pour les yearlings · Veuvage simplifié pour les adultes

---

## 1. Catégories d'âge

| Catégorie | Définition | Système de gestion |
|-----------|------------|-------------------|
| `yearling` | Né l'année civile en cours | Naturel |
| `adulte`   | Né avant l'année civile en cours | Veuvage simplifié |

**Règle de calcul :**
```
annee_naissance >= annee_courante  →  yearling
annee_naissance <  annee_courante  →  adulte
annee_naissance = None             →  adulte (défaut sécurisé)
```

**Pourquoi cette distinction :**
Les yearlings en système naturel ont des profils de récupération différents
des adultes en veuvage. Les templates de recommandations et les seuils de
tolérance à la fatigue sont adaptés en conséquence.

---

## 2. Scores de suivi individuel (0–10)

Ces scores sont saisis manuellement par l'éleveur après chaque séance
ou concours. Ils alimentent les calculs du moteur XAI.

| Score | Ce qu'il mesure | Exemples terrain |
|-------|----------------|-----------------|
| `recovery_score` | Qualité de récupération post-effort | Plumes rangées, œil vif, posture normale = 8–9 · Pigeon avachi, plumes ébouriffées = 2–3 |
| `condition_score` | Condition physique générale | Muscle pectoral ferme, poids stable = 7–8 · Pigeon maigre ou en surpoids = 3–4 |
| `hydration_score` | Niveau d'hydratation | Boit normalement après retour = 8 · Boit excessivement ou refuse = 3–4 |
| `motivation_score` | Envie de voler, dynamisme | Monte vite, cercles larges = 8–9 · Reste au sol, peu réactif = 2–3 |

---

## 3. Seuils de décision XAI (ELEVEUR_PROFILE)

Ces seuils sont les valeurs de référence utilisées par `generate_comment()`
pour produire les recommandations. Ils sont calibrés pour le demi-fond PACA.

### 3.1 Seuils principaux

| Paramètre | Seuil "bon" | Seuil "moyen" | Seuil "faible" | Commentaire |
|-----------|-------------|---------------|----------------|-------------|
| `recovery_avg_7d` | ≥ 7.0 | 5.0–6.9 | < 5.0 | Moyenne récupération 7 derniers jours |
| `condition_avg_7d` | ≥ 7.0 | 5.0–6.9 | < 5.0 | Moyenne condition 7 derniers jours |
| `regularity_index` | ≥ 7.0 | 5.0–6.9 | < 5.0 | Régularité des retours |
| `forme_score` | ≥ 70 | 50–69 | < 50 | Score de forme global (0–100) |

### 3.2 Seuils de concours

Critères **cumulatifs** pour recommander `concours` :

```
✓ Nombre de séances (30j)  ≥ 3
✓ recovery_avg_7d          ≥ 7.0
✓ Progression visible      (récupération 7j > récupération 8-30j)
```

Les trois critères doivent être réunis. Un seul manquant → `entrainement_leger`.

### 3.3 Repos post-concours

```
Repos minimum après concours difficile : 10 jours
```

Si le dernier concours date de moins de 10 jours → recommandation `repos`
quelle que soit la condition affichée. La fatigue cumulative n'est pas
toujours visible immédiatement après l'effort.

### 3.4 Risque fatigue

| Niveau | Condition | Conséquence |
|--------|-----------|-------------|
| `eleve`  | `training_load_30d` ≥ 20 ET `recovery_avg_7d` < 6.0 | Alerte fatigue, repos conseillé |
| `moyen`  | `training_load_30d` ≥ 12 OU `recovery_avg_7d` < 6.5 | Surveillance, entrainement léger |
| `faible` | Autres cas | Pas d'alerte |

---

## 4. Logique de recommandation

Les recommandations sont produites dans cet ordre de priorité :

```
1. RÉFORME        → condition_avg_7d < 3.0 sur 14 jours consécutifs
                    OU recovery_avg_7d < 2.0
2. REPOS          → repos post-concours < 10 jours
                    OU fatigue_risk = "eleve"
                    OU forme_score < 30
3. CONCOURS       → 3 critères cumulatifs réunis (cf. §3.2)
4. ENTRAÎNEMENT   → forme_score entre 50 et 69
   LÉGER
5. ENTRAÎNEMENT   → forme_score ≥ 70 sans remplir critères concours
   STANDARD       (manque de séances ou progression insuffisante)
```

**Principe :** La sécurité prime. Une recommandation `repos` ou `reforme`
ne peut pas être court-circuitée par un bon score de condition.

---

## 5. Adaptation par âge et système

### 5.1 Yearlings (système naturel)

- Tolérance à la charge plus faible : seuil fatigue abaissé de 10 %
- Progression attendue plus lente sur les 4 premières semaines
- Message tone : encourageant, pédagogique ("première saison")
- Repos post-concours : 12 jours (vs 10 pour les adultes)
- Objectif saison : régularité et finition, pas vitesse pure

### 5.2 Adultes (veuvage simplifié)

- Tolérance à la charge standard
- Progression attendue plus marquée entre les sorties
- Message tone : factuel, orienté performance
- Repos post-concours : 10 jours standard
- Objectif saison : classements et régularité

---

## 6. Spécificités climat PACA

Le moteur XAI intègre les contraintes du climat méditerranéen :

### 6.1 THI — Temperature Humidity Index

```
THI = Température (°C) + 0.36 × Humidité (%) + 41.2
```

| THI | Niveau stress thermique | Action recommandée |
|-----|------------------------|-------------------|
| < 72 | Aucun | Normal |
| 72–79 | Léger | Surveiller hydratation |
| 80–89 | Modéré | Réduire charge, électrolytes |
| ≥ 90 | Sévère | Suspendre entraînements |

### 6.2 Protocoles canicule (juillet–août PACA)

- `hydration_score` pondéré +20 % dans le calcul de forme
- Seuil repos automatique si température > 35°C au retour
- Recommandation électrolytes systématique après concours estival

---

## 7. Templates de commentaires

### 7.1 Structure d'un commentaire

Chaque recommandation produit trois champs :

| Champ | Rôle | Exemple |
|-------|------|---------|
| `title` | Titre court affiché en badge | "Prêt pour le concours" |
| `message` | Explication en langage naturel | "Récupération excellente sur 7 jours..." |
| `action` | Action concrète à faire | "Enloger jeudi pour concours samedi" |

### 7.2 Exemples par type

**`concours` — yearling :**
> *Title* : "Prêt pour sa première sortie officielle"
> *Message* : "Bonne progression sur les séances récentes. Récupération au-dessus des seuils. Première saison prometteuse."
> *Action* : "Enloger 48h avant. Mélange pré-concours dès jeudi."

**`concours` — adulte :**
> *Title* : "En forme — à engager"
> *Message* : "Récupération solide, condition stable, progression visible. Conditions réunies pour un engagement."
> *Action* : "Enloger jeudi. Surveiller hydratation la veille."

**`repos` — post-concours :**
> *Title* : "Repos obligatoire"
> *Message* : "Concours récent (moins de 10 jours). La fatigue cumulative n'est pas toujours visible immédiatement."
> *Action* : "Pas de séance avant [date + 10j]. Dépuratif + électrolytes."

**`repos` — fatigue élevée :**
> *Title* : "Signes de fatigue"
> *Message* : "Charge d'entraînement élevée combinée à une récupération en baisse. Risque de surentraînement."
> *Action* : "Repos 5–7 jours. Réévaluer après."

**`entrainement_leger` :**
> *Title* : "Entraînement léger conseillé"
> *Message* : "Forme correcte mais insuffisante pour engager. Quelques séances supplémentaires nécessaires."
> *Action* : "2–3 lancers courts cette semaine. Surveiller récupération."

**`reforme` :**
> *Title* : "Condition préoccupante"
> *Message* : "Scores de condition et récupération bas sur une période prolongée. À surveiller attentivement."
> *Action* : "Consultation vétérinaire recommandée. Mettre au repos complet."

---

## 8. Ce que le moteur XAI ne fait PAS

Pour garantir la philosophie "explainable AI" et éviter les erreurs :

- ✗ Pas de décision automatique d'engagement ou de mise à la retraite
- ✗ Pas de recommandations nutritionnelles automatiques (V4)
- ✗ Pas d'inférence sur la santé (symptômes = module Santé séparé)
- ✗ Pas de comparaison inter-éleveurs (données isolées par colonie)
- ✓ Chaque recommandation affiche ses facteurs explicatifs
- ✓ L'éleveur reste décisionnaire final

---

## 9. Évolution des règles

### Comment modifier un seuil

1. Modifier ce fichier en expliquant le motif du changement
2. Mettre à jour `ELEVEUR_PROFILE` dans `xai_engine.py`
3. Créer un nouveau `snapshot_version` si les features changent
4. Documenter la date de changement ci-dessous

### Historique des versions

| Version | Date | Changement |
|---------|------|------------|
| `rules_v1` | 2026-05-27 | Version initiale — seuils calibrés demi-fond PACA |

---

## 10. Glossaire

| Terme | Définition |
|-------|------------|
| **Demi-fond** | Distances 300–600 km, discipline principale PACA |
| **Yearling** | Pigeon de l'année, première saison de concours |
| **Veuvage simplifié** | Système où les mâles voient leur femelle ponctuellement pour stimuler la motivation |
| **Enlogement** | Mise en cage de transport 24–48h avant le concours |
| **Dépuratif** | Mélange alimentaire pauvre en protéines pour nettoyer l'organisme post-effort |
| **Électrolytes** | Minéraux (sodium, potassium) pour la récupération hydrique post-chaleur |
| **recovery_score** | Score 0–10 saisi par l'éleveur évaluant la récupération post-séance |
| **forme_score** | Score 0–100 calculé par le moteur XAI sur 30 jours |
| **THI** | Temperature Humidity Index — mesure le stress thermique combiné |
