"""
RetainEdge - Module 2: Data Preprocessing
==========================================
"""

import sys

import pandas as pd

from common import (
    DatasetError,
    inspect_dataset,
    print_inspection_report,
    detect_id_columns,
    detect_target_column,
    normalize_target, 
    try_fix_numeric_columns,
    save_metadata,
)

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
RAW_DATA_PATH = "data/raw_churn_data.csv"
CLEANED_DATA_PATH = "data/cleaned_churn_data.csv"
METADATA_PATH = "data/dataset_metadata.json"

# Optional overrides. Leave as None to let the pipeline auto-detect.
# Set TARGET_COLUMN_HINT if your target column has an unusual name that
# auto-detection can't recognise (e.g. "will_leave"). Set
# EXTRA_ID_COLUMNS for identifier columns that don't match the standard
# naming patterns (e.g. "acct_ref").
TARGET_COLUMN_HINT = None      # e.g. "will_leave"
EXTRA_ID_COLUMNS = []          # e.g. ["acct_ref"]


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[LOAD] Shape: {df.shape}")
    return df


def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    df = df.drop_duplicates()
    print(f"[DEDUPE] Removed {before - len(df)} duplicate rows")
    return df


def handle_missing_values(df: pd.DataFrame, exclude: list = None) -> pd.DataFrame:
    """Numeric columns -> median, categorical columns -> mode. `exclude`
    is normally the target column - it should never be imputed; rows
    with a missing label simply aren't usable for supervised training."""
    exclude = exclude or []
    df = df.copy()

    missing_before = df.isnull().sum().sum()
    print(f"[MISSING] Total missing values before handling: {missing_before}")
    if missing_before:
        print(df.isnull().sum()[df.isnull().sum() > 0])

    for col in df.columns:
        if col in exclude or df[col].isnull().sum() == 0:
            continue
        if pd.api.types.is_numeric_dtype(df[col]):
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            print(f"  -> filled '{col}' missing values with median={median_val}")
        else:
            mode_series = df[col].mode()
            if mode_series.empty:
                continue
            mode_val = mode_series[0]
            df[col] = df[col].fillna(mode_val)
            print(f"  -> filled '{col}' missing values with mode='{mode_val}'")

    missing_after = df.isnull().sum().sum()
    print(f"[MISSING] Total missing values after handling: {missing_after}")
    return df


def main():
    df = load_data(RAW_DATA_PATH)

    # 1. Inspect - raises DatasetError for empty / too-small datasets.
    info = inspect_dataset(df)
    print_inspection_report(info)

    df = remove_duplicates(df)

    # 2. Identify the target column before anything else touches it.
    target_col = detect_target_column(df, hint=TARGET_COLUMN_HINT)
    if target_col is None:
        raise DatasetError(
            "Could not confidently identify a churn/retention target column.\n"
            f"Columns available: {list(df.columns)}\n"
            "Please set TARGET_COLUMN_HINT at the top of M2_data_preprocessing.py "
            "to the name of the column that represents churn (e.g. 'Churn', "
            "'Exited', 'Cancelled', 'is_churn')."
        )
    print(f"[TARGET] Using target column: '{target_col}'")

    # Drop rows with a missing label - they can't be used for supervised training.
    n_missing_target = df[target_col].isnull().sum()
    if n_missing_target:
        print(f"[TARGET] Dropping {n_missing_target} rows with a missing target value")
        df = df.dropna(subset=[target_col])

    # 3. Identify and drop identifier columns (never predictive).
    id_cols = detect_id_columns(df)
    id_cols = [c for c in id_cols if c != target_col]
    id_cols += [c for c in EXTRA_ID_COLUMNS if c in df.columns and c not in id_cols]
    if id_cols:
        print(f"[ID] Detected identifier columns (dropped): {id_cols}")
        df = df.drop(columns=id_cols)
    else:
        print("[ID] No identifier columns detected")

    # 4. Auto-fix numeric columns that were read in as text (blank-string gotchas etc).
    df, fixed_cols = try_fix_numeric_columns(df, columns=[c for c in df.columns if c != target_col])
    if fixed_cols:
        print(f"[FIX] Coerced these object columns to numeric: {fixed_cols}")

    # 5. Handle missing values (target excluded - already handled above).
    df = handle_missing_values(df, exclude=[target_col])

    # 6. Normalize the target to a clean 0/1 label.
    normalized, mapping = normalize_target(df[target_col])
    df[target_col] = normalized
    if df[target_col].nunique() < 2:
        raise DatasetError(
            f"Target column '{target_col}' has only one class after normalization. "
            "A churn classifier needs both churned and non-churned examples."
        )
    churn_rate = df[target_col].mean() * 100
    print(f"[TARGET] Churn rate after normalization: {churn_rate:.2f}%")

    df.to_csv(CLEANED_DATA_PATH, index=False)

    metadata = {
        "target_column": target_col,
        "target_mapping": mapping,
        "id_columns_dropped": id_cols,
        "n_rows": int(df.shape[0]),
        "n_columns": int(df.shape[1]),
        "churn_rate_pct": round(float(churn_rate), 2),
    }
    save_metadata(metadata, METADATA_PATH)

    print(f"\n[DONE] Cleaned dataset saved to: {CLEANED_DATA_PATH}")
    print(f"[DONE] Metadata saved to: {METADATA_PATH}")
    print(f"[DONE] Final shape: {df.shape}")


if __name__ == "__main__":
    try:
        main()
    except DatasetError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1) 

#hhhbubub