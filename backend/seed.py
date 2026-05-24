import asyncio
import uuid
from datetime import date
from sqlalchemy import select

from database import AsyncSessionLocal
from models.pigeon import Pigeon, Sexe, Statut
from models.lignee import Lignee
from models.performance import Performance
from models.sante import Sante, TypeEvenement


async def seed():
    async with AsyncSessionLocal() as session:
        # Idempotence : ne rien insérer si des données existent déjà
        existing = await session.execute(select(Lignee).where(Lignee.nom == "Janssen"))
        if existing.scalar_one_or_none():
            print("⚠️  Données déjà présentes, seed ignoré.")
            return

        # ── Lignées ───────────────────────────────────────────────────────────
        janssen      = Lignee(id=str(uuid.uuid4()), nom="Janssen",       origine="Belgique", couleur_label="#2980B9")
        koopman      = Lignee(id=str(uuid.uuid4()), nom="Koopman",       origine="Pays-Bas", couleur_label="#27AE60")
        vandenabeele = Lignee(id=str(uuid.uuid4()), nom="Vandenabeele",  origine="Belgique", couleur_label="#E74C3C")
        maison       = Lignee(id=str(uuid.uuid4()), nom="Maison Hyères", origine="France",   couleur_label="#C4963A")
        session.add_all([janssen, koopman, vandenabeele, maison])
        await session.flush()

        # ── Génération 0 — Fondateurs (pas de parents connus) ─────────────────
        p_fr18_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2018-001", annee_naissance=2018,
            sexe=Sexe.male, statut=Statut.retraite,
            lignee_id=janssen.id, colombier_case="A1", couleur_plumage="Bleu barré",
        )
        p_fr18_002 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2018-002", annee_naissance=2018,
            sexe=Sexe.femelle, statut=Statut.retraite,
            lignee_id=janssen.id, colombier_case="A2", couleur_plumage="Bleue barrée",
        )
        p_nl19_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="NL-2019-001", annee_naissance=2019,
            sexe=Sexe.male, statut=Statut.retraite,
            lignee_id=koopman.id, colombier_case="B1", couleur_plumage="Bleu sombre",
        )
        p_nl19_002 = Pigeon(
            id=str(uuid.uuid4()), matricule="NL-2019-002", annee_naissance=2019,
            sexe=Sexe.femelle, statut=Statut.retraite,
            lignee_id=koopman.id, colombier_case="B2", couleur_plumage="Écaillée",
        )
        p_be19_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="BE-2019-001", annee_naissance=2019,
            sexe=Sexe.male, statut=Statut.decede,
            lignee_id=vandenabeele.id, colombier_case="C1", couleur_plumage="Rouge barré",
        )
        p_be19_002 = Pigeon(
            id=str(uuid.uuid4()), matricule="BE-2019-002", annee_naissance=2019,
            sexe=Sexe.femelle, statut=Statut.retraite,
            lignee_id=vandenabeele.id, colombier_case="C2", couleur_plumage="Rouge écaillée",
        )
        session.add_all([p_fr18_001, p_fr18_002, p_nl19_001, p_nl19_002, p_be19_001, p_be19_002])
        await session.flush()

        # ── Génération 1 — Parents connus ─────────────────────────────────────
        p_fr20_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2020-001", annee_naissance=2020,
            sexe=Sexe.male, statut=Statut.reproducteur,
            lignee_id=janssen.id, colombier_case="A3", couleur_plumage="Bleu barré",
            pere_id=p_fr18_001.id, mere_id=p_fr18_002.id,
        )
        p_fr20_002 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2020-002", annee_naissance=2020,
            sexe=Sexe.femelle, statut=Statut.reproducteur,
            lignee_id=koopman.id, colombier_case="B3", couleur_plumage="Écaillée",
            pere_id=p_nl19_001.id, mere_id=p_nl19_002.id,
        )
        p_be20_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="BE-2020-001", annee_naissance=2020,
            sexe=Sexe.male, statut=Statut.reproducteur,
            lignee_id=vandenabeele.id, colombier_case="C3", couleur_plumage="Rouge barré",
            pere_id=p_be19_001.id, mere_id=p_be19_002.id,
        )
        session.add_all([p_fr20_001, p_fr20_002, p_be20_001])
        await session.flush()

        # ── Génération 2 — Grands-parents connus ──────────────────────────────
        p_fr22_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2022-001", annee_naissance=2022,
            sexe=Sexe.male, statut=Statut.concours,
            lignee_id=janssen.id, colombier_case="A4", couleur_plumage="Bleu barré",
            pere_id=p_fr20_001.id, mere_id=p_fr20_002.id,
        )
        p_fr22_002 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2022-002", annee_naissance=2022,
            sexe=Sexe.femelle, statut=Statut.concours,
            lignee_id=maison.id, colombier_case="D1", couleur_plumage="Bleue barrée",
            pere_id=p_fr20_001.id, mere_id=p_fr20_002.id,
        )
        p_be22_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="BE-2022-001", annee_naissance=2022,
            sexe=Sexe.male, statut=Statut.actif,
            lignee_id=vandenabeele.id, colombier_case="C4", couleur_plumage="Rouge barré",
            pere_id=p_be20_001.id, mere_id=p_fr20_002.id,
        )
        session.add_all([p_fr22_001, p_fr22_002, p_be22_001])
        await session.flush()

        # ── Génération 3 — Arrière-grands-parents connus ──────────────────────
        p_fr24_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2024-001", annee_naissance=2024,
            sexe=Sexe.male, statut=Statut.actif,
            lignee_id=maison.id, colombier_case="D2", couleur_plumage="Bleu barré croisé",
            pere_id=p_fr22_001.id, mere_id=p_fr22_002.id,
        )
        p_fr24_002 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2024-002", annee_naissance=2024,
            sexe=Sexe.femelle, statut=Statut.actif,
            lignee_id=maison.id, colombier_case="D3", couleur_plumage="Écaillée croisée",
            pere_id=p_fr22_001.id, mere_id=p_be22_001.id,
        )
        session.add_all([p_fr24_001, p_fr24_002])
        await session.flush()

        # ── Génération 4 — Pedigree complet 5 générations ────────────────────
        p_fr25_001 = Pigeon(
            id=str(uuid.uuid4()), matricule="FR-2025-001", annee_naissance=2025,
            sexe=Sexe.male, statut=Statut.actif,
            lignee_id=maison.id, colombier_case="D4", couleur_plumage="Bleu barré",
            pere_id=p_fr24_001.id, mere_id=p_fr24_002.id,
        )
        session.add(p_fr25_001)
        await session.flush()

        # ── Performances ──────────────────────────────────────────────────────
        performances = [
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr22_001.id,
                date=date(2024, 5, 12), nom_concours="Championnat Provence",
                distance_km=320, classement=3, vitesse_m_min=1456.2, nb_pigeons_engages=245,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr22_001.id,
                date=date(2024, 6, 8), nom_concours="Grand Prix Marseille",
                distance_km=480, classement=1, vitesse_m_min=1389.5, nb_pigeons_engages=312,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr22_002.id,
                date=date(2024, 5, 12), nom_concours="Championnat Provence",
                distance_km=320, classement=12, vitesse_m_min=1398.7, nb_pigeons_engages=245,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr22_002.id,
                date=date(2024, 6, 8), nom_concours="Grand Prix Marseille",
                distance_km=480, classement=5, vitesse_m_min=1356.3, nb_pigeons_engages=312,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_be22_001.id,
                date=date(2024, 7, 14), nom_concours="Coupe du 14 Juillet",
                distance_km=550, classement=2, vitesse_m_min=1298.4, nb_pigeons_engages=189,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr24_001.id,
                date=date(2025, 5, 18), nom_concours="Championnat Provence",
                distance_km=320, classement=8, vitesse_m_min=1423.1, nb_pigeons_engages=267,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr24_001.id,
                date=date(2025, 6, 22), nom_concours="Grand Prix Côte d'Azur",
                distance_km=410, classement=4, vitesse_m_min=1367.8, nb_pigeons_engages=198,
            ),
            Performance(
                id=str(uuid.uuid4()), pigeon_id=p_fr25_001.id,
                date=date(2025, 9, 14), nom_concours="Course Jeunes 2025",
                distance_km=180, classement=2, vitesse_m_min=1512.3, nb_pigeons_engages=156,
            ),
        ]
        session.add_all(performances)

        # ── Santé ─────────────────────────────────────────────────────────────
        sante_events = [
            Sante(
                id=str(uuid.uuid4()), pigeon_id=p_fr22_001.id,
                date=date(2024, 3, 15), type=TypeEvenement.vaccination,
                description="Vaccination paramyxovirus", produit="Colombovac PMV",
            ),
            Sante(
                id=str(uuid.uuid4()), pigeon_id=p_fr22_002.id,
                date=date(2024, 3, 15), type=TypeEvenement.vaccination,
                description="Vaccination paramyxovirus", produit="Colombovac PMV",
            ),
            Sante(
                id=str(uuid.uuid4()), pigeon_id=p_fr24_001.id,
                date=date(2025, 2, 10), type=TypeEvenement.traitement,
                description="Traitement trichomonose", produit="Ronidazole 10mg",
            ),
            Sante(
                id=str(uuid.uuid4()), pigeon_id=p_fr24_002.id,
                date=date(2025, 2, 10), type=TypeEvenement.traitement,
                description="Traitement trichomonose", produit="Ronidazole 10mg",
            ),
            Sante(
                id=str(uuid.uuid4()), pigeon_id=p_be22_001.id,
                date=date(2024, 4, 20), type=TypeEvenement.visite_veterinaire,
                description="Bilan de santé pré-saison", produit=None,
            ),
            Sante(
                id=str(uuid.uuid4()), pigeon_id=p_fr25_001.id,
                date=date(2025, 3, 1), type=TypeEvenement.observation,
                description="Excellent état général, plumage brillant", produit=None,
            ),
        ]
        session.add_all(sante_events)

        await session.commit()
        print(
            f"✅ 4 lignées, 15 pigeons, "
            f"{len(performances)} performances, "
            f"{len(sante_events)} santé insérés"
        )


if __name__ == "__main__":
    asyncio.run(seed())
