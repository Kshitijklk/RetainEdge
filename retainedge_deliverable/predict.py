"""
RetainEdge - Prediction

Usage:
    python predict.py path/to/customers.csv
"""

import argparse
import os
import subprocess
import sys
import io
from contextlib import redirect_stdout

import pandas as pd

from common import (
    DatasetError,
    try_fix_numeric_columns
)

from dataset_interpreter import (
    standardize_dataset
)

from model_registry import (
    select_model
)

import M4_feature_engineering as m4

from M7_shap_explainability import (
    run_shap
)

from M8_recommendations import (
    run_recommendations
)


REGISTRY_PATH = (
    "outputs/models/model_registry.pkl"
)


TRAINING_STEPS = [
    "M2_data_preprocessing.py",
    "M3_eda_analysis.py",
    "M4_feature_engineering.py",
    "M5_model_development.py"
]


def run_training_pipeline():

    for step in TRAINING_STEPS:

        result = subprocess.run(
            [sys.executable, step],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        if result.returncode != 0:

            raise DatasetError(
                f"{step} failed."
            )


def interpret_dataset(raw_df):

    try:

        with redirect_stdout(
            io.StringIO()
        ):

            interpreted = standardize_dataset(
                raw_df
            )

        if isinstance(
            interpreted,
            tuple
        ):

            df = interpreted[0]

        else:

            df = interpreted

        if not isinstance(
            df,
            pd.DataFrame
        ):

            raise DatasetError(
                "Dataset interpreter did not "
                "return a DataFrame."
            )

        return df

    except Exception as e:

        raise DatasetError(
            "Dataset interpretation failed: "
            f"{e}"
        )


def apply_feature_engineering(df):

    with redirect_stdout(
        io.StringIO()
    ):

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


def predict(
    df,
    bundle
):

    pipeline = bundle[
        "pipeline"
    ]

    feature_columns = bundle[
        "feature_columns"
    ]

    missing = [
        column
        for column in feature_columns
        if column not in df.columns
    ]

    if missing:

        raise DatasetError(
            "Selected model requires "
            f"missing features: {missing}"
        )

    X = df[
        feature_columns
    ]

    probabilities = pipeline.predict_proba(
        X
    )[:, 1]

    predictions = pipeline.predict(
        X
    )

    risk = pd.cut(
        probabilities,
        bins=[
            -0.01,
            0.30,
            0.60,
            1.0
        ],
        labels=[
            "Low",
            "Medium",
            "High"
        ]
    )

    if "CustomerID" in df.columns:

        customer_ids = (
            df["CustomerID"].values
        )

    else:

        customer_ids = range(
            1,
            len(df) + 1
        )

    result = pd.DataFrame({

        "CustomerID":
            customer_ids,

        "churn_probability":
            (
                probabilities * 100
            ).round(2),

        "churn_prediction":
            predictions,

        "churn_risk":
            risk.astype(str)

    })

    return result


def print_churn_predictions(
    prediction_result
):

    print(
        "\nCHURN PREDICTIONS"
    )

    print(
        "-----------------"
    )

    risk_counts = (
        prediction_result[
            "churn_risk"
        ].value_counts()
    )

    total = len(
        prediction_result
    )

    for risk in [
        "High",
        "Medium",
        "Low"
    ]:

        count = risk_counts.get(
            risk,
            0
        )

        percentage = (
            count /
            total *
            100
        )

        print(
            f"{risk}: "
            f"{count} "
            f"({percentage:.2f}%)"
        )


def print_shap_divisions(
    shap_result
):

    print(
        "\nSHAP CHURN REASONS"
    )

    print(
        "------------------"
    )

    reason_counts = (
        shap_result[
            "primary_churn_reason"
        ].value_counts()
    )

    total = len(
        shap_result
    )

    for reason, count in (
        reason_counts.items()
    ):

        percentage = (
            count /
            total *
            100
        )

        print(
            f"{reason}: "
            f"{count} "
            f"({percentage:.2f}%)"
        )


def print_recommendations(
    recommendation_data
):

    print(
        "\nRETENTION RECOMMENDATIONS"
    )

    print(
        "-------------------------"
    )

    recommendations = (
        recommendation_data[
            "retention_recommendation"
        ]
    )

    counts = (
        recommendations.value_counts()
    )

    total = len(
        recommendations
    )

    for recommendation, count in (
        counts.items()
    ):

        percentage = (
            count /
            total *
            100
        )

        print(
            f"{recommendation}: "
            f"{count} "
            f"({percentage:.2f}%)"
        )


def main():

    parser = argparse.ArgumentParser(
        description=(
            "RetainEdge churn prediction"
        )
    )

    parser.add_argument(
        "csv_path"
    )

    parser.add_argument(
        "--out",
        default=None
    )

    args = parser.parse_args()

    # Train models automatically if registry
    # does not exist.
    if not os.path.exists(
        REGISTRY_PATH
    ):

        run_training_pipeline()

    # Load dataset.
    raw_df = pd.read_csv(
        args.csv_path
    )

    # Interpret dataset columns.
    df = interpret_dataset(
        raw_df
    )

    # Apply feature engineering.
    df = apply_feature_engineering(
        df
    )

    # Select compatible model.
    try:

        model_name, bundle = select_model(
            df.columns
        )

    except Exception as e:

        raise DatasetError(
            f"Model selection failed: {e}"
        )

    # Generate predictions.
    prediction_result = predict(
        df,
        bundle
    )

    # Display only churn prediction results.
    print_churn_predictions(
        prediction_result
    )

    # Generate SHAP explanations.
    shap_result = run_shap(
        df,
        bundle
    )

    # Display only SHAP divisions.
    print_shap_divisions(
        shap_result
    )

    # Combine data for recommendations.
    recommendation_data = pd.concat(
        [
            df.reset_index(
                drop=True
            ),

            prediction_result.reset_index(
                drop=True
            ),

            shap_result.reset_index(
                drop=True
            )
        ],
        axis=1
    )

    # Generate recommendations.
    recommendation_data = (
        run_recommendations(
            recommendation_data
        )
    )

    # Display only recommendations.
    print_recommendations(
        recommendation_data
    )

    # Final prediction output.
    final_result = pd.concat(
        [
            prediction_result,
            shap_result
        ],
        axis=1
    )

    # Output path.
    out_path = (
        args.out
        or
        args.csv_path.rsplit(
            ".",
            1
        )[0]
        + "_predictions.csv"
    )

    final_result.to_csv(
        out_path,
        index=False
    )


if __name__ == "__main__":

    try:

        main()

    except DatasetError as e:

        print(
            f"[ERROR] {e}"
        )

        sys.exit(1)

    except Exception as e:

        print(
            f"[ERROR] {e}"
        )

        sys.exit(1)