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

print("Loading model... (may take 10-30 seconds for the 2.4GB file)", flush=True)
model = joblib.load(MODEL_PATH)
with open(COLUMNS_PATH, "r", encoding="utf-8") as f:
    COLUMNS = json.load(f)
print(f"Loaded. Features: {len(COLUMNS)}", flush=True)

print("Initializing SHAP TreeExplainer... (may take 30-60 seconds)", flush=True)
explainer = shap.TreeExplainer(model)
print(f"SHAP ready. Base value (expected prediction): {float(explainer.expected_value):.2f}", flush=True)

print("=" * 62, flush=True)
print("  MODEL + ALGORITHM READY  -  CinemaSync ML service is up", flush=True)
print("  Listening on http://127.0.0.1:8000  -  safe to run scheduling", flush=True)
print("=" * 62, flush=True)

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

MONTH_NAMES_HE = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
]

NUMERIC_LABELS_HE = {
    "Weekday_int": "יום בשבוע",
    "Is_Weekend_binary": "סוף שבוע",
    "MovieWeek_int": "שבוע מתחילת ההקרנה",
    "SubtitledLanguageId_int": "שפת תרגום",
    "LengthInMinutes_int": "אורך הסרט",
    "IsDubbed_binary": "מדובב",
    "IsSubtitled_binary": "מתורגם",
    "OMDbMetascore_float": "ציון Metascore",
    "OMDbImdbRating_float": "דירוג IMDb",
    "OMDbImdbVotes_float": "מספר הצבעות IMDb",
    "OMDbBoxOffice_float": "הכנסות קופה",
    "Num_Wins_int": "פרסים שזכה",
    "Num_Nominations_int": "מועמדויות לפרסים",
    "Hour_int": "שעה ביום",
    "Is_Hebrew_Local_binary": "הפקה ישראלית",
    "Has_Imdb_Data_binary": "קיימים נתוני IMDb",
}

GENRES_HE = {
    "Action": "אקשן", "Adventure": "הרפתקאות", "Animation": "אנימציה",
    "Biography": "ביוגרפיה", "Comedy": "קומדיה", "Crime": "פשע",
    "Documentary": "דוקומנטרי", "Drama": "דרמה", "Family": "משפחתי",
    "Fantasy": "פנטזיה", "History": "היסטוריה", "Horror": "אימה",
    "Kids": "ילדים", "Live_Shows": "הופעות חיות", "Music": "מוזיקה",
    "Musical": "מחזמר", "Mystery": "מסתורין", "Romance": "רומנטי",
    "Sci_Fi": "מדע בדיוני", "Short": "סרט קצר", "Sport": "ספורט",
    "Thriller": "מתח", "War": "מלחמה", "Western": "מערבון",
}

CINEMAS_HE = {
    "Ashdod": "אשדוד", "Ashkelon": "אשקלון", "Carmiel": "כרמיאל",
    "Haifa": "חיפה", "KfarSaba": "כפר סבא", "Kiryon": "קריון",
    "Modiin": "מודיעין", "Nahariya": "נהריה", "PetahTikva": "פתח תקווה",
    "Rehovot": "רחובות",
}

SEASONS_HE = {"Spring": "אביב", "Summer": "קיץ", "Autumn": "סתיו", "Winter": "חורף"}
TIMESLOTS_HE = {"Morning": "בוקר", "Noon": "צהריים", "Evening": "ערב", "Night": "לילה"}

COUNTRIES_HE = {
    "USA": "ארה\"ב", "Israel": "ישראל", "France": "צרפת",
    "England": "אנגליה", "UK": "בריטניה", "Russia": "רוסיה",
    "Germany": "גרמניה", "Australia": "אוסטרליה", "Spain": "ספרד",
    "Japan": "יפן", "Other": "אחר",
}


