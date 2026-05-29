# Manuel d'utilisation — Colomb

**Application de gestion d'élevage colombophile**
Version 3.0 — Mai 2026

**Développeur :** F. Tourneur — [fredtour86@gmail.com](mailto:fredtour86@gmail.com)

**Licence :** Libre d'utilisation et de distribution — Toute utilisation commerciale ou revente est interdite.

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Démarrage](#2-démarrage)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Pigeons](#4-pigeons)
5. [Lignées](#5-lignées)
6. [Performances](#6-performances)
7. [Santé](#7-santé)
8. [Couples & Reproduction](#8-couples--reproduction)
9. [Mon Élevage](#9-mon-élevage)
10. [Module Sport & IA](#10-module-sport--ia)
    - [Dashboard Sport](#101-dashboard-sport)
    - [Séances d'entraînement](#102-séances-dentraînement)
    - [Historique pigeon](#103-historique-pigeon)
    - [Nutrition](#104-nutrition)
    - [Analytics](#105-analytics)
    - [Recommandations IA](#106-recommandations-ia)
    - [Condition sportive](#107-condition-sportive)
    - [Monitoring colonie](#108-monitoring-colonie)
11. [Conventions et règles métier](#11-conventions-et-règles-métier)
12. [Messages d'erreur fréquents](#12-messages-derreur-fréquents)

---

## 1. Présentation générale

Colomb est une application web de gestion d'élevage de pigeons voyageurs. Elle se compose de deux espaces distincts accessibles depuis la barre de navigation latérale :

- **Colomb — Gestion d'élevage** (`/`) : suivi des pigeons, lignées, performances, santé, couples et profil éleveur.
- **Colomb Sport** (`/sport/`) : entraînements, nutrition, analyses statistiques et recommandations par intelligence artificielle.

Les deux espaces communiquent avec le même backend. Le lien **Sport & IA** en bas de la barre de navigation de l'espace élevage permet de basculer vers le module sport.

---

## 2. Démarrage

L'application nécessite que le serveur backend soit démarré avant toute utilisation. Au premier chargement, le tableau de bord tente de contacter l'API jusqu'à 5 fois (une tentative par seconde). Si l'API reste inaccessible, le message *"Impossible de contacter l'API"* s'affiche avec un bouton **Réessayer**.

**Adresse par défaut :** `http://localhost` (port 80 pour le frontend, port 8001 pour l'API)

---

## 3. Tableau de bord

Page d'accueil de l'espace élevage. Elle affiche :

### Compteurs en haut de page
| Indicateur | Description |
|---|---|
| Total pigeons | Nombre total de pigeons enregistrés (tous statuts) |
| Actifs | Pigeons avec le statut *Actif* |
| Reproducteurs | Pigeons avec le statut *Reproducteur* |
| En concours | Pigeons avec le statut *Concours* |

### Répartition par lignée
Tableau indiquant le nombre et le pourcentage de pigeons pour chaque lignée définie, ainsi que les pigeons sans lignée.

### Répartition par statut
Barres de progression visuelles pour les statuts : Actifs, Reproducteurs, En concours, Perdus.

### Derniers pigeons enregistrés
Les 5 derniers pigeons ajoutés. Cliquer sur une ligne navigue vers la page Pigeons.

---

## 4. Pigeons

### Liste des pigeons

La liste affiche tous les pigeons dans l'ordre de création. Chaque ligne indique :
- Photo (vignette ou icône 🕊️ si absente)
- Matricule
- Année de naissance
- Sexe (♂️ Mâle / ♀️ Femelle)
- Lignée (badge coloré si attribuée)
- Case colombier
- Statut (badge coloré)
- Boutons d'action

### Filtres et tri

**Filtres disponibles** (cumulables) :
- Lignée
- Statut
- Sexe
- Année de naissance

Le bouton **✕ Réinitialiser** efface tous les filtres actifs.

**Tri** : cliquer sur l'en-tête des colonnes *Matricule*, *Année*, *Sexe*, *Lignée*, *Statut* pour trier. Le premier clic trie en ordre croissant (↑), le deuxième en ordre décroissant (↓), le troisième revient à l'ordre de création.

Un compteur sous les filtres indique le nombre de pigeons affichés sur le total.

### Statuts disponibles

| Statut | Usage |
|---|---|
| Actif | Pigeon en activité normale |
| Reproducteur | Pigeon affecté à la reproduction (attribué automatiquement lors de la création d'un couple) |
| Concours | Pigeon engagé en compétition |
| Retraité | Pigeon retiré de la compétition |
| Perdu | Pigeon perdu, conservé dans l'historique |
| Décédé | Pigeon décédé, conservé dans l'historique |

### Ajouter un pigeon

Cliquer sur le bouton **+ Ajouter un pigeon** en haut à droite. Le formulaire demande :

| Champ | Obligatoire | Description |
|---|---|---|
| Matricule | Oui | Identifiant unique (ex : `166548-24-F`) |
| Année de naissance | Oui | Année entière (2000–2099) |
| Sexe | Oui | Mâle ou Femelle |
| Statut | Non | Par défaut : Actif |
| Couleur du plumage | Non | Texte libre (ex : `Bleu barré`) |
| Case colombier | Non | Texte libre (ex : `Case 12`) |
| Lignée | Non | Choisir parmi les lignées existantes |
| Père ♂️ | Non | Choisir parmi les mâles existants |
| Mère ♀️ | Non | Choisir parmi les femelles existantes |
| Notes | Non | Zone de texte libre |

### Modifier un pigeon

Cliquer sur ✏️ dans la liste. Le formulaire est identique à la création, pré-rempli avec les valeurs actuelles.

### Fiche détaillée d'un pigeon

Cliquer sur 👁️ pour ouvrir la fiche complète qui affiche :
- Photo + bouton de mise à jour de photo
- Informations principales (matricule, année, sexe, statut, case, couleur, lignée)
- Notes
- Généalogie (père et mère cliquables pour naviguer vers leur fiche)
- Performances (tableau historique des concours, triées par date décroissante)
- Suivi santé (tableau des événements santé)

Boutons en bas de fiche :
- **Fermer** : ferme la fenêtre
- **🖨️ Imprimer** : génère un PDF de la fiche (voir section PDF)
- **🌳 Pedigree** : ouvre l'arbre généalogique sur 4 générations
- **✏️ Modifier** : ouvre le formulaire de modification

### Photo d'un pigeon

Dans la fiche détaillée, cliquer sur **📷 Photo** pour sélectionner une image (formats JPG, JPEG, PNG, WEBP). La photo est mise à jour immédiatement.

### Pedigree

Accessible depuis la liste (bouton **🌳 Pedigree**) ou la fiche détaillée. Affiche l'arbre généalogique sur 4 générations. Chaque ancêtre affiche son matricule, sexe, couleur de plumage et lignée.

Un bouton **🖨️ PDF Pedigree** permet d'exporter l'arbre en fichier PDF.

### Supprimer un pigeon

Cliquer sur 🗑️ puis confirmer la suppression dans la fenêtre de confirmation.

**Cas particulier — Pigeon avec affectations nutritionnelles :** si le pigeon possède des affectations de plans nutritionnels actives, la suppression est bloquée. Une fenêtre d'avertissement propose deux options :
- **Annuler** : abandon de l'opération
- **Marquer comme Perdu** : change le statut du pigeon en *Perdu* et le retire du suivi actif tout en conservant son historique

---

## 5. Lignées

Les lignées permettent de regrouper des pigeons sous une origine commune (ex : Janssen, Van Loon…) et d'associer une couleur d'identification visuelle.

### Liste des lignées

Tableau avec : couleur (pastille), nom, origine, description, boutons Modifier et Supprimer.

### Créer une lignée

Cliquer sur **+ Ajouter une lignée**. Champs :

| Champ | Obligatoire | Description |
|---|---|---|
| Nom | Oui | Nom de la lignée |
| Origine | Non | Pays ou région d'origine |
| Description | Non | Texte libre |
| Couleur d'identification | Non | Couleur choisie via le sélecteur de couleur. Par défaut : bleu (#2980B9). Utilisée pour les badges et les fonds de ligne dans toutes les listes |

### Supprimer une lignée

La suppression d'une lignée ne supprime pas les pigeons qui lui sont rattachés, mais retire simplement le lien.

---

## 6. Performances

Suivi des résultats de concours de chaque pigeon.

### Liste des performances

Tableau trié par date décroissante :
- Pigeon (matricule + badge lignée)
- Nom du concours
- Date
- Distance (km)
- Classement (badge coloré : or pour 1er, argent pour 2e, bronze pour 3e)
- Vitesse (m/min)
- Nombre de pigeons engagés

### Ajouter une performance

Cliquer sur **+ Ajouter une performance**. Champs :

| Champ | Obligatoire | Description |
|---|---|---|
| Pigeon | Oui | Choisir dans la liste |
| Nom du concours | Oui | Texte libre (ex : `Grand Prix Marseille`) |
| Date | Oui | Date du concours |
| Distance (km) | Non | Distance du vol |
| Classement | Non | Position dans le classement (entier positif) |
| Vitesse (m/min) | Non | Vitesse en mètres par minute (décimale) |
| Pigeons engagés | Non | Nombre total de pigeons dans le concours |
| Notes | Non | Observations |

### Supprimer une performance

Bouton 🗑️ sur chaque ligne, confirmation requise.

---

## 7. Santé

Suivi des événements sanitaires (vaccinations, traitements, visites vétérinaires, observations).

### Liste des événements

Tableau trié par date décroissante :
- Pigeon
- Date
- Type (badge coloré)
- Description
- Produit utilisé

### Types d'événements

| Type | Badge |
|---|---|
| Vaccination | Vert |
| Traitement | Orange |
| Visite vétérinaire | Bleu |
| Observation | Gris |

### Ajouter un événement santé

Cliquer sur **+ Ajouter un événement**. Champs :

| Champ | Obligatoire |
|---|---|
| Pigeon | Oui |
| Type | Oui |
| Date | Oui |
| Description | Non |
| Produit utilisé | Non |

### Supprimer un événement

Bouton 🗑️ sur chaque ligne, confirmation requise.

---

## 8. Couples & Reproduction

Gestion des couples reproducteurs et de leurs nichées.

### Liste des couples

Deux sections distinctes :
- **Couples actifs** : toujours affichés
- **Historique** : couples dissous ou supprimés, masqués par défaut, affichables via le bouton **▼ Afficher**

Chaque ligne indique : numéro de case, matricule du mâle (+ lignée), matricule de la femelle (+ lignée), année, nombre de nichées.

### Créer un couple

Cliquer sur **+ Nouveau couple**. Champs :

| Champ | Obligatoire | Description |
|---|---|---|
| Mâle | Oui | Choisir parmi les mâles enregistrés |
| Femelle | Oui | Choisir parmi les femelles enregistrées |
| Case colombier | Non | Numéro de la case |
| Année | Oui | Année de formation du couple |
| Notes | Non | Observations |

À la création, les deux pigeons sont automatiquement passés au statut **Reproducteur**.

### Fiche détaillée d'un couple

Cliquer sur 👁️. Affiche :
- Encadrés mâle et femelle (avec statut et lignée)
- Numéro de case, année, statut actif/inactif
- Notes du couple
- Tableau des nichées avec les boutons : ✏️ Modifier, 🐣 Créer un jeune, 🗑️ Supprimer

Si le couple est actif, un bouton **+ Ajouter une nichée** est disponible.

### Ajouter une nichée

Depuis la fiche détaillée d'un couple actif. Champs :
- Date de ponte
- Date d'éclosion
- Nombre d'œufs (1 à 3, défaut : 2)
- Notes

### Créer un jeune pigeon depuis une nichée

Cliquer sur 🐣 dans le tableau des nichées. Un formulaire pré-remplit le père, la mère et l'année à partir de la date d'éclosion. Champs à renseigner :
- Matricule (obligatoire)
- Année de naissance (pré-remplie)
- Sexe (obligatoire)
- Statut (Actif, Concours ou Reproducteur)
- Case colombier
- Lignée
- Couleur du plumage
- Notes

### Dissoudre un couple

Cliquer sur 🔓 (liste ou fiche). Après confirmation, les deux pigeons repassent au statut **Actif**. Le couple est conservé dans l'historique.

### Supprimer un couple

Cliquer sur 🗑️. La suppression est définitive et entraîne la suppression de toutes les nichées associées.

---

## 9. Mon Élevage

Profil de l'éleveur. Ces informations sont utilisées dans l'en-tête des PDF exportés (fiche pigeon, pedigree).

### Informations disponibles

**Identité :**
- Prénom et nom
- Association
- Numéro d'éleveur

**Colombier :**
- Adresse
- Téléphone
- Email

**Photo du colombier :** cliquer sur **📷 Changer la photo** pour charger une image.

**Aperçu en-tête PDF :** un aperçu de la carte de visite qui apparaîtra dans les exports PDF est affiché en temps réel à gauche.

Les modifications sont enregistrées via le bouton **💾 Enregistrer**.

---

## 10. Module Sport & IA

Accessible via le lien **🏃 Sport & IA** en bas de la navigation de l'espace élevage, ou directement à l'adresse `/sport/`.

La navigation du module Sport est dans la barre latérale gauche (menu hamburger sur mobile). Le lien **← Retour Élevage** revient à l'espace principal.

---

### 10.1 Dashboard Sport

Page d'accueil du module Sport. Affiche une synthèse des indicateurs clés :
- Nombre total de séances enregistrées
- Récupération globale moyenne (calculée sur toutes les séances)
- Nombre de concours
- Autres métriques agrégées

---

### 10.2 Séances d'entraînement

Gestion des séances d'entraînement (loft, lancers, concours).

#### Liste des séances

Tableau de toutes les séances avec filtres :
- **Type** : Loft, Lancer, Concours
- **Date de** / **Date à** : plage de dates
- **Réinitialiser** : supprime tous les filtres actifs

Les filtres s'appliquent en temps réel.

#### Types de séances

| Type | Description |
|---|---|
| Loft | Vol en rond au colombier |
| Lancer | Vol depuis un point de lâcher |
| Concours | Participation à un concours officiel |

#### Créer une séance

Cliquer sur **+ Nouvelle séance**. Le formulaire permet de renseigner le type, la date, les conditions météo (température, vent) et les résultats individuels de chaque pigeon participante (récupération, notes).

#### Détail d'une séance

Cliquer sur une séance pour consulter les résultats détaillés par pigeon.

---

### 10.3 Historique pigeon

Vue chronologique des performances d'un pigeon spécifique.

Sélectionner un pigeon dans la liste déroulante puis cliquer sur **Charger l'historique**. L'affichage présente l'évolution de la récupération, des vitesses et des classements dans le temps.

---

### 10.4 Nutrition

Module de gestion alimentaire. Organisé en **6 onglets** :

---

#### Onglet Mélanges

Bibliothèque de formules de mélanges personnalisés.

**Liste des mélanges** : grille de cartes affichant pour chaque mélange son nom, l'usage (Récupération, Entraînement, Pré-panier, Enlogement), la description et la composition (ingrédients avec pourcentages).

**Boutons d'action par mélange :**
- ✏️ Modifier
- 📋 Dupliquer (crée un nouveau mélange identique avec le préfixe *"Copie de"*)
- 🗑️ Supprimer

**Créer un mélange :** cliquer sur **+ Créer un mélange**.

**Formulaire de mélange :**
- Nom (obligatoire)
- Usage (optionnel)
- Description (optionnel)
- Composition : liste d'ingrédients avec pourcentage pour chacun

**Gestion des pourcentages d'ingrédients :**

Chaque ingrédient dispose d'un curseur (slider) et d'un champ numérique. La somme de tous les pourcentages doit rester égale à 100%.

Lorsqu'un pourcentage est modifié, les autres ingrédients **non verrouillés** sont recalculés proportionnellement pour maintenir le total à 100%.

**Système de verrouillage (🔒/🔓) :**
- Cliquer sur l'icône de cadenas d'un ingrédient pour le verrouiller (🔒) : son pourcentage est fixé et ne change pas lors des redistributions.
- Un ingrédient verrouillé peut être déverrouillé en cliquant à nouveau sur son cadenas.
- **Règle n-2** : on ne peut pas verrouiller plus de *n-2* ingrédients (au moins 2 doivent toujours rester déverrouillés pour permettre la redistribution).
- **Limite des curseurs** : le maximum d'un curseur non verrouillé est automatiquement limité selon la formule `100 − somme des verrouillés − (nombre d'autres non verrouillés × 1%)`. Cela garantit qu'il sera toujours possible d'atteindre 100% en combinant tous les items.

---

#### Onglet Ingrédients

Catalogue des matières premières entrant dans la composition des mélanges.

**Liste des ingrédients** : tableau avec :
- Nom
- Catégorie
- Valeurs nutritionnelles : protéines (%), lipides (%), glucides (%), énergie (kcal/kg)
- Notes éleveurs
- Boutons ✏️ et 🗑️

**Créer / modifier un ingrédient :** le formulaire comprend tous les champs ci-dessus. Les champs nutritionnels sont facultatifs.

---

#### Onglet Suppléments

Catalogue des suppléments (vitamines, minéraux, acides aminés…).

**Liste des suppléments** : tableau avec nom, type et description.

**Créer / modifier un supplément** : nom, type, description.

---

#### Onglet Plan alimentaire

Les plans alimentaires définissent une ration journalière sur une semaine en assignant un ou plusieurs mélanges avec leurs pourcentages à chaque jour.

**Liste des plans** : cartes affichant le nom du plan, sa description et un aperçu du planning hebdomadaire (jours avec mélanges).

**Boutons d'action par plan :**
- ✏️ Modifier
- 📋 Dupliquer
- 🗑️ Supprimer

**Créer / modifier un plan :**
- Nom (obligatoire)
- Description (optionnel)
- Pour chaque jour de la semaine (Lun–Dim) : ajouter un ou plusieurs mélanges avec un pourcentage

**Gestion des pourcentages de mélanges par jour :**
La même logique de verrouillage et de redistribution proportionnelle que pour les ingrédients des mélanges s'applique ici :
- Curseur + champ numérique par mélange
- Redistribution automatique sur les mélanges non verrouillés
- Système de cadenas 🔒/🔓 avec règle n-2
- Limite dynamique des curseurs

---

#### Onglet Affectation

Associe un plan alimentaire à des pigeons ou à des groupes de pigeons.

**Deux modes d'affectation :**

| Mode | Description |
|---|---|
| Individuel (🕊️) | Affecte le plan à un ou plusieurs pigeons précis |
| Groupe (👥) | Affecte le plan à tous les pigeons d'un groupe (statut) |

**Groupes disponibles pour l'affectation :** Actif, Reproducteur, Concours, Retraité *(les pigeons Perdu et Décédé ne peuvent pas recevoir d'affectation).*

**Liste des affectations** : affiche toutes les affectations avec le plan, le mode, la cible (groupe ou pigeon), la période (date de début / fin).

Pour les pigeons avec le statut *Perdu* ou *Décédé*, un badge coloré (🟠 Perdu / ⚫ Décédé) est affiché dans la liste à côté du matricule, indiquant qu'ils conservent leur affectation historique mais ne sont plus actifs.

---

#### Onglet Calendrier

Vue hebdomadaire du planning alimentaire de la colonie.

**Navigation :** sélecteur de semaine en format ISO (YYYY-Www). Les boutons **◀** et **▶** permettent de naviguer semaine par semaine.

**Structure du calendrier :** tableau avec les 7 jours en colonnes et les pigeons/groupes en lignes :

| Ligne | Description |
|---|---|
| 👥 Groupe | Une ligne par groupe ayant une affectation de plan en mode groupe (ex : 👥 Concours). Affiche les mélanges du plan sur chaque jour. |
| 🕊️ Pigeon | Une ligne par pigeon ayant une affectation individuelle. Les pigeons Perdu et Décédé sont exclus. |

Chaque cellule du calendrier affiche, pour le jour concerné, les mélanges du plan sous forme de liste multiligne : nom du mélange + pourcentage.

---

### 10.5 Analytics

Tableau de bord analytique avec 4 graphiques calculés à partir des séances enregistrées :

1. **Tendance de récupération** : évolution dans le temps de l'indice de récupération moyen
2. **Charge hebdomadaire** : nombre de séances et intensité par semaine
3. **Température vs Récupération** : nuage de points corrélant les conditions météo à la récupération
4. **Régularité** : régularité d'entraînement des 5 pigeons les plus actifs

**KPI en haut de page :** total des séances, récupération globale moyenne, nombre de concours.

---

### 10.6 Recommandations IA

Analyse individuelle d'un pigeon par intelligence artificielle.

**Utilisation :**
1. Sélectionner un pigeon dans la liste déroulante
2. Cliquer sur **Charger l'analyse** pour afficher les recommandations existantes
3. Cliquer sur **⚡ Analyser maintenant** pour lancer une nouvelle analyse

L'analyse IA prend en compte :
- L'historique des séances et performances du pigeon
- La condition sportive (récupération, charge d'entraînement)
- Le profil génétique (lignée)
- La catégorie d'âge

Les recommandations s'affichent sous forme de fiches colorées indiquant le domaine (entraînement, nutrition, santé…), le niveau de priorité et un commentaire explicatif.

---

### 10.7 Condition sportive

Analyse détaillée de la condition sportive d'un pigeon spécifique.

**Utilisation :** sélectionner un pigeon puis cliquer sur **Analyser**.

L'affichage comprend :
- Indices circulaires de condition (forme physique, récupération, régularité)
- Tendances sur les dernières séances
- Alertes si des indicateurs sont dégradés
- Intégration des événements santé récents

---

### 10.8 Monitoring colonie

Vue d'ensemble de toute la colonie (hors pigeons décédés).

Affiche une carte individuelle par pigeon avec son dernier snapshot sportif. Les pigeons sont catégorisés visuellement selon leur niveau de forme. Un graphique en anneau (doughnut) présente la répartition de la colonie par catégorie de condition.

---

## 11. Conventions et règles métier

### Matricules
Le matricule est l'identifiant principal d'un pigeon. Il doit être unique. Format libre, exemple courant : `FR-2024-123456`.

### Statuts pigeons
Les statuts *Perdu* et *Décédé* ont des effets dans plusieurs modules :
- Exclus des sélections d'affectation nutritionnelle
- Exclus du calendrier nutrition
- Exclus du monitoring colonie (décédé uniquement)
- Visibles dans la liste des affectations avec badge informatif
- Non supprimables si des affectations nutritionnelles existent (voir section [Supprimer un pigeon](#supprimer-un-pigeon))

### Pourcentages (mélanges et plans)
- La somme des pourcentages doit toujours totaliser exactement 100%
- La redistribution est automatique et proportionnelle
- Au moins 2 items doivent rester déverrouillés
- Les curseurs sont plafonnés dynamiquement pour éviter tout dépassement

### Couples et statuts
- Création d'un couple → les deux pigeons passent automatiquement en *Reproducteur*
- Dissolution → les deux pigeons repassent en *Actif*

### Exports PDF
Les exports PDF (fiche pigeon, pedigree) utilisent l'en-tête configurée dans **Mon Élevage**. Si aucun profil éleveur n'est renseigné, l'en-tête est vide.

---

## 12. Messages d'erreur fréquents

| Message | Cause | Solution |
|---|---|---|
| *"Impossible de contacter l'API"* | Le serveur backend n'est pas démarré | Démarrer le serveur et cliquer sur **Réessayer** |
| *"Le matricule est obligatoire"* | Champ Matricule vide | Renseigner un matricule |
| *"Ce pigeon possède des affectations nutritionnelles actives"* | Tentative de suppression d'un pigeon avec des affectations | Marquer le pigeon comme *Perdu* à la place |
| *"Le père doit être un mâle"* | Sélection d'une femelle dans le champ Père | Choisir un pigeon de sexe mâle |
| *"La mère doit être une femelle"* | Sélection d'un mâle dans le champ Mère | Choisir un pigeon de sexe femelle |
| *"Choisissez un pigeon"* | Formulaire soumis sans pigeon sélectionné | Sélectionner un pigeon dans la liste |
| *"Erreur API"* | Erreur serveur générique | Consulter les logs du backend |

---

---

## Mentions légales

**Développeur :** F. Tourneur
**Contact :** [fredtour86@gmail.com](mailto:fredtour86@gmail.com)

**Licence :** Logiciel libre d'utilisation et de distribution.
Toute utilisation commerciale, revente ou redistribution à titre onéreux est strictement interdite.
La modification du logiciel est autorisée à condition de conserver la mention du développeur original.

*© 2026 F. Tourneur — Tous droits réservés sur le code source.*
