# FoodLens

**Smart Food Recognition Using Deep Learning — with Top-3 Predictions and Nutrition Information**

FoodLens is a full-stack web application that recognizes the dominant food in an uploaded photograph,
shows the top-3 predicted food categories with confidence scores, and retrieves reference nutrition
information (per 100 g) for the top prediction.

## Architecture

```
Frontend (React + Vite)
        │  REST API (multipart POST)
        ▼
Backend (FastAPI)
        │
        ├── FoodClassificationService ──► nateraw/food (ViT-Base, Food-101, 101 classes)
        │
        └── NutritionService ──► backend/app/data/nutritional_database.json
        │
        ▼
JSON response (prediction, top-3, confidence, nutrition, warnings)
        │
        ▼
Frontend (results + nutrition cards)
```

- **AI inference** and **nutrition lookup** are separate services behind common interfaces so a future
  detection/segmentation model (e.g. YOLO) can be added without rewriting the application.
- The model is loaded **once at startup** and reused for every request.

## AI Model

**Model:** [`nateraw/food`](https://huggingface.co/nateraw/food)

- ViT-Base (`google/vit-base-patch16-224-in21k` base), `ViTForImageClassification`
- Fine-tuned on Food-101 (101 classes), 224×224 input
- The repository reports a Food-101 evaluation accuracy of **89.13%**.
  This is the figure reported by the model author, not an independently reproduced result on this machine.
- License: Apache-2.0
- Pretrained checkpoint is used directly. No training or fine-tuning is performed.

## Nutrition Data

Nutrition values come from `nutritional_database.json` (bundled behind the backend), which contains
reference values per 100 g for the Food-101 classes:

| Field | Meaning |
| --- | --- |
| `calories_per_100g` | kcal per 100 g |
| `protein_per_100g` | protein in g per 100 g |
| `carbs_per_100g` | carbohydrates in g per 100 g |
| `fat_per_100g` | fat in g per 100 g |
| `fiber_per_100g` | fiber in g per 100 g |

**Important:** These are reference estimates per 100 g and are **not** an exact measurement of the
quantity present in an uploaded photo. The system does not estimate portion size.

Coverage: 100 of the 101 model classes have an entry. If the model predicts `edamame`, nutrition is
reported as unavailable rather than inventing values.

## Backend API

### `POST /api/predict`

Accepts `multipart/form-data` with one field `file` (JPG / JPEG / PNG / WEBP, max 10 MB).

Example response:

```json
{
  "success": true,
  "prediction": { "food": "pizza", "confidence": 0.8913 },
  "top_predictions": [
    { "food": "pizza", "confidence": 0.8913 },
    { "food": "flatbread", "confidence": 0.0320 },
    { "food": "garlic_bread", "confidence": 0.0180 }
  ],
  "nutrition_per_100g": {
    "calories_per_100g": 250,
    "protein_per_100g": 12.0,
    "carbs_per_100g": 30.0,
    "fat_per_100g": 10.0,
    "fiber_per_100g": 2.0
  },
  "nutrition_status": "available",
  "low_confidence": false,
  "warning": null,
  "inference_time_ms": 1200.4,
  "disclaimer": "Nutrition values are reference values per 100 g and are not an exact measurement of the quantity present in the uploaded image."
}
```

- `nutrition_status`: `available` | `not_available` | `uncertain`
- When top confidence is below the configured threshold, `low_confidence` is `true`, nutrition is
  suppressed (`uncertain`), and a warning is returned. The prediction itself is still shown.
- Errors produce clean HTTP error responses (400/413/500) with user-readable `detail` messages.

### `GET /api/health`

Health check. Interactive API docs: `http://127.0.0.1:8000/docs`

## Installation & Running

### 0. Prerequisites

- Python 3.10+ (3.12 recommended)
- Node.js 18+
- Optional: NVIDIA GPU with CUDA for GPU inference (falls back to CPU automatically)

### 1. Backend

```bash
cd backend

# create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

# run the API (downloads model weights on first start)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173 in your browser.

The Vite dev server proxies `/api` requests to `http://127.0.0.1:8000`, so no extra configuration is
needed for local development.

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `FOODLENS_MODEL_ID` | `nateraw/food` | Hugging Face model id |
| `FOODLENS_DEVICE` | `auto` | `auto` / `cuda` / `cpu` |
| `FOODLENS_CONFIDENCE_THRESHOLD` | `0.5` | Low-score warning threshold |
| `FOODLENS_MAX_UPLOAD_BYTES` | `10485760` | Max upload size (bytes) |
| `FOODLENS_NUTRITION_DB` | bundled path | Path to nutrition JSON |
| `FOODLENS_CORS_ORIGINS` | `http://localhost:5173,...` | Allowed CORS origins |

## Limitations

- **Classification, not detection.** The model identifies one dominant food category. It does not
  detect multiple foods or produce bounding boxes, and no fake bounding boxes are drawn.
- **No portion estimation.** Nutrition is shown per 100 g as a reference value, not as an exact
  measurement of the portion in the photo.
- **Food-101 only.** Unsupported foods or non-food images can be misclassified. High confidence does
  not guarantee the prediction is correct.
- **Nutrition is not medical advice.** Values depend on preparation, ingredients and portion size.

## Project Structure

```
foodlens/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + lifespan (model load once)
│   │   ├── config.py               # environment settings
│   │   ├── api/routes.py           # /api/predict, /api/health
│   │   ├── services/
│   │   │   ├── model_service.py    # AIModelService + FoodClassificationService
│   │   │   └── nutrition_service.py# nutrition lookup
│   │   ├── schemas/predict.py      # response models
│   │   ├── utils/image_utils.py    # upload validation/decoding
│   │   └── data/nutritional_database.json
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── utils.js
│   │   ├── styles.css
│   │   └── components/
│   │       ├── Header.jsx
│   │       ├── UploadZone.jsx
│   │       ├── ImagePreview.jsx
│   │       ├── Results.jsx
│   │       ├── NutritionCard.jsx
│   │       ├── TopPredictions.jsx
│   │       ├── WarningBanner.jsx
│   │       └── Disclaimer.jsx
│   ├── public/favicon.svg
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```