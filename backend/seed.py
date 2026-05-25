import asyncio
import uuid
from datetime import date
from sqlalchemy import select

from database import AsyncSessionLocal
from models.pigeon import Pigeon, Sexe, Statut
from models.lignee import Lignee
from models.performance import Performance
from models.sante import Sante, TypeEvenement
from models.couple import Couple
from models.nichee import Nichee
from models.sport import (
    TrainingSession, PigeonTrainingResult, SessionType,
    FeedIngredient, FeedMix, FeedMixIngredient,
    NutritionPlan, NutritionPlanDay, Supplement,
)


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
            pere_id=p_fr22_001.id, mere_id=p_fr22_002.id,
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
        await session.flush()

        # ── Couples ───────────────────────────────────────────────────────────
        couple1 = Couple(
            id=str(uuid.uuid4()),
            male_id=p_fr20_001.id, femelle_id=p_fr20_002.id,
            case_numero="A3", annee=2024, actif=True,
        )
        couple2 = Couple(
            id=str(uuid.uuid4()),
            male_id=p_be20_001.id, femelle_id=p_fr20_002.id,
            case_numero="C3", annee=2024, actif=True,
        )
        couple3 = Couple(
            id=str(uuid.uuid4()),
            male_id=p_fr18_001.id, femelle_id=p_fr18_002.id,
            case_numero="A1", annee=2022, actif=False,
        )
        session.add_all([couple1, couple2, couple3])
        await session.flush()

        # ── Nichées ───────────────────────────────────────────────────────────
        nichees = [
            Nichee(id=str(uuid.uuid4()), couple_id=couple1.id,
                   date_ponte=date(2024, 2, 1), date_eclosion=date(2024, 2, 15), nombre_oeufs=2),
            Nichee(id=str(uuid.uuid4()), couple_id=couple1.id,
                   date_ponte=date(2024, 4, 10), date_eclosion=date(2024, 4, 24), nombre_oeufs=2),
            Nichee(id=str(uuid.uuid4()), couple_id=couple2.id,
                   date_ponte=date(2024, 3, 5), date_eclosion=date(2024, 3, 19), nombre_oeufs=1),
            Nichee(id=str(uuid.uuid4()), couple_id=couple3.id,
                   date_ponte=date(2022, 3, 1), date_eclosion=date(2022, 3, 15), nombre_oeufs=2),
            Nichee(id=str(uuid.uuid4()), couple_id=couple3.id,
                   date_ponte=date(2022, 5, 20), date_eclosion=date(2022, 6, 3), nombre_oeufs=2),
        ]
        session.add_all(nichees)

        await session.commit()
        print(
            f"✅ 4 lignées, 15 pigeons, "
            f"{len(performances)} performances, "
            f"{len(sante_events)} santé, "
            f"3 couples, {len(nichees)} nichées insérés"
        )


