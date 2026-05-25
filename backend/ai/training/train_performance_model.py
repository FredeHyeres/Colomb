"""
Placeholder — modèle de classification de performance.
À entraîner quand suffisamment de snapshots disponibles (>= 100).

Features: training_load_7d, training_load_30d, recovery_avg_7d, condition_avg_7d,
          hydration_avg_7d, average_temperature, regularity_index, recovery_index
Target: performance_label (excellent / good / average / poor)
"""

import os

FEATURES = [
    "training_load_7d",
    "training_load_30d",
    "recovery_avg_7d",
    "condition_avg_7d",
    "hydration_avg_7d",
    "average_temperature",
    "regularity_index",
    "recovery_index",
]
TARGET = "performance_label"
CLASSES = ["excellent", "good", "average", "poor"]
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "performance_model.joblib")


def train(df) -> None:
    """
    Entraîne un RandomForestClassifier pour prédire le label de performance.
    df = DataFrame pandas avec les colonnes FEATURES + TARGET.
    Nécessite : pandas, scikit-learn, joblib.
    À activer quand >= 100 snapshots disponibles.
    """
    # from sklearn.ensemble import RandomForestClassifier
    # from sklearn.model_selection import train_test_split
    # from sklearn.metrics import classification_report
    # import joblib
    # import pandas as pd
    #
    # X = df[FEATURES].fillna(df[FEATURES].median())
    # y = df[TARGET]
    #
    # X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    #
    # model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight="balanced")
    # model.fit(X_train, y_train)
    #
    # print(classification_report(y_test, model.predict(X_test)))
    #
    # os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    # joblib.dump(model, MODEL_PATH)
    raise NotImplementedError("Activer quand >= 100 snapshots disponibles")


def predict(features_dict: dict) -> str:
    """
    Charge le modèle joblib et prédit le label de performance pour un pigeon.
    Retourne une des valeurs : excellent / good / average / poor.
    features_dict doit contenir les clés de FEATURES.
    """
    # import joblib
    # import pandas as pd
    #
    # if not os.path.exists(MODEL_PATH):
    #     raise FileNotFoundError(f"Modèle introuvable : {MODEL_PATH}")
    #
    # model = joblib.load(MODEL_PATH)
    # df = pd.DataFrame([features_dict])[FEATURES]
    # return str(model.predict(df)[0])
    raise NotImplementedError("Modèle non encore entraîné")
