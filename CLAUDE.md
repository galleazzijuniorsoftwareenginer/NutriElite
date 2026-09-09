# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Backend setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Run backend locally (with hot reload)
uvicorn backend.main:app --reload
# API docs: http://127.0.0.1:8000/docs

# Frontend setup (separate terminal)
cd frontend && npm install
npm run dev
# App: http://localhost:5173 (proxies API calls to the backend on :8000)

# Run everything with Docker (builds the frontend and bundles it into the image)
docker compose up --build
# API + App: http://localhost:8000  (App at /app/)

# Seed the database (food groups + default admin user) — happens automatically on backend startup too
python -m backend.scripts.seed_smae
```

**Required environment variables**: `ANTHROPIC_API_KEY` (AI menu generation), `JWT_SECRET_KEY` (auth — falls back to an insecure default with a startup warning if unset), `STRIPE_API_KEY`/`STRIPE_PRICE_ID`/`STRIPE_WEBHOOK_SECRET` (billing), `RESEND_API_KEY` (password reset emails), `PUBLIC_BASE_URL` (used to build Stripe checkout/reset-password links — defaults to the production Railway URL if unset).

## Architecture Overview

NutriElite is a clinical nutrition SaaS with two parts:

- **Backend**: a **FastAPI** app (`backend/`) exposing the REST API and also serving the built frontend as static files under `/app`.
- **Frontend**: a **React + TypeScript + Vite** SPA (`frontend/`) — Tailwind v4 for styling, React Router, TanStack Query for server state, Zustand for auth/session state, Recharts for the audit charts.

There **is** a frontend build step now: in production the Dockerfile builds `frontend/` (`npm run build`) and copies the output into `backend/static/app/` (replacing the old vanilla-JS SPA, kept only as `backend/static/app/index_backup.html` for historical reference). That build output is git-ignored — it's generated at Docker build time, never committed. In local dev, run the Vite dev server (`npm run dev`) instead; it proxies API calls to the FastAPI server on `:8000` (see `frontend/vite.config.ts`).

The frontend's router uses `basename="/app"` in production (`import.meta.env.PROD`) to match how FastAPI mounts it, and `/` in dev where Vite serves it at the root.

**Database**: SQLite locally (`nutrielite.db`), PostgreSQL in production (Railway). The `DATABASE_URL` env var controls which is used; `postgres://` URIs are auto-converted to `postgresql://`. Incremental `ALTER TABLE` migrations in `backend/main.py` only run against Postgres (SQLite's `ADD COLUMN IF NOT EXISTS` syntax doesn't exist — a fresh SQLite DB already gets the full schema from `Base.metadata.create_all`).

## Key Data Flow

1. **Plan creation** (`POST /plan`): Receives patient anthropometrics → calculates BMR (3 formula options: Mifflin, Harris-Benedict, Schofield) → computes TDEE via activity multiplier → applies goal adjustment (cut: −300 kcal, bulk: +300 kcal) → distributes macros using a default 25/20/55 (protein/fat/carb) % split → calculates SMAE food group portions and persists them as `PlanFoodGroup` rows.

2. **Dietocálculo / custom macros** (frontend-only step, no persistence until audit/PDF are requested): the nutritionist adjusts the kcal target (±500) and the macro % split in the wizard. These are sent as `protein_g`/`carbs_g`/`fats_g` **query params**, not stored on the `Plan` row.

3. **Nutritional audit** (`GET /plans/{id}/audit?protein_g=&carbs_g=&fats_g=`): validates macro energy consistency using the 4-4-9 rule. When the override query params are present, it recomputes SMAE portions on the fly for those macros (via `build_override_plan` in `smae_calculation_service.py`) instead of reading the persisted default portions.

4. **AI menu** (`POST /plans/{id}/menu/ai`, or `GET /plans/{id}/menu/ai/stream` for live progress, or `POST /plans/{id}/menu/ai/day/{dia}` to regenerate one day): calls Claude (`ai_menu_service.py`) once per day of the week, **in parallel** (`ThreadPoolExecutor`), with a timeout and one retry per day. The `/stream` endpoint is Server-Sent Events — since `EventSource` can't send custom headers, the JWT is passed as a `?token=` query param and verified via `verify_token_str` instead of the usual `Authorization` header. A day that fails after retrying degrades gracefully with an `"error"` field instead of crashing the whole batch.

