import json
import re

import numpy as np
import pandas as pd


# ------------------------------------------------------------------
# Vocabulary used for auto-detection. Extend these lists if a new
# dataset uses column names / values that aren't covered yet.
# ------------------------------------------------------------------

# Common names for the churn / retention label column, across industries.
TARGET_NAME_CANDIDATES = [
    "churn", "churned", "is_churn", "ischurn", "churn_flag",
    "customer_churn", "target", "label",
    "exited", "attrition", "attrited",
    "cancelled", "canceled", "cancellation",
    "retention_status", "retained",
    "left", "left_company", "churn_status",
]

# Single tokens that, on their own, mean a column is an identifier
# (checked against the column name split into tokens - see _tokenize()).
ID_SINGLE_TOKENS = {"id", "uuid", "guid", "email", "ssn", "passport", "index"}


ID_TOKEN_PAIRS = [
    {"phone", "number"}, {"phone", "no"},
    {"mobile", "number"}, {"mobile", "no"},
    {"account", "number"}, {"account", "no"},
    {"customer", "no"}, 
]


TARGET_VALUE_MAPS = [
    {"yes": 1, "no": 0},
    {"true": 1, "false": 0},
    {"churned": 1, "active": 0},
    {"churned": 1, "retained": 0},
    {"churned": 1, "stayed": 0},
    {"churn": 1, "no churn": 0},
    {"cancelled": 1, "active": 0},
    {"canceled": 1, "active": 0},
    {"cancelled": 1, "not cancelled": 0},
    {"left": 1, "stayed": 0},
    {"left": 1, "retained": 0},
    {"exited": 1, "retained": 0},
    {"exited": 1, "stayed": 0},
    {"1": 1, "0": 0},
    {"attrited": 1, "existing": 0},
]

# Substrings that suggest a column is one of a customer's subscribed
# services / add-ons (used by M4's total_services feature).
SERVICE_NAME_KEYWORDS = [
    "service", "internet", "streaming", "protection", "support",
    "backup", "security", "addon", "add_on", "insurance",
]

# Common names for a "how long has this customer been with us" column.
TENURE_NAME_CANDIDATES = [
    "tenure", "tenure_months", "months", "months_active",
    "customer_since", "subscription_length", "account_age",
    "account_age_months", "days_active", "membership_length",
]

# Common names for recurring/periodic charge columns.
MONTHLY_CHARGE_CANDIDATES = [
    "monthlycharges", "monthly_charges", "monthly_charge",
    "monthly_amount", "monthly_fee", "monthly_spend",
    "subscription_price", "monthly_price", "plan_price",
]

# Common names for cumulative/lifetime charge columns.
TOTAL_CHARGE_CANDIDATES = [
    "totalcharges", "total_charges", "total_charge", "total_spend",
    "total_amount", "lifetime_value", "total_revenue", "total_billed",
]


class DatasetError(Exception):
    pass


# ------------------------------------------------------------------
# 1. Dataset inspection
# ------------------------------------------------------------------

def inspect_dataset(df: pd.DataFrame, min_rows: int = 20) -> dict:
    
    if df is None or df.shape[1] == 0:
        raise DatasetError("The uploaded file has no columns - is it a valid CSV?")
    if df.empty:
        raise DatasetError("The uploaded dataset is empty (0 rows).")
    if len(df) < min_rows:
        raise DatasetError(
            f"The dataset only has {len(df)} rows. At least {min_rows} rows are "
            "needed for a meaningful train/test split and model training."
        )

    info = {
        "n_rows": int(df.shape[0]),
        "n_columns": int(df.shape[1]),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "missing_values": df.isnull().sum().to_dict(),
        "missing_pct": (df.isnull().mean() * 100).round(2).to_dict(),
        "unique_values": df.nunique().to_dict(),
    }
    return info


