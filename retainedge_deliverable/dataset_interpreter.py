"""
RetainEdge - Dataset Interpreter

Converts different company dataset column names
into the RetainEdge standard column names.
"""

import difflib
import re

import pandas as pd


# RetainEdge standard features
CANONICAL_FEATURES = [
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


# Alternative column names that companies may use
ALIASES = {
    "CustomerID": [
        "customerid",
        "customer_id",
        "customer id",
        "customer number",
        "customer_number",
        "clientid",
        "client_id",
        "userid",
        "user_id"
    ],

    "Age": [
        "age",
        "customer_age",
        "customer age",
        "client_age",
        "client age"
    ],

    "Gender": [
        "gender",
        "sex",
        "customer_gender",
        "customer gender",
        "client_gender",
        "client gender"
    ],

    "Tenure": [
        "tenure",
        "tenure_months",
        "tenure months",
        "months_active",
        "months active",
        "months_with_company",
        "months with company",
        "customer_tenure"
    ],

    "Usage Frequency": [
        "usage_frequency",
        "usage frequency",
        "usage_count",
        "usage count",
        "monthly_usage_count",
        "monthly usage count",
        "monthly_usage",
        "monthly usage"
    ],

    "Support Calls": [
        "support_calls",
        "support calls",
        "support_tickets",
        "support tickets",
        "support_tickets_raised",
        "support tickets raised",
        "customer_support_calls",
        "customer support calls"
    ],

    "Payment Delay": [
        "payment_delay",
        "payment delay",
        "payment_delay_days",
        "payment delay days",
        "late_payment_days",
        "late payment days",
        "days_late",
        "days late"
    ],

    "Subscription Type": [
        "subscription_type",
        "subscription type",
        "subscription",
        "plan",
        "plan_type",
        "plan type",
        "membership_type",
        "membership type"
    ],

    "Contract Length": [
        "contract_length",
        "contract length",
        "contract_duration",
        "contract duration",
        "contract_term",
        "contract term",
        "contract_months",
        "contract months"
    ],

    "Total Spend": [
        "total_spend",
        "total spend",
        "total_spend_usd",
        "total spend usd",
        "lifetime_value",
        "lifetime value",
        "customer_value",
        "customer value",
        "revenue",
        "total_revenue",
        "total revenue"
    ],

    "Last Interaction": [
        "last_interaction",
        "last interaction",
        "days_since_last_interaction",
        "days since last interaction",
        "days_since_last_contact",
        "days since last contact",
        "last_contact",
        "last contact"
    ],

    "Churn": [
        "churn",
        "churned",
        "customer_churn",
        "customer churn",
        "churn_status",
        "churn status"
    ]
}


def normalize_column_name(name):
    """
    Converts a column name into a normalized format
    for comparison.
    """

    name = str(name).strip().lower()

    name = re.sub(
        r"[^a-z0-9]+",
        " ",
        name
    )

    return name.strip()


def build_alias_lookup():
    """
    Creates a normalized alias lookup table.
    """

    lookup = {}

    for canonical, aliases in ALIASES.items():

        lookup[
            normalize_column_name(canonical)
        ] = canonical

        for alias in aliases:
            lookup[
                normalize_column_name(alias)
            ] = canonical

    return lookup


ALIAS_LOOKUP = build_alias_lookup()


def find_canonical_column(column):
    """
    Attempts to identify the RetainEdge feature
    represented by a company column.
    """

    normalized = normalize_column_name(
        column
    )

    # Exact match
    if normalized in ALIAS_LOOKUP:
        return ALIAS_LOOKUP[normalized]

    # Fuzzy match
    candidates = list(
        ALIAS_LOOKUP.keys()
    )

    matches = difflib.get_close_matches(
        normalized,
        candidates,
        n=1,
        cutoff=0.85
    )

    if matches:
        return ALIAS_LOOKUP[
            matches[0]
        ]

    return None


def standardize_dataset(df):
    """
    Converts a company dataset into the
    RetainEdge standard schema.

    Missing features are NOT artificially created.

    This is important because later the model
    registry will select a model based on the
    features actually available in the dataset.

    Returns:
        standardized_df
        mapping
        missing_features
        unmatched_columns
    """

    if not isinstance(
        df,
        pd.DataFrame
    ):
        raise TypeError(
            "Input must be a pandas DataFrame."
        )

    standardized = df.copy()

    mapping = {}
    unmatched_columns = []

    rename_map = {}

    for column in df.columns:

        canonical = find_canonical_column(
            column
        )

        if canonical is None:
            unmatched_columns.append(
                column
            )
            continue

        # Avoid duplicate canonical columns
        if canonical in rename_map.values():

            # Keep the first recognized column
            unmatched_columns.append(
                column
            )
            continue

        rename_map[column] = canonical

        mapping[column] = canonical

    standardized = standardized.rename(
        columns=rename_map
    )

    # Features that are not available
    missing_features = [
        feature
        for feature in CANONICAL_FEATURES
        if feature not in standardized.columns
    ]

    return (
        standardized,
        mapping,
        missing_features,
        unmatched_columns
    )


def print_interpretation_summary(
    mapping,
    missing_features,
    unmatched_columns
):
    """
    Prints a simple interpretation summary.
    """

    print(
        "\n[DATASET INTERPRETER]"
    )

    print(
        f"Mapped columns: {len(mapping)}"
    )

    if missing_features:
        print(
            "\nMissing RetainEdge features:"
        )

        for feature in missing_features:
            print(
                f"- {feature}"
            )

    if unmatched_columns:
        print(
            "\nUnmatched columns:"
        )

        for column in unmatched_columns:
            print(
                f"- {column}"
            )


if __name__ == "__main__":

    import sys

    if len(sys.argv) < 2:
        print(
            "Usage: python "
            "dataset_interpreter.py "
            "path/to/dataset.csv"
        )
        sys.exit(1)

    csv_path = sys.argv[1]

    df = pd.read_csv(
        csv_path
    )

    (
        standardized,
        mapping,
        missing_features,
        unmatched_columns
    ) = standardize_dataset(
        df
    )

    print_interpretation_summary(
        mapping,
        missing_features,
        unmatched_columns
    )

    print(
        "\nStandardized columns:"
    )

    for column in standardized.columns:
        print(
            f"- {column}"
        )