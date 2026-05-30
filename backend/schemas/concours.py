from pydantic import BaseModel
from typing import Optional, List
from datetime import date as DateType


# ── Pigeon résumé (imbriqué dans les engagements) ──────────────────────────────
class PigeonResume(BaseModel):
    id: str
    matricule: str
    annee_naissance: int
    sexe: str
    couleur_plumage: Optional[str] = None
    statut: Optional[str] = None
    titre_propriete: Optional[bool] = True

    model_config = {"from_attributes": True}


# ── Engagement ──────────────────────────────────────────────────────────────────
class EngagementCreate(BaseModel):
    pigeon_id: str
    categorie: str                              # vieux_coqs / yearlings / jeunes / femelles
    mise: Optional[float] = None
    notes: Optional[str] = None


class EngagementUpdate(BaseModel):
    categorie: Optional[str] = None
    mise: Optional[float] = None
    notes: Optional[str] = None


class ArriveeUpdate(BaseModel):
    heure_arrivee: str                          # "HH:MM:SS"
    correction_horloge_sec: int = 0


class ResultatUpdate(BaseModel):
    classement_officiel: Optional[int] = None
    nb_engages_categorie: Optional[int] = None
    statut: Optional[str] = None               # rentre_classe, rentre_non_classe, ...


class StatutUpdate(BaseModel):
    statut: str


class EngagementResponse(BaseModel):
    id: str
    concours_id: str
    pigeon_id: str
    pigeon: Optional[PigeonResume] = None
    categorie: str
    mise: Optional[float] = None
    statut: str
    heure_arrivee: Optional[str] = None
    correction_horloge_sec: int = 0
    vitesse_m_min: Optional[float] = None
    source_arrivee: Optional[str] = None
    classement_officiel: Optional[int] = None
    nb_engages_categorie: Optional[int] = None
    eligible: bool = True
    raison_ineligibilite: Optional[str] = None
    notes: Optional[str] = None
    training_result_id: Optional[int] = None

    model_config = {"from_attributes": True}


# ── Éligibilité FCF ─────────────────────────────────────────────────────────────
class EligibiliteResult(BaseModel):
    eligible: bool
    alertes: List[str]


# ── Concours ────────────────────────────────────────────────────────────────────
class ConcoursCreate(BaseModel):
    nom: str
    date: DateType
    lieu_lacher: Optional[str] = None
    distance_m: Optional[int] = None
    heure_lacher: Optional[str] = None         # "HH:MM:SS"
    notes: Optional[str] = None
    ref_fede: Optional[str] = None
    source: Optional[str] = "manuel"


class ConcoursUpdate(BaseModel):
    nom: Optional[str] = None
    date: Optional[DateType] = None
    lieu_lacher: Optional[str] = None
    distance_m: Optional[int] = None
    heure_lacher: Optional[str] = None
    nb_total_engages_officiel: Optional[int] = None
    statut: Optional[str] = None
    notes: Optional[str] = None
    ref_fede: Optional[str] = None


class ConcoursResponse(BaseModel):
    id: str
    nom: str
    date: DateType
    lieu_lacher: Optional[str] = None
    distance_m: Optional[int] = None
    heure_lacher: Optional[str] = None
    nb_total_engages_officiel: Optional[int] = None
    statut: str
    notes: Optional[str] = None
    session_id: Optional[int] = None
    ref_fede: Optional[str] = None
    source: Optional[str] = None
    engagements: List[EngagementResponse] = []

    model_config = {"from_attributes": True}


# ── Import arrivées ─────────────────────────────────────────────────────────────
class ImportArriveeResult(BaseModel):
    traites: int
    non_trouves: List[str]
    erreurs: List[str]


# ── Statistiques ────────────────────────────────────────────────────────────────
class ASPigeonResponse(BaseModel):
    pigeon_id: str
    matricule: str
    nb_concours: int
    nb_classes: int
    taux_retour: float                  # % retours / engagements
    vitesse_moyenne: Optional[float]
    meilleure_vitesse: Optional[float]
    points_as: int                      # nb concours classés
    score_as: Optional[float]           # moyenne (classement * 1000 / nb_engages) — plus faible = meilleur


class StatsPigeonResponse(BaseModel):
    pigeon_id: str
    matricule: str
    annees: List[int]
    nb_concours: int
    nb_classes: int
    nb_rentres: int                     # classes + non_classes
    nb_non_rentres: int
    taux_retour: float
    vitesse_moyenne: Optional[float]
    meilleure_vitesse: Optional[float]
    engagements: List[EngagementResponse] = []
