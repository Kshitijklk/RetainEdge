"""
RetainEdge - Module 3: EDA & Data Analysis
============================================
"""

import os
import sys

import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from common import DatasetError, load_metadata

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------
CLEANED_DATA_PATH = "data/cleaned_churn_data.csv"
METADATA_PATH = "data/dataset_metadata.json"
OUTPUT_DIR = "outputs/eda"

sns.set_theme(style="whitegrid")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    print(f"[LOAD] Shape: {df.shape}")
    return df


def basic_summary(df: pd.DataFrame, target_col: str):
    print("=" * 60)
    print("BASIC DATASET SUMMARY")
    print("=" * 60)
    print(f"Shape: {df.shape}")
    print("\nColumn dtypes:\n", df.dtypes)
    print("\nDescriptive statistics (numeric):\n", df.describe())

    if target_col in df.columns:
        churn_rate = df[target_col].value_counts(normalize=True) * 100
        print(f"\nChurn distribution (%) for '{target_col}':\n{churn_rate}")


def plot_churn_distribution(df: pd.DataFrame, target_col: str):
    plt.figure(figsize=(5, 4))
    sns.countplot(data=df, x=target_col, hue=target_col, palette="Set2", legend=False)
    plt.title(f"Overall {target_col} Distribution")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/01_churn_distribution.png")
    plt.close()


def plot_numeric_distributions(df: pd.DataFrame, target_col: str):
    numeric_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
    numeric_cols = [c for c in numeric_cols if c != target_col]

    n = len(numeric_cols)
    if n == 0:
        print("[SKIP] No numeric columns to plot")
        return
    fig, axes = plt.subplots(1, n, figsize=(5 * n, 4))
    if n == 1:
        axes = [axes]
    for ax, col in zip(axes, numeric_cols):
        sns.histplot(data=df, x=col, hue=target_col, kde=True, ax=ax, multiple="stack")
        ax.set_title(f"{col} distribution by {target_col}")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/02_numeric_distributions.png")
    plt.close()


def plot_categorical_vs_churn(df: pd.DataFrame, target_col: str, max_cols=6):
    categorical_cols = [c for c in df.columns if not pd.api.types.is_numeric_dtype(df[c])]
    categorical_cols = [c for c in categorical_cols if c != target_col]
    categorical_cols = categorical_cols[:max_cols]  # keep plot readable

    n = len(categorical_cols)
    if n == 0:
        print("[SKIP] No categorical columns to plot")
        return
    cols_per_row = 3
    rows = (n + cols_per_row - 1) // cols_per_row
    fig, axes = plt.subplots(rows, cols_per_row, figsize=(6 * cols_per_row, 5 * rows))
    axes = axes.flatten() if n > 1 else [axes]

    for ax, col in zip(axes, categorical_cols):
        sns.countplot(data=df, x=col, hue=target_col, ax=ax, palette="Set2")
        ax.set_title(f"{target_col} by {col}")
        ax.tick_params(axis="x", rotation=30)

    for ax in axes[n:]:
        ax.axis("off")

    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/03_categorical_vs_churn.png")
    plt.close()


def plot_correlation_heatmap(df: pd.DataFrame, target_col: str):
    numeric_df = df.select_dtypes(include=["int64", "float64"]).copy()
    if numeric_df.shape[1] < 2:
        print("[SKIP] Not enough numeric columns for a correlation heatmap")
        return
    plt.figure(figsize=(8, 6))
    sns.heatmap(numeric_df.corr(), annot=True, cmap="coolwarm", fmt=".2f")
    plt.title("Correlation Heatmap (Numeric Features)")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/04_correlation_heatmap.png")
    plt.close()


def plot_tenure_vs_churn(df: pd.DataFrame, target_col: str):
    from common import find_column, TENURE_NAME_CANDIDATES
    tenure_col = find_column(df, TENURE_NAME_CANDIDATES)
    if tenure_col is None or not pd.api.types.is_numeric_dtype(df[tenure_col]):
        print("[SKIP] No tenure-like numeric column found")
        return
    plt.figure(figsize=(6, 4))
    sns.boxplot(data=df, x=target_col, y=tenure_col, hue=target_col, palette="Set2", legend=False)
    plt.title(f"{tenure_col} vs {target_col}")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/05_tenure_vs_churn.png")
    plt.close()


def main():
    metadata = load_metadata(METADATA_PATH)
    target_col = metadata["target_column"]
    print(f"[TARGET] Using target column from metadata: '{target_col}'")

    df = load_data(CLEANED_DATA_PATH)
    if target_col not in df.columns:
        raise DatasetError(
            f"Target column '{target_col}' (from {METADATA_PATH}) not found in "
            f"{CLEANED_DATA_PATH}. Re-run M2 first."
        )

    basic_summary(df, target_col)

    plot_churn_distribution(df, target_col)
    plot_numeric_distributions(df, target_col)
    plot_categorical_vs_churn(df, target_col)
    plot_correlation_heatmap(df, target_col)
    plot_tenure_vs_churn(df, target_col)

    print(f"\n[DONE] EDA plots saved to: {OUTPUT_DIR}/")


if __name__ == "__main__":
    try:
        main()
    except DatasetError as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
