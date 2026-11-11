# RetainEdge — Modules 2–5 Setup Guide

RetainEdge is a **dataset-agnostic** customer churn prediction pipeline.
It works with the Telco Customer Churn dataset it was originally built
for, and also with other customer/subscriber datasets (Netflix-style,
SaaS, banking, e-commerce, ...) as long as they contain a usable
churn/retention label column.

## 1. Folder structure to create in VS Code

```
retainedge/
├── data/
│   └── raw_churn_data.csv     <- put your CSV here, renamed to this
├── outputs/                    <- created automatically by the scripts
├── common.py                   <- shared, dataset-agnostic building blocks
├── M2_data_preprocessing.py
├── M3_eda_analysis.py
├── M4_feature_engineering.py
├── M5_model_development.py
├── predict.py                  <- score new customer data with the saved model
└── requirements.txt
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Put your dataset in place

Save your CSV as `data/raw_churn_data.csv`. It needs at least 20 rows
and a column that represents churn/retention.

**Target column auto-detection:** M2 looks for common names like
`Churn`, `Exited`, `Cancelled`, `is_churn`, `attrition`, etc. If your
target column has an unusual name, open `M2_data_preprocessing.py` and
set `TARGET_COLUMN_HINT` at the top to the exact column name. M2 will
refuse to guess and will print a clear message if it can't confidently
identify the target - it will never train on a column it isn't sure
about.

**Target value formats supported:** Yes/No, True/False, 1/0,
Churned/Active, Cancelled/Active, Exited/Retained, Left/Stayed, and a
few more - see `TARGET_VALUE_MAPS` in `common.py`. All are normalized
to a clean 0/1 label internally (1 = churned).

**Identifier columns** (customer ID, email, UUID, ...) are detected
automatically by name and by near-unique-per-row values, and dropped
before modeling - no config needed.

## 4. Run in order

```bash
python M2_data_preprocessing.py      # -> data/cleaned_churn_data.csv, data/dataset_metadata.json
python M3_eda_analysis.py            # -> outputs/eda/*.png
python M4_feature_engineering.py     # -> data/features_churn_data.csv
python M5_model_development.py       # -> outputs/models/*.png + best_model.pkl
```

Each script prints progress to the console and only needs the output
of the previous one — you can also re-run any single step on its own
once its input file exists.

## 5. Score new customers

```bash
python predict.py path/to/new_customers.csv
```

Loads `outputs/models/best_model.pkl` (the exact preprocessing +
trained model, saved together as one sklearn Pipeline), re-applies the
same feature engineering M4 used, and writes
`new_customers_predictions.csv` with `churn_probability`,
`churn_prediction`, and a `churn_risk` (Low/Medium/High) column.

## 6. What each module produces

| Module | Script | Output |
|---|---|---|
| M2 | `M2_data_preprocessing.py` | Deduplicated, missing-value-handled, target-normalized dataset + `dataset_metadata.json` |
| M3 | `M3_eda_analysis.py` | 5 plots: churn distribution, numeric distributions, categorical-vs-churn, correlation heatmap, tenure-vs-churn |
| M4 | `M4_feature_engineering.py` | Adds `tenure_group`, `total_services`, `avg_monthly_spend`, `charge_ratio`, `is_high_value_customer` - each only if the columns it needs exist |
| M5 | `M5_model_development.py` | Trains Random Forest + XGBoost inside a full sklearn Pipeline (preprocessing + model), compares Accuracy/Precision/Recall/F1/ROC-AUC, saves confusion matrices, ROC curves, feature importances, and `best_model.pkl` |

`best_model.pkl` is a dict: `{"pipeline": <fitted sklearn Pipeline>,
"model_name", "target_column", "feature_columns", "metrics"}`. Loading
it and calling `.predict()`/`.predict_proba()` on `pipeline` applies
the exact same preprocessing used during training - no separate
encoding step to keep in sync.

## Notes

- Categorical encoding (one-hot) is done inside the M5 pipeline, not
  in M2 - this avoids fitting encoders on the full dataset before the
  train/test split (a data leakage risk) and keeps M3/M4 working on
  human-readable category labels.
- Both RF and XGBoost use `class_weight`/`scale_pos_weight` to handle
  typical churn class imbalance.
- If a dataset has no usable churn/retention column, M2 stops with a
  clear error rather than fabricating a target - supervised training
  always needs real labels.
