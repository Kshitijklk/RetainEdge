"""
RetainEdge - Module 7: SHAP Explainability
"""

import os
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from common import try_fix_numeric_columns
import M4_feature_engineering as m4


DEFAULT_MODEL_PATH = "outputs/models/best_model.pkl"


def apply_feature_engineering(df):

    df, _ = try_fix_numeric_columns(
        df
    )

    if "Tenure" in df.columns:
        df = m4.add_tenure_groups(
            df
        )

    if "Usage Frequency" in df.columns:
        df = m4.add_total_services_count(
            df
        )

    if "Total Spend" in df.columns:
        df = m4.add_billing_features(
            df
        )

    if "Total Spend" in df.columns:
        df = m4.add_high_value_flag(
            df
        )

    return df


def load_model(
    model_path=DEFAULT_MODEL_PATH
):

    if not os.path.exists(
        model_path
    ):
        raise FileNotFoundError(
            f"Model not found: {model_path}"
        )

    bundle = joblib.load(
        model_path
    )

    if bundle.get(
        "model_name"
    ) != "XGBoost":

        raise ValueError(
            "M7 requires an XGBoost model."
        )

    return bundle


def prepare_data(
    df,
    bundle
):

    feature_columns = bundle[
        "feature_columns"
    ]

    pipeline = bundle[
        "pipeline"
    ]

    missing = [
        column
        for column in feature_columns
        if column not in df.columns
    ]

    if missing:

        raise ValueError(
            "Missing required model features: "
            f"{missing}"
        )

    X = df[
        feature_columns
    ]

    preprocess = pipeline.named_steps[
        "preprocess"
    ]

    classifier = pipeline.named_steps[
        "classifier"
    ]

    X_processed = preprocess.transform(
        X
    )

    try:

        feature_names = list(
            preprocess.get_feature_names_out()
        )

    except Exception:

        feature_names = [
            f"feature_{i}"
            for i in range(
                X_processed.shape[1]
            )
        ]

    return (
        X_processed,
        classifier,
        feature_names
    )


def get_original_feature_name(
    encoded_name,
    original_features
):

    name = encoded_name

    if "__" in name:

        name = name.split(
            "__",
            1
        )[1]

    for feature in sorted(
        original_features,
        key=len,
        reverse=True
    ):

        if name == feature:
            return feature

        if name.startswith(
            feature + "_"
        ):

            return feature

    return name


def aggregate_shap_values(
    shap_values,
    encoded_feature_names,
    original_features
):

    aggregated = np.zeros(
        (
            shap_values.shape[0],
            len(original_features)
        )
    )

    feature_map = {}

    for index, encoded_name in enumerate(
        encoded_feature_names
    ):

        original_name = (
            get_original_feature_name(
                encoded_name,
                original_features
            )
        )

        feature_map.setdefault(
            original_name,
            []
        ).append(
            index
        )

    for feature_index, feature_name in enumerate(
        original_features
    ):

        indices = feature_map.get(
            feature_name,
            []
        )

        if indices:

            aggregated[
                :,
                feature_index
            ] = shap_values[
                :,
                indices
            ].sum(
                axis=1
            )

    return aggregated


def calculate_shap(
    X_processed,
    classifier
):

    booster = classifier.get_booster()

    dmatrix = xgb.DMatrix(
        X_processed
    )

    shap_values = booster.predict(
        dmatrix,
        pred_contribs=True
    )

    # Last column is the base value.
    shap_values = shap_values[
        :,
        :-1
    ]

    return shap_values


def get_customer_reasons(
    shap_values,
    feature_names
):

    # Select the feature with the
    # maximum SHAP contribution.
    top_indices = np.argmax(
        shap_values,
        axis=1
    )

    top_values = shap_values[
        np.arange(
            len(shap_values)
        ),
        top_indices
    ]

    reasons = [
        feature_names[index]
        for index in top_indices
    ]

    return pd.DataFrame({
        "primary_churn_reason": reasons,
        "shap_value": np.round(
            top_values,
            6
        )
    })


def run_shap(
    df,
    bundle
):

    (
        X_processed,
        classifier,
        encoded_feature_names
    ) = prepare_data(
        df,
        bundle
    )

    shap_values = calculate_shap(
        X_processed,
        classifier
    )

    original_features = bundle[
        "feature_columns"
    ]

    aggregated_shap = (
        aggregate_shap_values(
            shap_values,
            encoded_feature_names,
            original_features
        )
    )

    return get_customer_reasons(
        aggregated_shap,
        original_features
    )


if __name__ == "__main__":

    import sys

    if len(sys.argv) < 2:

        print(
            "Usage: python "
            "M7_shap_explainability.py "
            "path/to/dataset.csv"
        )

        sys.exit(1)

    csv_path = sys.argv[1]

    bundle = load_model()

    df = pd.read_csv(
        csv_path
    )

    df = apply_feature_engineering(
        df
    )

    reasons = run_shap(
        df,
        bundle
    )

    print(
        reasons.head()
    )