"""
RetainEdge - Model Registry

Automatically selects the XGBoost model
compatible with the available dataset features.
"""

import os
import joblib


REGISTRY_PATH = "outputs/models/model_registry.pkl"


def load_registry():

    if not os.path.exists(REGISTRY_PATH):
        raise FileNotFoundError(
            "Model registry not found."
        )

    return joblib.load(
        REGISTRY_PATH
    )


def get_compatible_models(
    available_features
):

    registry = load_registry()

    available = set(
        available_features
    )

    compatible = []

    for model_name, bundle in registry.items():

        required_features = set(
            bundle["feature_columns"]
        )

        if required_features.issubset(
            available
        ):

            compatible.append(
                {
                    "model_name": model_name,
                    "bundle": bundle,
                    "feature_count": len(
                        required_features
                    )
                }
            )

    return compatible


def select_model(
    available_features
):

    compatible = get_compatible_models(
        available_features
    )

    if not compatible:

        raise ValueError(
            "No compatible RetainEdge model "
            "was found for the available "
            "dataset features."
        )

    compatible.sort(
        key=lambda item: item[
            "feature_count"
        ],
        reverse=True
    )

    selected = compatible[0]

    return (
        selected["model_name"],
        selected["bundle"]
    )


def get_model_information(
    available_features
):

    compatible = get_compatible_models(
        available_features
    )

    compatible.sort(
        key=lambda item: item[
            "feature_count"
        ],
        reverse=True
    )

    information = []

    for item in compatible:

        bundle = item["bundle"]

        information.append(
            {
                "model_name": item[
                    "model_name"
                ],
                "feature_count": item[
                    "feature_count"
                ],
                "features": bundle[
                    "feature_columns"
                ],
                "metrics": bundle.get(
                    "metrics",
                    {}
                )
            }
        )

    return information


def print_model_selection(
    model_name,
    bundle
):

    features = bundle[
        "feature_columns"
    ]

    print(
        "\n[MODEL REGISTRY]"
    )

    print(
        f"Selected model: {model_name}"
    )

    print(
        "Model type: XGBoost"
    )

    print(
        f"Features used: {len(features)}"
    )

    print(
        "Features:"
    )

    for feature in features:
        print(
            f"- {feature}"
        )


if __name__ == "__main__":

    example_features = [
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

    model_name, bundle = select_model(
        example_features
    )

    print_model_selection(
        model_name,
        bundle
    )