5. **PDF export** (`GET /plans/{id}/pdf?menu=...&protein_g=&carbs_g=&fats_g=`): `pdf_service.py` uses ReportLab to generate a clinical report with patient demographics, BMI, macro audit, SMAE table, and optionally the AI-generated menu. Accepts the **same macro override** as `/audit` so the exported PDF reflects whatever the nutritionist last adjusted — this used to be a real bug (PDF always showed the default 25/20/55 macros, ignoring on-screen adjustments) and is now fixed. If no `perfil` is passed, it's read straight from `NutritionistProfile` in the DB (logo included).

## Code Structure

```
backend/
  main.py                  # App init, route registration, DB seeding + Postgres-only migrations on startup
  database.py              # SQLAlchemy engine + session, env-based DB URL
  models.py                # ORM: User, Patient, Plan, FoodGroup, FitnessReference, PlanFoodGroup, NutritionistProfile
  schemas/plan.py          # Pydantic request validation
  routes/
    auth.py                # Register, login, JWT (verify_token for headers, verify_token_str for SSE query params)
    calculator.py          # Plan CRUD, audit, PDF, AI menu (sync + SSE stream + per-day regen) endpoints
    patients.py            # Patient CRUD + per-patient plan history
    profile.py             # Nutritionist profile (name, cédula, clínica, logo) used in the PDF header
    stripe_routes.py        # Checkout session, webhook, Pro status
    password_reset.py       # Forgot/reset password via Resend email
    food.py                # Food group list
    smae.py                # Legacy nutritional audit endpoint (no auth) — calculator.py's /plans/{id}/audit is the one actually used by the frontend
  services/
    plan_service.py        # SMAE portion calculation (core business logic)
    metabolic_service.py   # BMR formula implementations
    smae_calculation_service.py  # Energy audit validation + build_override_plan helper
    pdf_service.py         # ReportLab PDF generation
    ai_menu_service.py     # Parallel Claude API calls for weekly meal plans (sync, streaming, and single-day variants)
  scripts/
    seed_smae.py           # Seeds food groups and default admin
  static/app/               # Built frontend output lives here in the container (git-ignored); index_backup.html is the old vanilla-JS SPA kept for reference

frontend/
  src/
    api/                    # axios client + one module per resource (auth, plans, patients, profile, menu, billing)
    store/authStore.ts       # Zustand store (JWT, username, is_pro, first_login) persisted to localStorage
    components/              # UI primitives (Button, Card, Field, Modal, Badge, Spinner, OnboardingModal, Logo)
    layout/AppShell.tsx       # Topbar + nav + onboarding modal wrapper for all authenticated routes
    features/
      auth/                   # Login, register, forgot/reset password
      dashboard/               # Metrics + recent patients/plans
      patients/                # CRUD + per-patient plan history
      profile/                 # Nutritionist profile + logo upload for PDF branding
      billing/                 # Free vs Pro, Stripe checkout
      plan/                    # The core wizard: Datos → Dietocálculo → Auditoría SMAE → Menú IA → Resumen/PDF
        steps/                  # One component per wizard step
        planMath.ts             # Pure functions: macro grams from %, OMS range checks, clinical alerts
  vite.config.ts             # base:'/app/' in prod (matches FastAPI mount point), '/' in dev; dev proxy to :8000
```

## SMAE System

SMAE is a Mexican dietetic food exchange system. `plan_service.py` maps macronutrient targets to portions across 8 food groups (leche, AOA, leguminosas, verduras, cereales, frutas, aceites, azúcares). Cereals and fruits auto-scale to close any caloric gap within a 3% tolerance. Goal mode (cut/bulk) selects low-fat vs. full-fat food variants. The frontend's Auditoría step lets the nutritionist further hand-edit individual SMAE row portions (scaling that row's kcal/protein/fat/carb proportionally) and "adjust Dietocálculo" back from the real resulting % split.

## AI Menu Response Shape

Claude returns JSON per day (may be wrapped in markdown code fences — the service strips these):
```json
{
  "dia": "Lunes",
  "comidas": [
    {"tiempo": "Desayuno", "kcal": 550, "itens": [
      {"alimento": "Avena con frutas", "quantidade_g": 80, "kcal": 300}
    ]}
  ],
  "macros": {"proteina_g": 140, "carb_g": 315, "gordura_g": 70, "kcal_total": 2380}
}
```
A day that failed to generate carries an `"error"` string field and empty `"comidas"` instead.

## CI/CD

GitHub Actions (`.github/workflows/sonar.yml`) runs SonarCloud static analysis on push to `main`. Deployment is to Railway via Docker; the multi-stage `Dockerfile` builds the frontend with Node, then copies the output into the Python image, which runs `uvicorn` on `$PORT` (default 8080).
