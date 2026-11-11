"""
RetainEdge - Module 5: XGBoost Model Development
"""

import os
import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)
from xgboost import XGBClassifier


DATA_PATH = "data/raw_churn_data.csv"
MODEL_DIR = "outputs/models"


BASE_FEATURES = [
    "Age",
    "Gender",
    "Tenure",
    "Usage Frequency",
    "Support Calls",
    "Payment Delay",
    "Subscription Type",
    "Contract Length",
    "Total Spend",
    "Last Interaction"
]


MODEL_FEATURE_SETS = {
    "model_10": [
        "Age",
        "Gender",
        "Tenure",
        "Usage Frequency",
        "Support Calls",
        "Payment Delay",
        "Subscription Type",
        "Contract Length",
        "Total Spend",
        "Last Interaction"
    ],

    "model_9": [
        "Age",
        "Gender",
        "Tenure",
        "Usage Frequency",
        "Support Calls",
        "Payment Delay",
        "Subscription Type",
        "Contract Length",
        "Total Spend"
    ],

    "model_8": [
        "Tenure",
        "Usage Frequency",
        "Support Calls",
        "Payment Delay",
        "Subscription Type",
        "Contract Length",
        "Total Spend",
        "Last Interaction"
    ],

    "model_7": [
        "Tenure",
        "Usage Frequency",
        "Support Calls",
        "Payment Delay",
        "Subscription Type",
        "Contract Length",
        "Total Spend"
    ],

    "model_6": [
        "Tenure",
        "Usage Frequency",
        "Support Calls",
        "Payment Delay",
        "Subscription Type",
        "Total Spend"
    ]
}


def build_pipeline(X):

    numeric_features = X.select_dtypes(
        include=["number"]
    ).columns.tolist()

    categorical_features = X.select_dtypes(
        exclude=["number"]
    ).columns.tolist()

    numeric_pipeline = Pipeline([
        (
            "imputer",
            SimpleImputer(
                strategy="median"
            )
        )
    ])

    categorical_pipeline = Pipeline([
        (
            "imputer",
            SimpleImputer(
                strategy="most_frequent"
            )
        ),
        (
            "onehot",
            OneHotEncoder(
                handle_unknown="ignore"
            )
        )
    ])

    transformers = []

    if numeric_features:

        transformers.append(
            (
                "num",
                numeric_pipeline,
                numeric_features
            )
        )

    if categorical_features:

        transformers.append(
            (
                "cat",
                categorical_pipeline,
                categorical_features
            )
        )

    preprocess = ColumnTransformer(
        transformers=transformers
    )

    classifier = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1
    )

    return Pipeline([
        (
            "preprocess",
            preprocess
        ),
        (
            "classifier",
            classifier
        )
    ])


def train_model(
    df,
    model_name,
    feature_columns
):

    missing = [
        feature
        for feature in feature_columns
        if feature not in df.columns
    ]

    if missing:

        print(
            f"[SKIP] {model_name} "
            f"missing: {missing}"
        )

        return None

    X = df[
        feature_columns
    ]

    y = df["Churn"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    pipeline = build_pipeline(
        X_train
    )

    pipeline.fit(
        X_train,
        y_train
    )

    predictions = pipeline.predict(
        X_test
    )

    probabilities = pipeline.predict_proba(
        X_test
    )[:, 1]

    metrics = {
        "accuracy": accuracy_score(
            y_test,
            predictions
        ),

        "precision": precision_score(
            y_test,
            predictions,
            zero_division=0
        ),

        "recall": recall_score(
            y_test,
            predictions,
            zero_division=0
        ),

        "f1": f1_score(
            y_test,
            predictions,
            zero_division=0
        ),

        "roc_auc": roc_auc_score(
            y_test,
            probabilities
        )
    }

    bundle = {
        "model_name": "XGBoost",
        "variant": model_name,
        "pipeline": pipeline,
        "feature_columns": feature_columns,
        "metrics": metrics
    }

    output_path = os.path.join(
        MODEL_DIR,
        f"{model_name}.pkl"
    )

    joblib.dump(
        bundle,
        output_path
    )

    print(
        f"[SAVED] {model_name}"
    )

    return bundle


def main():

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    df = pd.read_csv(
        DATA_PATH
    )

    if "Churn" not in df.columns:

        raise ValueError(
            "Training dataset must contain Churn."
        )

    # Remove training rows where the target label is missing.
    # We do not impute Churn because its true value is unknown.
    df = df.dropna(
        subset=["Churn"]
    )

    trained_models = {}

    for model_name, features in MODEL_FEATURE_SETS.items():

        print(
            f"\n[TRAINING] {model_name}"
        )

        bundle = train_model(
            df,
            model_name,
            features
        )

        if bundle is not None:

            trained_models[
                model_name
            ] = bundle

    registry_path = os.path.join(
        MODEL_DIR,
        "model_registry.pkl"
    )

    joblib.dump(
        trained_models,
        registry_path
    )

    if "model_10" in trained_models:

        joblib.dump(
            trained_models["model_10"],
            os.path.join(
                MODEL_DIR,
                "best_model.pkl"
            )
        )

    print(
        "\n[DONE] All XGBoost models trained."
    )

    print(
        f"Models available: "
        f"{len(trained_models)}"
    )


if __name__ == "__main__":
    main()