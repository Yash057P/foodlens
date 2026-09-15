---
title: FoodLens API
emoji: 🍕
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
---

# FoodLens API

FastAPI food-classification backend for the FoodLens app.

- Model: `nateraw/food` (ViT-Base, Food-101, 101 classes) — loaded once at startup, CPU + float16 for low memory.
- `POST /api/predict` — multipart upload → top-3 predictions + nutrition + warnings.
- `GET /api/health` — health check.

Set `FOODLENS_CORS_ORIGINS` in the Space Settings → Variables to the deployed frontend origin.