def print_inspection_report(info: dict) -> None:
    print(f"[INSPECT] Rows: {info['n_rows']}, Columns: {info['n_columns']}")
    print("[INSPECT] Column dtypes and missing values:")
    for col in info["columns"]:
        miss = info["missing_values"][col]
        miss_pct = info["missing_pct"][col]
        uniq = info["unique_values"][col]
        flag = f"  <- {miss} missing ({miss_pct}%)" if miss > 0 else ""
        print(f"    {col:<30} {info['dtypes'][col]:<10} unique={uniq}{flag}")


# ------------------------------------------------------------------
# 2. Identifier-column detection
# ------------------------------------------------------------------

def _tokenize(name: str) -> list:
   
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)       # wordWord -> word_Word
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", s)       # ABCWord -> ABC_Word
    tokens = re.split(r"[^a-zA-Z0-9]+", s.lower())
    return [t for t in tokens if t]


def detect_id_columns(df: pd.DataFrame, max_unique_ratio: float = 0.95) -> list:
   
    id_cols = []
    n = len(df)
    for col in df.columns:
        name = col.lower().strip()
        tokens = _tokenize(col)
        token_set = set(tokens)

        is_id = False
        if name.startswith("unnamed"):
            is_id = True
        elif token_set & ID_SINGLE_TOKENS:
            is_id = True
        elif len(tokens) > 1 and tokens[-1] == "id":
            is_id = True
        elif any(pair <= token_set for pair in ID_TOKEN_PAIRS):
            is_id = True
        elif df[col].dtype == object and n > 0 and (df[col].nunique() / n) > max_unique_ratio:
            is_id = True

        if is_id:
            id_cols.append(col)
    return id_cols


# ------------------------------------------------------------------
# 3. Target column detection
# ------------------------------------------------------------------

def detect_target_column(df: pd.DataFrame, hint: str = None) -> str:
    
    if hint:
        if hint not in df.columns:
            raise DatasetError(
                f"Specified target column '{hint}' was not found. "
                f"Available columns: {list(df.columns)}"
            )
        return hint

    lower_map = {c.lower().strip(): c for c in df.columns}

    # Exact match against the known vocabulary first.
    for cand in TARGET_NAME_CANDIDATES:
        if cand in lower_map:
            return lower_map[cand]

    # Fall back to "column name contains a known term", but only if the
    # match is unambiguous - two matches means we genuinely don't know.
    contains_matches = []
    for low_name, orig_name in lower_map.items():
        if any(cand in low_name for cand in TARGET_NAME_CANDIDATES):
            contains_matches.append(orig_name)
    contains_matches = list(dict.fromkeys(contains_matches))

    if len(contains_matches) == 1:
        return contains_matches[0]

    return None  # ambiguous or not found - caller must ask the user


# ------------------------------------------------------------------
# 4. Target normalization (Yes/No, True/False, 1/0, ... -> 0/1)
# ------------------------------------------------------------------

def normalize_target(series: pd.Series):
   
    s = series.copy()

    if pd.api.types.is_numeric_dtype(s):
        uniques = sorted(pd.unique(s.dropna()))
        if len(uniques) < 2:
            raise DatasetError(
                f"Target column has only one distinct value ({uniques}). "
                "A churn model needs both churned and non-churned examples."
            )
        if set(uniques) == {0, 1}:
            return s.astype(int), {0: 0, 1: 1}
        if len(uniques) == 2:
            mapping = {uniques[0]: 0, uniques[1]: 1}
            print(f"[TARGET] Numeric target values {uniques} mapped to {mapping} "
                  f"(assuming the larger value means 'churned').")
            return s.map(mapping).astype(int), mapping
        raise DatasetError(
            f"Target column has {len(uniques)} distinct numeric values {uniques}; "
            "expected a binary (two-class) churn label. Unsupported target format."
        )

    # String / object target
    s_clean = s.astype(str).str.strip().str.lower()
    uniques = sorted(pd.unique(s_clean.dropna()))

    if len(uniques) < 2:
        raise DatasetError(
            f"Target column has only one distinct value ({uniques}) after cleaning. "
            "A churn model needs both churned and non-churned examples."
        )
    if len(uniques) > 2:
        raise DatasetError(
            f"Target column has {len(uniques)} distinct values {uniques} - expected "
            "exactly 2 for a binary churn label. Unsupported target format."
        )

    for mapping in TARGET_VALUE_MAPS:
        if set(uniques) <= set(mapping.keys()):
            result = s_clean.map(mapping)
            print(f"[TARGET] Values {uniques} recognised and mapped using {mapping}.")
            return result.astype(int), mapping

    # Unknown vocabulary: fall back to alphabetical ordering, but warn
    # loudly since we can't be sure which label means "churned".
    mapping = {uniques[0]: 0, uniques[1]: 1}
    print(f"[WARN] Target values {uniques} don't match a known churn vocabulary "
          f"(yes/no, true/false, churned/active, ...). Defaulting to alphabetical "
          f"mapping {mapping} - please verify that 1 corresponds to 'churned'.")
    return s_clean.map(mapping).astype(int), mapping


