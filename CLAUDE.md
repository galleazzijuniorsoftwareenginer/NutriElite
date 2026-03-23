# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Run locally (with hot reload)
uvicorn backend.main:app --reload
# API docs: http://127.0.0.1:8000/docs

# Run with Docker
docker compose up --build
# API: http://localhost:8000/docs

# Seed the database (food groups + default admin user)
python -m backend.scripts.seed_smae
```

**Required environment variable**: `ANTHROPIC_API_KEY` in `.env` for AI menu generation.

## Architecture Overview

NutriElite is a clinical nutrition SaaS. The backend is a **FastAPI** app that also serves the frontend as static files. There is no separate frontend build step — the entire UI is a single vanilla JS SPA at `backend/static/app/index.html`.

**Database**: SQLite locally (`nutrielite.db`), PostgreSQL in production (Railway). The `DATABASE_URL` env var controls which is used; `postgres://` URIs are auto-converted to `postgresql://`.

## Key Data Flow

1. **Plan creation** (`POST /plan`): Receives patient anthropometrics → calculates BMR (3 formula options: Mifflin, Harris-Benedict, Schofield) → computes TDEE via activity multiplier → applies goal adjustment (cut: −300 kcal, bulk: +300 kcal) → distributes macros (protein = weight×2g, fats = weight×1g, carbs = remainder) → calculates SMAE food group portions.

2. **Nutritional audit** (`GET /plans/{id}/audit`): Validates macro energy consistency using the 4-4-9 rule (kcal/g for protein, carbs, fats).

3. **AI menu** (`POST /plans/{id}/menu/ai`): Calls Claude API (`ai_menu_service.py`) with patient data and SMAE portions → returns 3 meal plan options in JSON with per-meal foods, quantities in grams, and kcal.

4. **PDF export** (`GET /plans/{id}/pdf?menu=...`): `pdf_service.py` uses ReportLab to generate a clinical report with patient demographics, BMI, macro audit, SMAE table, and optionally the AI-generated menu.

## Code Structure

```
backend/
  main.py                  # App init, route registration, DB seeding on startup
  database.py              # SQLAlchemy engine + session, env-based DB URL
  models.py                # ORM: User, Plan, FoodGroup, FitnessReference, PlanFoodGroup
  schemas/plan.py          # Pydantic request validation
  routes/
    auth.py                # Register, login, JWT
    calculator.py          # Plan CRUD, audit, PDF, AI menu endpoints
    food.py                # Food group list
    smae.py                # Nutritional audit endpoint
  services/
    plan_service.py        # SMAE portion calculation (core business logic)
    metabolic_service.py   # BMR formula implementations
    smae_calculation_service.py  # Energy audit validation
    pdf_service.py         # ReportLab PDF generation
    ai_menu_service.py     # Claude API call for meal plans
  scripts/
    seed_smae.py           # Seeds food groups and default admin
  static/app/index.html    # Entire frontend SPA (~59KB, ~1400 lines of JS)
```

## SMAE System

SMAE is a Mexican dietetic food exchange system. `plan_service.py` maps macronutrient targets to portions across 8 food groups (leche, AOA, leguminosas, verduras, cereales, frutas, aceites, azúcares). Cereals and fruits auto-scale to close any caloric gap within a 3% tolerance. Goal mode (cut/bulk) selects low-fat vs. full-fat food variants.

## AI Menu Response Shape

Claude returns JSON (may be wrapped in markdown code fences — the service strips these):
```json
{
  "opciones": [
    {
      "nombre": "Opção 1 — Alta proteína",
      "refeicoes": [
        {"refeicao": "Desayuno", "kcal": 550, "itens": [
          {"alimento": "Avena", "cantidad_g": 80, "kcal": 300}
        ]}
      ],
      "macros": {"proteina_g": 140, "carb_g": 315, "gordura_g": 70, "kcal_total": 2380}
    }
  ]
}
```

## CI/CD

GitHub Actions (`.github/workflows/sonar.yml`) runs SonarCloud static analysis on push to `main`. Deployment is to Railway via Docker; the `Dockerfile` runs `uvicorn` on `$PORT` (default 8080).
