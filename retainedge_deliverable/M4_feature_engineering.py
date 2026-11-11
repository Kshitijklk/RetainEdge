"""
RetainEdge - Module 4: Feature Engineering
============================================
"""

import sys

import numpy as np
import pandas as pd

from common import (
    DatasetError,
    load_metadata,
    find_column,
    TENURE_NAME_CANDIDATES,
    MONTHLY_CHARGE_CANDIDATES,
    TOTAL_CHARGE_CANDIDATES,
    SERVICE_NAME_KEYWORDS,
)

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
INPUT_PATH = "data/cleaned_churn_data.csv"
OUTPUT_PATH = "data/features_churn_data.csv"
METADATA_PATH = "data/dataset_metadata.json"


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[LOAD] Shape: {df.shape}")
    return df


def add_tenure_groups(df: pd.DataFrame) -> pd.DataFrame:
    """Buckets a tenure-like column into lifecycle stages - captures
    non-linear churn risk that a raw tenure number doesn't."""
    tenure_col = find_column(df, TENURE_NAME_CANDIDATES)
    if tenure_col is None or not pd.api.types.is_numeric_dtype(df[tenure_col]):
        print("[SKIP] No numeric tenure-like column found - skipping tenure_group")
        return df

    max_val = df[tenure_col].max()
    bins = [-np.inf, 12, 24, 48, 60, np.inf]
    labels = ["0-1yr", "1-2yr", "2-4yr", "4-5yr", "5yr+"]
    df["tenure_group"] = pd.cut(df[tenure_col], bins=bins, labels=labels)
    print(f"[FEATURE] Added tenure_group (from '{tenure_col}', max value seen: {max_val})")
    return df


def add_total_services_count(df: pd.DataFrame) -> pd.DataFrame:
   
    candidate_cols = [c for c in df.columns if any(kw in c.lower() for kw in SERVICE_NAME_KEYWORDS)]
    # Only count columns that look binary/near-binary (e.g. Yes/No/"No internet service")
    service_cols = [c for c in candidate_cols if df[c].nunique(dropna=True) <= 4]

    if not service_cols:
        print("[SKIP] No service-like columns found - skipping total_services")
        return df

    positive_values = {"yes", "1", "true", "y"}

    def count_row(row):
        count = 0
        for c in service_cols:
            val = str(row[c]).strip().lower()
            if val in positive_values:
                count += 1
        return count

    df["total_services"] = df[service_cols].apply(count_row, axis=1)
    print(f"[FEATURE] Added total_services (from {len(service_cols)} columns: {service_cols})")
    return df


def add_billing_features(df: pd.DataFrame) -> pd.DataFrame:
    """Derives billing-behavior ratios from monthly / total charge /
    tenure-like columns, if all three are present and numeric."""
    monthly_col = find_column(df, MONTHLY_CHARGE_CANDIDATES)
    total_col = find_column(df, TOTAL_CHARGE_CANDIDATES)
    tenure_col = find_column(df, TENURE_NAME_CANDIDATES)

    have_all = monthly_col and total_col and tenure_col
    all_numeric = have_all and all(
        pd.api.types.is_numeric_dtype(df[c]) for c in [monthly_col, total_col, tenure_col]
    )

    if not all_numeric:
        print("[SKIP] Monthly/total charge + tenure columns not all present - skipping billing features")
        return df

    df["avg_monthly_spend"] = df[total_col] / df[tenure_col].replace(0, 1)
    print(f"[FEATURE] Added avg_monthly_spend ({total_col} / {tenure_col})")

    df["charge_ratio"] = df[monthly_col] / (df[total_col] + 1)
    print(f"[FEATURE] Added charge_ratio ({monthly_col} / {total_col})")

    return df


def add_high_value_flag(df: pd.DataFrame) -> pd.DataFrame:
    """Flags customers in the top 25% by recurring spend - a common
    retention-priority segment - if a monthly-charge-like column exists."""
    monthly_col = find_column(df, MONTHLY_CHARGE_CANDIDATES)
    if monthly_col is None or not pd.api.types.is_numeric_dtype(df[monthly_col]):
        print("[SKIP] No monthly-charge-like column found - skipping is_high_value_customer")
        return df

    threshold = df[monthly_col].quantile(0.75)
    df["is_high_value_customer"] = (df[monthly_col] >= threshold).astype(int)
    print(f"[FEATURE] Added is_high_value_customer (from '{monthly_col}', threshold={threshold:.2f})")
    return df


def main():
    df = load_data(INPUT_PATH)

    df = add_tenure_groups(df)
    df = add_total_services_count(df)
    df = add_billing_features(df)
    df = add_high_value_flag(df)

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"\n[DONE] Feature-engineered dataset saved to: {OUTPUT_PATH}")
    print(f"[DONE] Final shape: {df.shape}")
    print(f"[DONE] Columns: {list(df.columns)}")


if __name__ == "__main__":
    try:
        main()
    except DatasetError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