# ------------------------------------------------------------------
# 5. Numeric / categorical column detection
# ------------------------------------------------------------------

def detect_column_types(df: pd.DataFrame, target_col: str, id_cols: list,
                         high_cardinality_threshold: int = 50):
    """
    Splits feature columns into numeric, low/medium-cardinality
    categorical, and high-cardinality categorical (flagged so the
    caller can decide to drop or specially handle them).
    """
    exclude = set(id_cols) | {target_col}
    feature_cols = [c for c in df.columns if c not in exclude]

    numeric_cols, categorical_cols, high_card_cols = [], [], []
    n = len(df)
    for col in feature_cols:
        if pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)
        else:
            nunique = df[col].nunique(dropna=True)
            if nunique > high_cardinality_threshold or (n > 0 and nunique / n > 0.5):
                high_card_cols.append(col)
            else:
                categorical_cols.append(col)
    return numeric_cols, categorical_cols, high_card_cols


def try_fix_numeric_columns(df: pd.DataFrame, columns=None):
    """
    Auto-detects object columns that are "really" numeric but got read
    in as text (e.g. blank-string placeholders, like Telco's
    TotalCharges). A column is converted only if >90% of its non-null
    values parse cleanly as numbers, so genuine categorical columns
    aren't accidentally coerced.
    """
    df = df.copy()
    cols = columns if columns is not None else df.columns
    fixed = []
    for col in cols:
        if col not in df.columns or df[col].dtype != object:
            continue
        converted = pd.to_numeric(df[col].astype(str).str.strip(), errors="coerce")
        n_original_non_null = df[col].notna().sum()
        n_converted_non_null = converted.notna().sum()
        if n_original_non_null > 0 and (n_converted_non_null / n_original_non_null) > 0.9:
            df[col] = converted
            fixed.append(col)
    return df, fixed


# ------------------------------------------------------------------
# 6. Simple name-based column finder (used by M4 feature engineering)
# ------------------------------------------------------------------

def find_column(df: pd.DataFrame, candidates: list):
    """
    Returns the first column in df matching a candidate name, else None.
    Tries an exact (lowercased) match first, e.g. "tenure" == "tenure".
    Falls back to "column name contains candidate" so naming variants
    like "subscription_length_months" still match "subscription_length".
    """
    lower_map = {c.lower().strip(): c for c in df.columns}
    for cand in candidates:
        if cand in lower_map:
            return lower_map[cand]
    for cand in candidates:
        for low_name, orig_name in lower_map.items():
            if cand in low_name:
                return orig_name
    return None



# 7. Metadata persistence (keeps M2 -> M3 -> M4 -> M5 in sync)


def save_metadata(meta: dict, path: str) -> None:
    with open(path, "w") as f:
        json.dump(meta, f, indent=2, default=str)


def load_metadata(path: str) -> dict:
    with open(path) as f:
        return json.load(f)
