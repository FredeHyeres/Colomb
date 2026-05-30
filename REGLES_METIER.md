# Règles Métier — Colombophilie V3

> Document de référence extrait du code source.  
> Toute nouvelle fonctionnalité doit être vérifiée par rapport à ces règles.  
> Dernière mise à jour : 2026-05-30

---

## 1. Pigeon

| # | Règle | Source |
|---|---|---|
| P1 | Sexe binaire : `male` ou `femelle` uniquement | `models/pigeon.py` |
| P2 | Statuts possibles : `actif`, `reproducteur`, `concours`, `retraite`, `perdu`, `decede` | `models/pigeon.py` |
| P3 | Statut par défaut à la création : `actif` | `models/pigeon.py` |
| P4 | Matricule unique (contrainte BDD) | `models/pigeon.py` |
| P5 | Titre de propriété : booléen, `True` par défaut (exigence FCF) | `models/pigeon.py` |
| P6 | **Impossible de supprimer un pigeon ayant des affectations nutritionnelles actives** → HTTP 409 | `routers/pigeons.py` |
| P7 | Dans ce cas : suggérer de marquer `Perdu` pour conserver l'historique | `js/pigeons.js` |
| P8 | Import CSV : délimiteur `;`, encodage UTF-8-sig ou Latin-1 | `routers/pigeons.py` |
| P9 | Import CSV : `matricule`, `annee_naissance` (numérique), `sexe` (male/femelle) obligatoires | `routers/pigeons.py` |
| P10 | Pagination liste : **50 pigeons par page** | `js/pigeons.js` |
| P11 | Tri triple-clic : nouvelle colonne → ASC → DESC → ordre initial | `js/pigeons.js` |

---

## 2. Généalogie / Pedigree

| # | Règle | Source |
|---|---|---|
| G1 | Le **père** doit obligatoirement être un **mâle** | `routers/pigeons.py` |
| G2 | La **mère** doit obligatoirement être une **femelle** | `routers/pigeons.py` |
| G3 | Arbre pedigree affiché sur **4 générations maximum** (limite récursion) | `routers/pigeons.py` |

---

## 3. Couples & Reproduction

| # | Règle | Source |
|---|---|---|
| C1 | Couple = **1 mâle + 1 femelle** (sexes validés au backend) | `routers/couples.py` |
| C2 | Un couple ne peut être créé **qu'une fois par année** (unique : mâle + femelle + année) → 409 | `routers/couples.py` |
| C3 | Dissolution couple → mâle et femelle retournent automatiquement au statut `actif` | `routers/couples.py` |
| C4 | Une nichée est obligatoirement rattachée à un couple existant | `routers/couples.py` |

---

## 4. Concours — Règles FCF

> ⚠️ Constantes modifiables en tête de `backend/routers/concours.py` si la réglementation évolue :
> ```python
> FCF_BAGUE_FCI_ANNEE_MIN = 2014   # bagues logo FCI obligatoires depuis 2014
> FCF_AGE_MAX             = 12     # âge maximum en années
> FCF_VACCINATION_MOIS    = 12     # durée de validité vaccination (mois)
> ```

### 4.1 Éligibilité FCF (vérifiée à chaque engagement)

| # | Règle | Calcul |
|---|---|---|
| F1 | **Âge ≤ 12 ans** | `annee_concours − pigeon.annee_naissance ≤ FCF_AGE_MAX` |
| F2 | **Bague FCI** (logo depuis 2014) | `pigeon.annee_naissance ≥ FCF_BAGUE_FCI_ANNEE_MIN` |
| F3 | **Vaccination à jour** | enregistrement `type=vaccination` dans les 12 derniers mois avant la date du concours |
| F4 | **Titre de propriété** | `pigeon.titre_propriete = True` |

### 4.2 Gestion des concours

| # | Règle | Source |
|---|---|---|
| F5 | Un pigeon ne peut être engagé **qu'une fois par concours** → 409 si doublon | `routers/concours.py` |
| F6 | Catégories : `vieux_coqs`, `yearlings`, `jeunes`, `femelles` | `models/concours.py` |
| F7 | Statuts engagement : `engage`, `rentre_classe`, `rentre_non_classe`, `non_rentre_jour`, `perdu` | `models/concours.py` |
| F8 | Statuts concours : `a_venir`, `en_cours`, `termine`, `annule` | `models/concours.py` |

---

## 5. Calculs Vitesse & Statistiques

| # | Règle | Formule |
|---|---|---|
| V1 | **Vitesse (m/min)** | `distance_m ÷ temps_vol_en_minutes` |
| V2 | Si heure arrivée < heure lâcher → ajouter 1 jour (retour le lendemain possible) | `routers/concours.py` |
| V3 | Correction horloge constateur appliquée en **secondes** avant calcul | `models/concours.py` |
| V4 | Vitesse retournée `null` si temps ≤ 0 ou données manquantes | `routers/concours.py` |
| V5 | **Score AS** = `classement_officiel × 1000 ÷ nb_engagés_catégorie` (plus faible = meilleur) | `routers/concours.py` |
| V6 | **Points AS** = 1 point par concours classé (`rentre_classe`) | `routers/concours.py` |
| V7 | **Taux de retour** = `nb_rentres ÷ nb_concours × 100` (%) | `routers/concours.py` |

---

## 6. Liaison Concours ↔ Module Sport

