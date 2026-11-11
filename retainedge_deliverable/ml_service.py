"""
RetainEdge ML HTTP Service

Bridge between the RetainEdge Node/Express backend
and the actual RetainEdge Python churn prediction pipeline.

Run:
    python -m uvicorn ml_service:app --host 0.0.0.0 --port 8000
"""

from pathlib import Path
import os
import sys
import tempfile

import pandas as pd
from fastapi import FastAPI, UploadFile, File, Header, HTTPException

# ---------------------------------------------------------
# Make sure imports and relative model paths work regardless
# of where uvicorn is started from.
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
os.chdir(BASE_DIR)

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# ---------------------------------------------------------
# RetainEdge AI modules
# ---------------------------------------------------------

from common import DatasetError, try_fix_numeric_columns
from dataset_interpreter import standardize_dataset
import M4_feature_engineering as m4
from model_registry import select_model
from M7_shap_explainability import run_shap
from M8_recommendations import run_recommendations


# ---------------------------------------------------------
# FastAPI
# ---------------------------------------------------------

app = FastAPI(
    title="RetainEdge ML Service",
    version="1.0.0"
)


# ---------------------------------------------------------
# Optional API key
# ---------------------------------------------------------

ML_SERVICE_API_KEY = os.getenv("ML_SERVICE_API_KEY", "")


def check_api_key(x_api_key):
    """
    If ML_SERVICE_API_KEY is configured, require the same
    key from the Node backend.
    """

    if ML_SERVICE_API_KEY:
        if x_api_key != ML_SERVICE_API_KEY:
            raise HTTPException(
                status_code=401,
                detail="Invalid ML service API key."
            )


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "RetainEdge ML Service",
        "model_registry": str(
            BASE_DIR / "outputs" / "models" / "model_registry.pkl"
        )
    }


# ---------------------------------------------------------
# Dataset interpretation
# ---------------------------------------------------------

def interpret_dataset(raw_df):
    """
    Convert user/company dataset columns into
    RetainEdge's canonical feature names.
    """

    try:

        interpreted = standardize_dataset(raw_df)

        if isinstance(interpreted, tuple):
            df = interpreted[0]
        else:
            df = interpreted

        if not isinstance(df, pd.DataFrame):
            raise DatasetError(
                "Dataset interpreter did not return a DataFrame."
            )

        return df

    except Exception as e:

        raise DatasetError(
            f"Dataset interpretation failed: {e}"
        )


# ---------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------

def apply_feature_engineering(df):

    df, _ = try_fix_numeric_columns(df)

    if "Tenure" in df.columns:
        df = m4.add_tenure_groups(df)

    if "Usage Frequency" in df.columns:
        df = m4.add_total_services_count(df)

    if "Total Spend" in df.columns:
        df = m4.add_billing_features(df)

    if "Total Spend" in df.columns:
        df = m4.add_high_value_flag(df)

    return df


# ---------------------------------------------------------
# Prediction
# ---------------------------------------------------------

def generate_predictions(df, bundle):

    pipeline = bundle["pipeline"]
    feature_columns = bundle["feature_columns"]

    missing = [
        column
        for column in feature_columns
        if column not in df.columns
    ]

    if missing:
        raise DatasetError(
            "Selected model requires missing features: "
            + str(missing)
        )

    X = df[feature_columns]

    probabilities = pipeline.predict_proba(X)[:, 1]

    predictions = pipeline.predict(X)

    # Customer ID
    if "CustomerID" in df.columns:
        customer_ids = df["CustomerID"].tolist()
    else:
        customer_ids = list(
            range(1, len(df) + 1)
        )

    results = []

    for i in range(len(df)):

        probability = float(probabilities[i])

        results.append({
            "customer_id": str(customer_ids[i]),

            # IMPORTANT:
            # Backend expects 0.0 - 1.0,
            # NOT 0 - 100.
            "churn_probability": round(
                probability,
                6
            ),

            "churn_prediction": int(
                predictions[i]
            )
        })

    return results


# ---------------------------------------------------------
# SHAP
# ---------------------------------------------------------

def generate_shap(df, bundle):

    shap_df = run_shap(
        df,
        bundle
    )

    return shap_df


# ---------------------------------------------------------
# Build backend-compatible result
# ---------------------------------------------------------

def build_results(
    df,
    prediction_results,
    shap_df
):

    results = []

    for i, prediction in enumerate(
        prediction_results
    ):

        customer_id = prediction[
            "customer_id"
        ]

        probability = prediction[
            "churn_probability"
        ]

        top_factors = []

        if i < len(shap_df):

            reason = shap_df.iloc[i].get(
                "primary_churn_reason"
            )

            shap_value = shap_df.iloc[i].get(
                "shap_value"
            )

            if pd.notna(reason):

                value = None

                if reason in df.columns:
                    value = df.iloc[i][reason]

                    if pd.isna(value):
                        value = None
                    else:
                        # Convert numpy values into normal
                        # Python values for JSON serialization.
                        try:
                            value = value.item()
                        except AttributeError:
                            value = str(value)

                top_factors.append({
                    "feature": str(reason),
                    "impact": float(shap_value)
                    if pd.notna(shap_value)
                    else 0.0,
                    "value": value
                })

        results.append({
            "customer_id": customer_id,
            "churn_probability": probability,
            "top_factors": top_factors
        })

    return results


# ---------------------------------------------------------
# MAIN PREDICTION ENDPOINT
# ---------------------------------------------------------

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    x_api_key: str | None = Header(
        default=None
    )
):

    check_api_key(x_api_key)

    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file supplied."
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported."
        )

    temp_path = None

    try:

        # -------------------------------------------------
        # Save uploaded CSV temporarily
        # -------------------------------------------------

        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV is empty."
            )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".csv"
        ) as temp:

            temp.write(contents)
            temp_path = temp.name

        # -------------------------------------------------
        # Read dataset
        # -------------------------------------------------

        raw_df = pd.read_csv(
            temp_path
        )

        if raw_df.empty:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV contains no rows."
            )

        # -------------------------------------------------
        # Interpret dataset
        # -------------------------------------------------

        df = interpret_dataset(
            raw_df
        )

        # -------------------------------------------------
        # Feature engineering
        # -------------------------------------------------

        df = apply_feature_engineering(
            df
        )

        # -------------------------------------------------
        # Select compatible trained model
        # -------------------------------------------------

        try:

            model_name, bundle = select_model(
                df.columns
            )

        except Exception as e:

            raise DatasetError(
                f"Model selection failed: {e}"
            )

        # -------------------------------------------------
        # Generate predictions
        # -------------------------------------------------

        prediction_results = generate_predictions(
            df,
            bundle
        )

        # -------------------------------------------------
        # Generate SHAP explanations
        # -------------------------------------------------

        shap_df = generate_shap(
            df,
            bundle
        )

        # -------------------------------------------------
        # Combine everything
        # -------------------------------------------------

        results = build_results(
            df,
            prediction_results,
            shap_df
        )

        return {
            "model_version": model_name,
            "results": results
        }

    except HTTPException:
        raise

    except DatasetError as e:

        raise HTTPException(
            status_code=422,
            detail=str(e)
        )

    except Exception as e:

        print(
            "[RetainEdge ML ERROR]",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail=f"ML prediction failed: {e}"
        )

    finally:

        if temp_path:

            try:
                os.remove(temp_path)
            except OSError:
                pass