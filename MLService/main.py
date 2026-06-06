from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from pathlib import Path
import joblib
import json
import pandas as pd
import numpy as np
import shap

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "cinema_model.pkl"
COLUMNS_PATH = BASE_DIR / "columns.json"

print("Loading model... (may take 10-30 seconds for the 2.4GB file)")
model = joblib.load(MODEL_PATH)
with open(COLUMNS_PATH, "r", encoding="utf-8") as f:
    COLUMNS = json.load(f)
print(f"Loaded. Features: {len(COLUMNS)}")

print("Initializing SHAP TreeExplainer... (may take 30-60 seconds)")
explainer = shap.TreeExplainer(model)
print(f"SHAP ready. Base value (expected prediction): {float(explainer.expected_value):.2f}")

app = FastAPI(title="CinemaSync ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_CINEMAS = [
    "Ashdod", "Ashkelon", "Carmiel", "Haifa", "KfarSaba",
    "Kiryon", "Modiin", "Nahariya", "PetahTikva", "Rehovot",
]
VALID_GENRES = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "History", "Horror",
    "Kids", "Live_Shows", "Music", "Musical", "Mystery", "Romance",
    "Sci_Fi", "Short", "Sport", "Thriller", "War", "Western",
]
VALID_COUNTRIES = [
    "USA", "Israel", "France", "England", "UK", "Russia",
    "Germany", "Australia", "Spain", "Japan", "Other",
]
VALID_SEASONS = ["Spring", "Summer", "Autumn", "Winter"]
VALID_TIMESLOTS = ["Morning", "Noon", "Evening", "Night"]

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

NUMERIC_LABELS = {
    "Weekday_int": "Day of week",
    "Is_Weekend_binary": "Weekend",
    "MovieWeek_int": "Week since release",
    "SubtitledLanguageId_int": "Subtitle language",
    "LengthInMinutes_int": "Movie length",
    "IsDubbed_binary": "Dubbed",
    "IsSubtitled_binary": "Subtitled",
    "OMDbMetascore_float": "Metascore",
    "OMDbImdbRating_float": "IMDb rating",
    "OMDbImdbVotes_float": "IMDb votes",
    "OMDbBoxOffice_float": "Box office",
    "Num_Wins_int": "Award wins",
    "Num_Nominations_int": "Award nominations",
    "Hour_int": "Hour of day",
    "Is_Hebrew_Local_binary": "Hebrew local production",
    "Has_Imdb_Data_binary": "Has IMDb data",
}


def feature_label(feature_name: str, input_value: float) -> str:
    if feature_name.startswith("Genre_"):
        return feature_name.replace("Genre_", "").replace("_", " ") + " genre"
    if feature_name.startswith("Cinema_"):
        return feature_name.replace("Cinema_", "") + " cinema"
    if feature_name.startswith("Season_"):
        return feature_name.replace("Season_", "") + " season"
    if feature_name.startswith("TimeSlot_"):
        return feature_name.replace("TimeSlot_", "") + " time slot"
    if feature_name.startswith("Country_"):
        return feature_name.replace("Country_", "") + " country"
    if feature_name.startswith("Month_"):
        idx = int(feature_name.replace("Month_", "")) - 1
        return MONTH_NAMES[idx]
    return NUMERIC_LABELS.get(feature_name, feature_name)


class PredictionRequest(BaseModel):
    cinema: str
    genres: List[str]
    country: str
    month: int = Field(..., ge=1, le=12)
    season: str
    timeslot: str
    hour: int = Field(..., ge=0, le=23)
    weekday: int = Field(..., ge=1, le=7, description="Sunday=1, Saturday=7")
    movie_week: int = Field(..., ge=1)
    length_min: int = Field(..., ge=1)
    venue_capacity: int = Field(..., ge=1)
    imdb_rating: Optional[float] = 0.0
    metascore: Optional[float] = 0.0
    imdb_votes: Optional[float] = 0.0
    boxoffice: Optional[float] = 0.0
    num_wins: int = 0
    num_nominations: int = 0
    is_hebrew_local: int = 0
    is_dubbed: int = 0
    is_subtitled: int = 1


class FactorContribution(BaseModel):
    feature: str
    label: str
    input_value: float
    shap_value: float


class PredictionResponse(BaseModel):
    predicted_tickets: int
    occupancy_percent: float
    raw_prediction: float
    base_value: float
    factors: List[FactorContribution]


class BatchPredictionRequest(BaseModel):
    requests: List[PredictionRequest]


class BatchPredictionItem(BaseModel):
    predicted_tickets: int
    occupancy_percent: float
    raw_prediction: float


class BatchPredictionResponse(BaseModel):
    predictions: List[BatchPredictionItem]