| # | Règle | Source |
|---|---|---|
| L1 | Créer un concours → crée automatiquement une `TrainingSession(type='race')` | `routers/concours.py` |
| L2 | Saisir une arrivée → crée/met à jour le `PigeonTrainingResult` de la session liée | `routers/concours.py` |
| L3 | Modifier date/distance du concours → synchronise la `TrainingSession` | `routers/concours.py` |
| L4 | Supprimer un concours → supprime la `TrainingSession` liée | `routers/concours.py` |
| L5 | Retirer un engagement sans arrivée → supprime le `PigeonTrainingResult` vide | `routers/concours.py` |
| L6 | Les séances `race` **ne peuvent pas être créées directement** dans le module Sport | `sport-sessions.js` |

---

## 7. Séances d'Entraînement

| # | Règle | Source |
|---|---|---|
| S1 | Types : `loft` (colombier), `toss` (lancer), `race` (concours — géré via module Concours) | `models/sport.py` |
| S2 | Distance stockée en **km** en base, affichée en **mètres** dans l'interface | `sport-sessions.js` |
| S3 | Séance `loft` : distance = null | `models/sport.py` |
| S4 | Scores pigeon par séance : récupération, motivation, condition, hydratation (0–10) | `models/sport.py` |

---

## 8. Nutrition — Mélanges & Plans

| # | Règle | Source |
|---|---|---|
| N1 | Catégories ingrédients : `energie`, `depuratif`, `sport`, `proteine`, `graisse`, `motivation`, `pre_concours` | `models/sport.py` |
| N2 | Usage mélange : `recuperation`, `entrainement`, `pre_panier`, `enlogement` | `models/sport.py` |
| N3 | Composition mélange = liste d'ingrédients avec pourcentages (total = 100 %) | `models/sport.py` |
| N4 | **Verrou ingrédient** : ignoré lors rééquilibrage — les autres ingrédients absorbent la différence | `sport-nutrition.js` |
| N5 | **Minimum 2 ingrédients déverrouillés** pour pouvoir rééquilibrer | `sport-nutrition.js` |
| N6 | Plan hebdomadaire : un JSON de `mix_ids` par jour (lundi → dimanche) | `models/sport.py` |
| N7 | Date fin `null` = plan **reconductible indéfiniment** | `models/sport.py` |

---

## 9. Affectations Nutritionnelles

| # | Règle | Source |
|---|---|---|
| A1 | **Mode Groupe** : couvre **TOUS** les pigeons d'un statut donné, même plan, mêmes dates | `sport-nutrition.js` |
| A2 | **Mode Individuel** : un seul pigeon, un plan propre, `groupe = null` | `sport-nutrition.js` |
| A3 | Groupes prédéfinis : `concours`, `reproducteurs`, `actifs`, `retraités` | `sport-nutrition.js` |
| A4 | **Un pigeon avec plan individuel est exclu du groupe de son statut** | règle métier |
| A5 | La suppression d'un groupe supprime **toutes** les affectations du groupe en une seule action | `sport-nutrition.js` |
| A6 | Un pigeon ne peut pas être supprimé s'il a des affectations actives → marquer `Perdu` | `routers/pigeons.py` |

---

## 10. Santé

| # | Règle | Source |
|---|---|---|
| SN1 | Types événements : `vaccination`, `traitement`, `visite vétérinaire`, `observation` | `models/sante.py` |
| SN2 | Seul le type `vaccination` est contrôlé pour l'éligibilité FCF (règle F3) | `routers/concours.py` |

---

## 11. Import / Export

| # | Règle | Source |
|---|---|---|
| I1 | Format CSV : séparateur `;`, encodage UTF-8 BOM (compatible Excel français) | tous les routers |
| I2 | Import arrivées concours (CSV) : colonnes `matricule;heure_arrivee;correction_sec` | `routers/concours.py` |
| I3 | Import arrivées concours (Excel) : mêmes colonnes, premier onglet | `routers/concours.py` |
| I4 | Benzing Live! : polling fichier log toutes les `BENZING_POLL_INTERVAL_SEC` secondes (défaut 5 s) | `routers/concours.py` |
| I5 | Format Benzing attendu : `matricule;date;heure;code_pigeon` | `routers/concours.py` |
| I6 | Export pigeons : trié par année naissance ASC, matricule ASC | `routers/pigeons.py` |
| I7 | Export performances : trié par date DESC | `routers/performances.py` |

---

## 12. Traçabilité & Sources

| # | Règle | Source |
|---|---|---|
| T1 | Source arrivée tracée : `manuelle`, `csv`, `benzing` | `models/concours.py` |
| T2 | Source concours tracée : `manuel`, `import_fede`, `import_csv` | `models/concours.py` |
| T3 | Champ `ref_fede` : réservé pour future synchro FCF/PiRcube | `models/concours.py` |

---

## 13. Données de Test (seed_test.py)

> ⚠️ Ce fichier est dans `.gitignore` — usage local uniquement, ne pas pousser sur GitHub.

| # | Règle |
|---|---|
| D1 | Toutes les données de test portent le marqueur `[SEED_TEST]` dans leur champ `notes` ou `description` |
| D2 | La suppression cible uniquement ce marqueur — **ne touche jamais** ingrédients, mélanges, plans |
| D3 | Affectations groupe : `groupe` = nom métier (`concours`, `reproducteurs`, `actifs`, `retraités`) |
| D4 | Affectations individuelles : pigeons pedigree G4 uniquement, `groupe = null` |
| D5 | Commande créer : `docker exec colombo_backend python seed_test.py` |
| D6 | Commande supprimer : `docker exec colombo_backend python seed_test.py --delete` |