async def seed_sport():
    """
    Insère des données de démonstration pour le domaine SPORT.
    Idempotent : ignoré si des données sport existent déjà.
    """
    async with AsyncSessionLocal() as session:
        # Idempotence
        existing = await session.execute(select(FeedIngredient).limit(1))
        if existing.scalar_one_or_none():
            print("⚠️  Données sport déjà présentes, seed_sport ignoré.")
            return

        # ── Ingrédients ───────────────────────────────────────────────────────
        mais = FeedIngredient(
            name="Maïs",
            category="céréale",
            protein_pct=9.0,
            fat_pct=4.5,
            carbs_pct=72.0,
            energy_index=3.35,
            digestion_speed="moyen",
            notes="Bonne source d'énergie, riche en amidon",
        )
        ble = FeedIngredient(
            name="Blé",
            category="céréale",
            protein_pct=12.5,
            fat_pct=2.0,
            carbs_pct=65.0,
            energy_index=3.12,
            digestion_speed="lent",
            notes="Apport en protéines végétales et fibres",
        )
        pois = FeedIngredient(
            name="Pois",
            category="légumineuse",
            protein_pct=22.0,
            fat_pct=1.5,
            carbs_pct=55.0,
            energy_index=3.20,
            digestion_speed="moyen",
            notes="Excellente source de protéines pour la récupération musculaire",
        )
        session.add_all([mais, ble, pois])
        await session.flush()

        # ── Mélange ───────────────────────────────────────────────────────────
        mix = FeedMix(
            name="Mélange entraînement",
            category="entraînement",
            description="Mélange équilibré énergie/protéines pour les jours d'entraînement",
        )
        session.add(mix)
        await session.flush()

        session.add_all([
            FeedMixIngredient(mix_id=mix.id, ingredient_id=mais.id, percentage=50.0),
            FeedMixIngredient(mix_id=mix.id, ingredient_id=ble.id, percentage=30.0),
            FeedMixIngredient(mix_id=mix.id, ingredient_id=pois.id, percentage=20.0),
        ])
        await session.flush()

        # ── Suppléments ───────────────────────────────────────────────────────
        vit_b = Supplement(
            name="Complexe Vitamines B",
            category="vitamines",
            usage_notes="Favorise le métabolisme énergétique et la récupération nerveuse",
            dosage="5 ml / litre d'eau, 3 fois par semaine",
        )
        electro = Supplement(
            name="Électrolytes Sport",
            category="minéraux",
            usage_notes="Réhydratation rapide après effort, maintien de l'équilibre hydrique",
            dosage="10 g / litre d'eau, jours d'entraînement",
        )
        session.add_all([vit_b, electro])
        await session.flush()

        # ── Séances d'entraînement ─────────────────────────────────────────────
        seance_loft = TrainingSession(
            date=date(2026, 5, 10),
            session_type=SessionType.loft,
            distance_km=None,
            weather="Ensoleillé",
            temperature_c=22.0,
            wind="Vent faible SO",
            notes="Vol libre au colombier, observation du comportement",
        )
        seance_toss = TrainingSession(
            date=date(2026, 5, 18),
            session_type=SessionType.toss,
            distance_km=25.0,
            weather="Couvert",
            temperature_c=18.5,
            wind="Calme",
            notes="Premier lâcher de la saison à 25 km",
        )
        session.add_all([seance_loft, seance_toss])
        await session.flush()

        # Récupérer 3 pigeons actifs pour associer des résultats
        r = await session.execute(
            select(Pigeon).where(Pigeon.statut == Statut.actif).limit(3)
        )
        pigeons_actifs = r.scalars().all()

        results = []
        for i, pigeon in enumerate(pigeons_actifs):
            results.append(PigeonTrainingResult(
                pigeon_id=pigeon.id,
                session_id=seance_loft.id,
                return_time_minutes=None,
                recovery_score=7 + i % 3,
                motivation_score=8,
                condition_score=7,
                hydration_score=8,
                notes="Comportement normal au loft",
            ))
            results.append(PigeonTrainingResult(
                pigeon_id=pigeon.id,
                session_id=seance_toss.id,
                return_time_minutes=38.5 + i * 2.0,
                internal_rank=i + 1,
                recovery_score=8 - i % 2,
                motivation_score=9,
                condition_score=8,
                hydration_score=7,
                notes=f"Retour en {38.5 + i * 2.0:.1f} min",
            ))
        session.add_all(results)

        # ── Plan nutritionnel ─────────────────────────────────────────────────
        plan = NutritionPlan(
            name="Plan entraînement intensif",
            category="entraînement",
            target_type="old",
            description="7 jours de nutrition optimisée pour la période d'entraînement pré-saison",
        )
        session.add(plan)
        await session.flush()

        # Lundi à dimanche (0-6)
        quantities = [40.0, 45.0, 45.0, 50.0, 45.0, 40.0, 35.0]
        for day, qty in enumerate(quantities):
            session.add(NutritionPlanDay(
                plan_id=plan.id,
                day_of_week=day,
                mix_id=mix.id,
                quantity_grams=qty,
                supplements="Vitamines B + Électrolytes" if day in (2, 4) else None,
            ))

        await session.commit()
        print(
            f"✅ Sport : 3 ingrédients, 1 mélange, 2 suppléments, "
            f"2 séances, {len(results)} résultats, 1 plan nutritionnel insérés"
        )


if __name__ == "__main__":
    async def main():
        await seed()
        await seed_sport()

    asyncio.run(main())