def build_feature_row(req: PredictionRequest) -> pd.DataFrame:
    row = {col: 0 for col in COLUMNS}

    row["Weekday_int"] = req.weekday
    row["Is_Weekend_binary"] = 1 if req.weekday in [6, 7] else 0
    row["MovieWeek_int"] = req.movie_week
    row["SubtitledLanguageId_int"] = 972
    row["LengthInMinutes_int"] = req.length_min
    row["IsDubbed_binary"] = req.is_dubbed
    row["IsSubtitled_binary"] = req.is_subtitled
    row["OMDbMetascore_float"] = req.metascore or 0
    row["OMDbImdbRating_float"] = req.imdb_rating or 0
    row["OMDbImdbVotes_float"] = req.imdb_votes or 0
    row["OMDbBoxOffice_float"] = req.boxoffice or 0
    row["Num_Wins_int"] = req.num_wins
    row["Num_Nominations_int"] = req.num_nominations
    row["Hour_int"] = req.hour
    row["Is_Hebrew_Local_binary"] = req.is_hebrew_local
    row["Has_Imdb_Data_binary"] = 1 if (req.imdb_rating and req.imdb_rating > 0) else 0

    for genre in req.genres:
        col = f"Genre_{genre}"
        if col not in row:
            raise ValueError(f"Unknown genre: {genre}. Valid: {VALID_GENRES}")
        row[col] = 1

    cinema_col = f"Cinema_{req.cinema}"
    if cinema_col not in row:
        raise ValueError(f"Unknown cinema: {req.cinema}. Valid: {VALID_CINEMAS}")
    row[cinema_col] = 1

    season_col = f"Season_{req.season}"
    if season_col not in row:
        raise ValueError(f"Unknown season: {req.season}. Valid: {VALID_SEASONS}")
    row[season_col] = 1

    timeslot_col = f"TimeSlot_{req.timeslot}"
    if timeslot_col not in row:
        raise ValueError(f"Unknown timeslot: {req.timeslot}. Valid: {VALID_TIMESLOTS}")
    row[timeslot_col] = 1

    country_col = f"Country_{req.country}"
    if country_col not in row:
        raise ValueError(f"Unknown country: {req.country}. Valid: {VALID_COUNTRIES}")
    row[country_col] = 1

    row[f"Month_{req.month}"] = 1

    return pd.DataFrame([row], columns=COLUMNS)


def compute_top_factors(features_df: pd.DataFrame, top_n: int = 8) -> List[FactorContribution]:
    shap_array = explainer.shap_values(features_df, approximate=True, check_additivity=False)
    shap_row = np.asarray(shap_array).reshape(-1)
    input_row = features_df.iloc[0].values

    pairs = []
    for i, col in enumerate(COLUMNS):
        sv = float(shap_row[i])
        iv = float(input_row[i])
        pairs.append((col, iv, sv))

    pairs.sort(key=lambda p: abs(p[2]), reverse=True)
    top = pairs[:top_n]

    return [
        FactorContribution(
            feature=name,
            label=feature_label(name, iv),
            input_value=iv,
            shap_value=round(sv, 3),
        )
        for name, iv, sv in top
    ]


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "CinemaSync ML",
        "features": len(COLUMNS),
        "endpoints": ["/predict (POST)", "/options (GET)", "/health (GET)"],
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


@app.get("/options")
def options():
    return {
        "cinemas": VALID_CINEMAS,
        "genres": VALID_GENRES,
        "countries": VALID_COUNTRIES,
        "seasons": VALID_SEASONS,
        "timeslots": VALID_TIMESLOTS,
    }


@app.post("/predict-batch", response_model=BatchPredictionResponse)
def predict_batch(req: BatchPredictionRequest):
    if not req.requests:
        return BatchPredictionResponse(predictions=[])

    rows = []
    capacities = []
    for r in req.requests:
        try:
            df_row = build_feature_row(r)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        rows.append(df_row.iloc[0])
        capacities.append(r.venue_capacity)

    batch_df = pd.DataFrame(rows, columns=COLUMNS)
    raw_predictions = model.predict(batch_df)

    items = []
    for i in range(len(req.requests)):
        raw = float(raw_predictions[i])
        tickets = max(0, round(raw))
        cap = capacities[i]
        occupancy = (tickets / cap * 100) if cap > 0 else 0.0
        items.append(BatchPredictionItem(
            predicted_tickets=int(tickets),
            occupancy_percent=round(min(occupancy, 100.0), 1),
            raw_prediction=round(raw, 2),
        ))

    return BatchPredictionResponse(predictions=items)


@app.post("/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    try:
        features_df = build_feature_row(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    raw = float(model.predict(features_df)[0])
    tickets = max(0, round(raw))
    occupancy = (tickets / req.venue_capacity * 100) if req.venue_capacity > 0 else 0.0

    factors = compute_top_factors(features_df, top_n=8)
    base_value = float(explainer.expected_value)

    return PredictionResponse(
        predicted_tickets=int(tickets),
        occupancy_percent=round(min(occupancy, 100.0), 1),
        raw_prediction=round(raw, 2),
        base_value=round(base_value, 2),
        factors=factors,
    )