HEBREW_DAYS = ["", "ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]


def factor_explanation(feature_name: str, input_value: float, shap_value: float) -> str:
    is_positive = shap_value >= 0
    val = float(input_value)

    if feature_name.startswith("Genre_"):
        key = feature_name.replace("Genre_", "")
        g = GENRES_HE.get(key, key)
        if val == 1:
            return f"ז'אנר {g} בדרך כלל מושך הרבה צופים" if is_positive else f"ז'אנר {g} פחות פופולרי מהממוצע"
        return f"אילו הסרט היה בז'אנר {g}, התחזית הייתה גבוהה יותר" if not is_positive else f"בחירה ב{g} לא הייתה משפרת את התחזית"

    if feature_name.startswith("Cinema_"):
        key = feature_name.replace("Cinema_", "")
        c = CINEMAS_HE.get(key, key)
        if val == 1:
            return f"קולנוע {c} פופולרי בקהל המקומי" if is_positive else f"קולנוע {c} מוכר פחות כרטיסים בממוצע"
        return f"אילו השיבוץ היה בקולנוע {c}, התחזית הייתה גבוהה יותר" if not is_positive else f"טוב שזה לא {c} — קולנוע פחות מוצלח"

    if feature_name.startswith("Season_"):
        key = feature_name.replace("Season_", "")
        s = SEASONS_HE.get(key, key)
        if val == 1:
            return f"עונת ה{s} תקופה חזקה לבית הקולנוע" if is_positive else f"עונת ה{s} תקופה חלשה יותר"
        return f"אילו זה היה ב{s}, התחזית הייתה גבוהה יותר" if not is_positive else f"טוב שזה לא ב{s} — עונה חלשה"

    if feature_name.startswith("TimeSlot_"):
        key = feature_name.replace("TimeSlot_", "")
        t = TIMESLOTS_HE.get(key, key)
        if val == 1:
            return f"הקרנת {t} פופולרית בקהל" if is_positive else f"הקרנת {t} פחות פופולרית"
        return f"אילו זה היה ב{t}, התחזית הייתה גבוהה יותר" if not is_positive else f"טוב שזה לא ב{t}"

    if feature_name.startswith("Country_"):
        key = feature_name.replace("Country_", "")
        c = COUNTRIES_HE.get(key, key)
        if val == 1:
            return f"סרטים מ{c} מצליחים בקהל הישראלי" if is_positive else f"סרטים מ{c} מוכרים פחות כרטיסים"
        return f"אילו הסרט היה מ{c}, התחזית הייתה גבוהה יותר" if not is_positive else f"טוב שזה לא מ{c}"

    if feature_name.startswith("Month_"):
        idx = int(feature_name.replace("Month_", "")) - 1
        m = MONTH_NAMES_HE[idx]
        if val == 1:
            return f"חודש {m} תקופה חזקה (חגים/חופש)" if is_positive else f"חודש {m} בדרך כלל חלש יותר"
        return f"אילו זה היה ב{m}, התחזית הייתה גבוהה יותר" if not is_positive else f"טוב שזה לא ב{m}"

    if feature_name == "Hour_int":
        h = int(val)
        return f"שעת ההקרנה ({h:02d}:00) פופולרית בקהל" if is_positive else f"שעת ההקרנה ({h:02d}:00) פחות אטרקטיבית"

    if feature_name == "Weekday_int":
        d = HEBREW_DAYS[int(val)] if 1 <= int(val) <= 7 else ""
        return f"יום {d} הוא יום חזק בקולנוע" if is_positive else f"יום {d} יום שקט יחסית"

    if feature_name == "Is_Weekend_binary":
        if val == 1:
            return "סוף שבוע - אנשים פנויים יותר לבילוי" if is_positive else "סוף שבוע אבל לא משפר כצפוי"
        return "יום חול - פחות פנאי לקולנוע" if not is_positive else "יום חול ועדיין מצליח"

    if feature_name == "MovieWeek_int":
        w = int(val)
        if w == 1:
            return "שבוע פתיחה - שיא הציפייה והבאז השיווקי" if is_positive else "שבוע פתיחה אבל החיזוי נמוך"
        if w <= 3:
            return f"שבוע {w} - עדיין רלוונטי בתודעת הקהל" if is_positive else f"שבוע {w} - העניין כבר דועך"
        return f"שבוע {w} להקרנה - הקהל פונה לסרטים חדשים" if not is_positive else f"שבוע {w} ועדיין מושך"

    if feature_name == "LengthInMinutes_int":
        m = int(val)
        if is_positive:
            return f"אורך הסרט ({m} דק') בטווח האהוב על הקהל"
        if m < 90:
            return f"הסרט קצר יחסית ({m} דק') - תחושה של 'לא שווה הנסיעה'"
        if m > 130:
            return f"הסרט ארוך ({m} דק') - מרתיע חלק מהקהל"
        return f"אורך {m} דק' - ניטרלי"

    if feature_name == "IsDubbed_binary":
        if val == 1:
            return "סרט מדובב - פונה לילדים ולמשפחות" if is_positive else "סרט מדובב - מצמצם קהל בוגר"
        return "סרט לא מדובב - מוגבל לקהל קורא כתוביות" if not is_positive else "סרט לא מדובב - מוסיף יוקרה"

    if feature_name == "IsSubtitled_binary":
        if val == 1:
            return "סרט עם כתוביות - נגיש לכלל הקהל" if is_positive else "סרט עם כתוביות"
        return "ללא כתוביות - מוגבל לדוברי השפה" if not is_positive else "ללא כתוביות"

    if feature_name == "OMDbMetascore_float":
        s = float(val)
        if s == 0:
            return "אין נתוני Metascore - חוסר מידע פוגע בחיזוי"
        return f"Metascore {s:.0f} - ביקורות חיוביות מעודדות מכירות" if is_positive else f"Metascore {s:.0f} - ביקורות חלשות יחסית"

    if feature_name == "OMDbImdbRating_float":
        r = float(val)
        if r == 0:
            return "אין דירוג IMDb - חסרים אינדיקטורים"
        return f"דירוג IMDb {r:.1f} - הקהל אוהב את הסרט" if is_positive else f"דירוג IMDb {r:.1f} - הקהל פחות מתחבר"

    if feature_name == "OMDbImdbVotes_float":
        v = int(val)
        if v == 0:
            return "אין הצבעות IMDb - הסרט לא מוכר"
        return f"{v:,} הצבעות IMDb - סרט מוכר ופופולרי" if is_positive else f"רק {v:,} הצבעות - חשיפה מוגבלת"

    if feature_name == "OMDbBoxOffice_float":
        b = int(val)
        if b == 0:
            return "אין נתוני קופה - אין הוכחה להצלחה מסחרית"
        if is_positive:
            return f"הכנסות גבוהות (${b:,}) - סרט שמושך בעולם"
        return f"הכנסות נמוכות (${b:,}) - סרט שלא הצליח מסחרית"

    if feature_name == "Num_Wins_int":
        n = int(val)
        if n == 0:
            return "ללא פרסים - אין באז של זכיות"
        return f"זכה ב-{n} פרסים - באז של איכות" if is_positive else f"{n} פרסים אבל לא תורם"

    if feature_name == "Num_Nominations_int":
        n = int(val)
        if n == 0:
            return "ללא מועמדויות לפרסים"
        return f"{n} מועמדויות לפרסים - הקהל מסקרן" if is_positive else f"{n} מועמדויות אבל לא משפיע"

    if feature_name == "Is_Hebrew_Local_binary":
        if val == 1:
            return "הפקה ישראלית - קהל מקומי נאמן" if is_positive else "הפקה ישראלית - אך לא מצליחה"
        return "סרט זר - דורש שיווק חזק" if not is_positive else "סרט זר ומצליח"

    if feature_name == "Has_Imdb_Data_binary":
        if val == 1:
            return "קיימים נתוני IMDb - אינדיקטור לחשיפה" if is_positive else "קיימים נתוני IMDb"
        return "אין נתוני IMDb - הסרט לא מוכר באינטרנט" if not is_positive else "אין נתוני IMDb"

    return ""


def feature_label(feature_name: str, input_value: float) -> str:
    if feature_name.startswith("Genre_"):
        key = feature_name.replace("Genre_", "")
        return "ז'אנר: " + GENRES_HE.get(key, key)
    if feature_name.startswith("Cinema_"):
        key = feature_name.replace("Cinema_", "")
        return "קולנוע " + CINEMAS_HE.get(key, key)
    if feature_name.startswith("Season_"):
        key = feature_name.replace("Season_", "")
        return "עונת " + SEASONS_HE.get(key, key)
    if feature_name.startswith("TimeSlot_"):
        key = feature_name.replace("TimeSlot_", "")
        return "חלון זמן: " + TIMESLOTS_HE.get(key, key)
    if feature_name.startswith("Country_"):
        key = feature_name.replace("Country_", "")
        return "מדינת הפקה: " + COUNTRIES_HE.get(key, key)
    if feature_name.startswith("Month_"):
        idx = int(feature_name.replace("Month_", "")) - 1
        return "חודש " + MONTH_NAMES_HE[idx]
    return NUMERIC_LABELS_HE.get(feature_name, feature_name)


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
    explanation: str = ""


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


# One-hot groups where exactly one value is active. Their dummies are aggregated
# into a single factor for the ACTIVE category, so inactive (=0) dummies never
# surface as confusing "had it been X" counterfactuals.
SINGLE_SELECT_PREFIXES = ("Cinema_", "Season_", "TimeSlot_", "Country_", "Month_")


def compute_top_factors(features_df: pd.DataFrame, top_n: int = 8) -> List[FactorContribution]:
    shap_array = explainer.shap_values(features_df, approximate=True, check_additivity=False)
    shap_row = np.asarray(shap_array).reshape(-1)
    input_row = features_df.iloc[0].values

    values = {}
    for i, col in enumerate(COLUMNS):
        values[col] = (float(input_row[i]), float(shap_row[i]))

    pairs = []
    consumed = set()

    for prefix in SINGLE_SELECT_PREFIXES:
        group = [c for c in COLUMNS if c.startswith(prefix)]
        if not group:
            continue
        group_shap = 0.0
        active = None
        for c in group:
            iv, sv = values[c]
            group_shap += sv
            consumed.add(c)
            if iv == 1:
                active = c
        if active is not None:
            pairs.append((active, 1.0, group_shap))

    # Genres are multi-select: keep each ACTIVE genre on its own, drop inactive dummies.
    for c in COLUMNS:
        if not c.startswith("Genre_"):
            continue
        consumed.add(c)
        iv, sv = values[c]
        if iv == 1:
            pairs.append((c, iv, sv))

    for c in COLUMNS:
        if c in consumed:
            continue
        iv, sv = values[c]
        pairs.append((c, iv, sv))

    pairs.sort(key=lambda p: abs(p[2]), reverse=True)
    top = pairs[:top_n]

    return [
        FactorContribution(
            feature=name,
            label=feature_label(name, iv),
            input_value=iv,
            shap_value=round(sv, 3),
            explanation=factor_explanation(name, iv, sv),
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
