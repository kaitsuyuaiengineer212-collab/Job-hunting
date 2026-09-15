"""Statistics API for the workout log.

Deployed as a Vercel Python serverless function. All endpoints require a
Supabase access token (the signed-in user's JWT) in the Authorization header;
the token is validated against Supabase Auth, and data is scoped to that
user's own rows only (mirroring the Row Level Security policies enforced on
the client).
"""

import os
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scipy import stats as scipy_stats
from supabase import Client, create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

app = FastAPI(title="Kintore Log Stats API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

admin_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_user_id(authorization: Optional[str]) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        result = admin_client.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token") from None
    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return result.user.id


def load_sets_df(user_id: str) -> pd.DataFrame:
    """One row per set: date, exercise_id, weight, reps, volume."""
    res = admin_client.table("sessions").select("date, exercise_logs").eq("user_id", user_id).execute()
    rows = []
    for session in res.data:
        for log in session["exercise_logs"]:
            for s in log["sets"]:
                rows.append(
                    {
                        "date": session["date"],
                        "exercise_id": log["exerciseId"],
                        "weight": s["weight"],
                        "reps": s["reps"],
                    }
                )
    if not rows:
        return pd.DataFrame(columns=["date", "exercise_id", "weight", "reps", "volume"])
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df["volume"] = df["weight"] * df["reps"]
    return df


def per_session_max(df: pd.DataFrame, exercise_id: str) -> pd.DataFrame:
    ex = df[df.exercise_id == exercise_id]
    return ex.groupby("date")["weight"].max().reset_index().sort_values("date")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/analytics/regression")
def regression(exercise_id: str, authorization: Optional[str] = Header(None)):
    """Least-squares trend of an exercise's max weight over time (scipy.stats.linregress)."""
    user_id = get_user_id(authorization)
    df = load_sets_df(user_id)
    ex = per_session_max(df, exercise_id)
    if len(ex) < 3:
        raise HTTPException(status_code=400, detail="Not enough sessions (need at least 3)")

    x = (ex["date"] - ex["date"].min()).dt.days.to_numpy(dtype=float)
    y = ex["weight"].to_numpy(dtype=float)
    slope, intercept, r_value, p_value, std_err = scipy_stats.linregress(x, y)

    return {
        "exerciseId": exercise_id,
        "sessions": int(len(ex)),
        "slopeKgPerWeek": round(float(slope) * 7, 3),
        "rSquared": round(float(r_value) ** 2, 4),
        "pValue": round(float(p_value), 4),
        "stdErr": round(float(std_err), 4),
        "significant": bool(p_value < 0.05),
    }


@app.get("/api/analytics/forecast")
def forecast(exercise_id: str, weeks_ahead: int = 4, authorization: Optional[str] = Header(None)):
    """Linear extrapolation with a 95% prediction interval, weeks_ahead into the future."""
    user_id = get_user_id(authorization)
    df = load_sets_df(user_id)
    ex = per_session_max(df, exercise_id)
    if len(ex) < 3:
        raise HTTPException(status_code=400, detail="Not enough sessions (need at least 3)")
    weeks_ahead = max(1, min(weeks_ahead, 12))

    x = (ex["date"] - ex["date"].min()).dt.days.to_numpy(dtype=float)
    y = ex["weight"].to_numpy(dtype=float)
    slope, intercept, r_value, _p_value, _std_err = scipy_stats.linregress(x, y)

    residuals = y - (slope * x + intercept)
    residual_std = float(np.std(residuals, ddof=2)) if len(x) > 2 else 0.0
    last_day = float(x.max())

    predictions = []
    for w in range(1, weeks_ahead + 1):
        future_day = last_day + w * 7
        predicted = slope * future_day + intercept
        margin = 1.96 * residual_std
        predictions.append(
            {
                "weeksAhead": w,
                "predictedWeight": round(float(predicted), 1),
                "lowerBound": round(float(predicted - margin), 1),
                "upperBound": round(float(predicted + margin), 1),
            }
        )

    return {"exerciseId": exercise_id, "rSquared": round(float(r_value) ** 2, 4), "predictions": predictions}


@app.get("/api/analytics/correlations")
def correlations(authorization: Optional[str] = Header(None)):
    """Pairwise Pearson correlation (scipy.stats.pearsonr) between exercises' weekly max weight."""
    user_id = get_user_id(authorization)
    df = load_sets_df(user_id)
    if df.empty:
        return {"pairs": []}

    weekly = df.copy()
    weekly["week"] = weekly["date"].dt.to_period("W").astype(str)
    pivot = weekly.groupby(["week", "exercise_id"])["weight"].max().unstack("exercise_id")

    exercise_ids = pivot.columns.tolist()
    pairs = []
    for i in range(len(exercise_ids)):
        for j in range(i + 1, len(exercise_ids)):
            a, b = exercise_ids[i], exercise_ids[j]
            joined = pivot[[a, b]].dropna()
            if len(joined) < 3:
                continue
            corr, p_value = scipy_stats.pearsonr(joined[a], joined[b])
            if abs(corr) < 0.4:
                continue
            pairs.append(
                {
                    "exerciseA": a,
                    "exerciseB": b,
                    "correlation": round(float(corr), 3),
                    "pValue": round(float(p_value), 4),
                    "weeks": int(len(joined)),
                }
            )

    pairs.sort(key=lambda p: -abs(p["correlation"]))
    return {"pairs": pairs[:10]}
