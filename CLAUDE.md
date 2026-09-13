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

**Required environment variables**: `ANTHROPIC_API_KEY` (AI menu generation), `JWT_SECRET_KEY` (auth — the backend refuses to start if unset, since it signs every session token), `STRIPE_API_KEY`/`STRIPE_PRICE_ID`/`STRIPE_WEBHOOK_SECRET` (billing), `RESEND_API_KEY` (password reset emails), `PUBLIC_BASE_URL` (used to build Stripe checkout/reset-password links — defaults to the production Railway URL if unset), `USDA_FDC_API_KEY` (optional, free at https://fdc.nal.usda.gov/api-key-signup — powers the micronutrients spreadsheet; without it that feature reports itself as unconfigured instead of failing), `ADMIN_PASSWORD` (optional — sets the password for the auto-seeded `admin` user; falls back to a publicly-documented default with a startup warning if unset, same pattern as `JWT_SECRET_KEY` — **set this and rotate the password on any deployment that will hold real patient data**).

## Architecture Overview

NutriElite is a clinical nutrition SaaS with two parts:

- **Backend**: a **FastAPI** app (`backend/`) exposing the REST API and also serving the built frontend as static files under `/app`.
- **Frontend**: a **React + TypeScript + Vite** SPA (`frontend/`) — Tailwind v4 for styling, React Router, TanStack Query for server state, Zustand for auth/session state, Recharts for the audit charts.

There **is** a frontend build step now: in production the Dockerfile builds `frontend/` (`npm run build`) and copies the output into `backend/static/app/` (replacing the old vanilla-JS SPA, kept only as `backend/static/app/index_backup.html` for historical reference). That build output is git-ignored — it's generated at Docker build time, never committed. In local dev, run the Vite dev server (`npm run dev`) instead; it proxies API calls to the FastAPI server on `:8000` (see `frontend/vite.config.ts`).

The frontend's router uses `basename="/app"` in production (`import.meta.env.PROD`) to match how FastAPI mounts it, and `/` in dev where Vite serves it at the root.

**Database**: SQLite locally (`nutrielite.db`), PostgreSQL in production (Railway). The `DATABASE_URL` env var controls which is used; `postgres://` URIs are auto-converted to `postgresql://`. Incremental `ALTER TABLE` migrations in `backend/main.py` only run against Postgres (SQLite's `ADD COLUMN IF NOT EXISTS` syntax doesn't exist — a fresh SQLite DB already gets the full schema from `Base.metadata.create_all`).

## Key Data Flow

1. **Plan creation** (`POST /plan`): Receives patient anthropometrics → calculates GEB/BMR (formula options: Mifflin, Harris-Benedict [original 1919 rounded coefficients, not the 1984 revision — matches the clinical reference spreadsheets the project's nutritionists use], Schofield, Katch-McArdle, Cunningham) → computes GET via activity multiplier × 1.10 (fixed +10% for ETA, the thermic effect of food — always included, not optional) → applies goal adjustment (cut: −300 kcal, bulk: +300 kcal) → distributes macros using a default 25/20/55 (protein/fat/carb) % split → calculates SMAE food group portions and persists them as `PlanFoodGroup` rows. The UI labels this value "GEB" (not "TMB") to match current clinical terminology, though the API/DB field is still named `tmb` for backward compatibility.

2. **Dietocálculo / custom macros** (frontend-only step, no persistence until audit/PDF are requested): the nutritionist adjusts the kcal target (±500) and the macro % split in the wizard. These are sent as `protein_g`/`carbs_g`/`fats_g` **query params**, not stored on the `Plan` row.

3. **Nutritional audit** (`GET /plans/{id}/audit?protein_g=&carbs_g=&fats_g=`): validates macro energy consistency using the 4-4-9 rule. When the override query params are present, it recomputes SMAE portions on the fly for those macros (via `build_override_plan` in `smae_calculation_service.py`) instead of reading the persisted default portions.

4. **AI menu** (`POST /plans/{id}/menu/ai`, or `GET /plans/{id}/menu/ai/stream` for live progress, or `POST /plans/{id}/menu/ai/day/{dia}` to regenerate one day): calls Claude (`ai_menu_service.py`) once per day of the week, **in parallel** (`ThreadPoolExecutor`), with a timeout and one retry per day. The `/stream` endpoint is Server-Sent Events — since `EventSource` can't send custom headers, the JWT is passed as a `?token=` query param and verified via `verify_token_str` instead of the usual `Authorization` header. A day that fails after retrying degrades gracefully with an `"error"` field instead of crashing the whole batch.

5. **PDF export** (`GET /plans/{id}/pdf?menu=...&protein_g=&carbs_g=&fats_g=`): `pdf_service.py` uses ReportLab to generate a clinical report with patient demographics, BMI, macro audit, SMAE table, and optionally the AI-generated menu. Accepts the **same macro override** as `/audit` so the exported PDF reflects whatever the nutritionist last adjusted — this used to be a real bug (PDF always showed the default 25/20/55 macros, ignoring on-screen adjustments) and is now fixed. If no `perfil` is passed, it's read straight from `NutritionistProfile` in the DB (logo included).

6. **Clinical record** (`GET/PUT /patients/{id}/clinical-record`): one `ClinicalRecord` row per patient (NOM-004-SSA3-2012 aligned) — heredofamiliar/pathological/non-pathological history, allergies, current medications. Changes rarely; per-visit data lives in `Consultation` instead (ABCD methodology: Antropométricos/Bioquímicos/Clínicos/Dietéticos), via `GET/POST /patients/{id}/consultations` and `PUT/DELETE /consultations/{id}`. `Consultation.bioquimicos` is a JSON list of `{nombre, valor, unidad}` lab values — the frontend charts `peso` across consultations to show weight evolution.

7. **AI lab extraction** (`POST /patients/{id}/consultations/extract-labs`): sends a photo of a lab report to Claude (vision) and returns extracted `{nombre, valor, unidad}` values to prefill a consultation's `bioquimicos` — the nutritionist always reviews/edits before saving, this never writes directly to the record. See `lab_extraction_service.py`.

8. **Renal module (KDOQI)** (`POST /patients/{id}/renal-assessment`): `renal_service.calculate_renal_targets()` computes kcal/kg, protein g/kg, sodium/potassium/phosphorus (mg) and fluid (mL) targets from CKD stage (1/2/3a/3b/4/5) + dialysis modality (none/hemodialysis/peritoneal), adjusting potassium/phosphorus by lab values when provided (KDOQI does not recommend a universal restriction — it's individualized by serum level). When optional `height_cm`/`gender` are provided and the patient's actual weight is ≥125% of Devine ideal body weight, kcal/kg and protein/kg use an adjusted body weight instead (avoids overestimating needs in obesity) — unchanged otherwise. Results are explicitly framed as starting points requiring clinical judgment, not a diagnosis. Stored as `RenalAssessment` rows (history kept, not overwritten).

9. **Appointments** (`POST/GET/PUT/DELETE /appointments`, `POST /appointments/{id}/send-reminder`, `GET /appointments/due-reminders`): booking a `patient_id` + `scheduled_at` sends a confirmation email immediately (Resend) if the patient has one. There's no cron/task queue in this project, so reminders are on-demand — the frontend dashboard surfaces appointments due within 24h with a "send reminder" button; `due-reminders` is the endpoint a future scheduled job would poll instead.

10. **Recipes & shopping list** (`GET/POST/DELETE /recipes`, `POST /shopping-list`): `Recipe` rows are either system-seeded (`created_by=null`, see `seed_recipes.py`) or created by a nutritionist (`created_by=user_id`, private to them). The shopping list is **not** recipe-based — `shopping_list_service.build_shopping_list()` aggregates grams per unique food name straight out of a weekly AI menu's `semana` structure (same shape `ai_menu_service` returns), so it stays in sync with whatever the AI actually generated.

11. **Patient portal (public link)** (`POST /plans/{id}/share`, `GET /public/plans/{token}` — no auth): generates a `Plan.public_token` (only on request, not by default) and serves a sanitized read of that plan (first name only, goal, kcal target, weekly menu, shopping list) — no email/phone/clinical data. `Plan.weekly_menu` is persisted server-side whenever the AI menu is generated or a single day is regenerated (sync endpoint, SSE stream, and per-day endpoint all write it), which is also what makes the portal link always reflect the latest menu without the frontend re-sending anything. The same portal also lets the patient log a free-text food diary entry (`POST/GET /public/plans/{token}/food-log`, no auth, scoped to the plan's linked `Patient`) — the nutritionist reviews it authenticated via `GET /patients/{id}/food-log`.

12. **GLIM malnutrition screening** (`GET /patients/{id}/glim-assessment`): recomputed on demand from the patient's `Consultation` history — phenotypic criteria (weight loss %, low BMI, age-adjusted cutoffs) come from peso/talla already captured; etiologic criteria (reduced intake, disease burden) come from two fields captured per consultation (`ingesta_reducida`, `carga_enfermedad_aguda`). Muscle-mass phenotypic criterion is intentionally not evaluated (no bioimpedance/DXA data) and the response note says so explicitly — this is a screening aid, not a diagnosis.

13. **Student accounts & classrooms** (`User.role`: `professional`|`student`): registering as a student (`POST /register` with `role: "student"`) auto-seeds 3 clearly-labeled fictional practice patients (`student_service.seed_practice_patients`) so they can practice TMB/GET/SMAE calculations without real clinical data. `Classroom`/`ClassroomEnrollment` (`/classrooms*` routes) let a professor create a class with a join code; a professor can only read (never edit) an enrolled student's practice patients/plans, gated by checking both classroom ownership and enrollment on every request.

14. **Micronutrients spreadsheet** (`GET /plans/{id}/menu/micronutrients`, `GET /plans/{id}/menu/micronutrients/xlsx`): once a weekly menu exists (acervo or AI, same `{alimento, quantidade_g}` item shape either way), `micronutrient_service.calculate_plan_micronutrients()` looks up each ingredient's per-100g values in `IngredientNutrient` — a cache-aside table backed by the USDA FoodData Central public API (`usda_client.py`, needs `USDA_FDC_API_KEY`) — and scales/sums them per day and per week. Ingredients with no confident USDA match are reported in `ingredientes_sin_datos`, never silently zeroed. The JSON endpoint feeds the Resumen step's in-app table; the `/xlsx` endpoint (`micronutrient_xlsx.py`, via openpyxl) generates the downloadable spreadsheet, same pattern as the clinical PDF export.

## Code Structure

```
backend/
  main.py                  # App init, route registration, DB seeding + Postgres-only migrations on startup
  database.py              # SQLAlchemy engine + session, env-based DB URL
  models.py                # ORM: User (incl. email_reminders_enabled/locale/timezone account settings), Patient, Plan, FoodGroup, FitnessReference, PlanFoodGroup, NutritionistProfile, ClinicalRecord, Consultation, RenalAssessment, Appointment, Recipe, Classroom, ClassroomEnrollment, PathologyTemplate, RecipeFavorite, PlanPreferences, FoodLogEntry, IngredientNutrient
  schemas/
    plan.py                # Pydantic request validation for plans
    clinical.py            # Pydantic schemas for clinical record, consultations (incl. GLIM inputs), renal assessment
    appointments.py        # Pydantic schemas for appointments
    recipes.py             # Pydantic schemas for recipes + shopping list request
    classroom.py           # Pydantic schemas for classrooms/enrollments
    food_log.py            # Pydantic schemas for the patient food diary (FoodLogEntry)
  routes/
    auth.py                # Register (role professional|student), login, JWT (verify_token for headers, verify_token_str for SSE query params), account settings (email reminders toggle, locale, timezone), change password, export data, delete account
    calculator.py          # Plan CRUD, audit, PDF, AI menu (sync + SSE stream + per-day regen), plan sharing (/plans/{id}/share)
    patients.py            # Patient CRUD + per-patient plan history
    clinical.py            # Clinical record, consultations, AI lab extraction, renal (KDOQI) assessment, GLIM malnutrition screening, nutritionist's view of the food diary
    appointments.py        # Appointment CRUD + email reminders
    recipes.py             # Recipe CRUD + shopping list generation
    classroom.py           # Classrooms, join codes, professor's read-only view of student practice data
    reference.py           # Static reference/study content (BMR formulas, activity factors, SMAE guide, KDOQI summary)
    public.py              # Unauthenticated /public/plans/{token} — patient portal, appointment booking, food diary logging
    profile.py             # Nutritionist profile (name, cédula, clínica, logo) used in the PDF header
    stripe_routes.py        # Checkout session, webhook, Pro status
    password_reset.py       # Forgot/reset password via Resend email
    food.py                # Food group list (authenticated)
  services/
    plan_service.py        # SMAE portion calculation (core business logic) — includes an energy-closure step that adjusts cereales/frutas to bring the total within ~3% of the GET target
    metabolic_service.py   # BMR formula implementations
    smae_calculation_service.py  # Energy audit validation + build_override_plan helper
    pdf_service.py         # ReportLab PDF generation
    ai_menu_service.py     # Parallel Claude API calls for weekly meal plans (sync, streaming, and single-day variants); validates calorie-density plausibility and item/day kcal consistency before accepting a day
    renal_service.py       # KDOQI 2020-based CKD nutrition target calculations, incl. adjusted body weight for obesity (Devine IBW + 25% rule) when height/gender are provided
    glim_service.py        # GLIM malnutrition screening (phenotypic + etiologic criteria, severity staging) from consultation history
    lab_extraction_service.py  # Claude vision call to read lab values from a photo
    email_service.py       # Shared Resend wrapper + branded HTML template (used by appointments; password_reset.py predates it and has its own inline version)
    shopping_list_service.py  # Aggregates a weekly AI menu into a shopping list
    student_service.py     # Seeds fictional practice patients for new student accounts
    usda_client.py         # Thin USDA FoodData Central API client (per-100g nutrient lookup by food name)
    micronutrient_service.py  # Cache-aside per-ingredient nutrient lookup + per-plan weekly aggregation
    micronutrient_xlsx.py  # Builds the downloadable micronutrients spreadsheet (openpyxl)
  scripts/
    seed_smae.py           # Seeds food groups and default admin
    seed_recipes.py        # Seeds the system recipe bank (created_by=null)
  tests/                   # pytest suite — metabolic formulas, SMAE seed 4-4-9 consistency, calculate_smae_portions, renal_service, AI menu plausibility validation
  static/app/               # Built frontend output lives here in the container (git-ignored); index_backup.html is the old vanilla-JS SPA kept for reference

frontend/
  src/
    api/                    # axios client + one module per resource (auth, plans, patients, profile, menu, billing, clinical, appointments, recipes, classroom, reference, public)
    store/authStore.ts       # Zustand store (JWT, username, is_pro, first_login, role) persisted to localStorage
    components/              # UI primitives (Button, Card, Field, Modal, Badge, Spinner, OnboardingModal, Logo)
    layout/AppShell.tsx       # Topbar + nav + onboarding modal wrapper for all authenticated routes
    features/
      auth/                   # Login, register (role selector), forgot/reset password
      dashboard/               # Metrics + recent patients/plans + upcoming-appointments widget
      patients/                # CRUD + per-patient plan history; tabs/ holds ClinicalRecordTab, ConsultationsTab (+ weight evolution chart, AI lab photo extraction, appointment scheduling), RenalTab
      profile/                 # Nutritionist profile + logo upload for PDF branding
      billing/                 # Free vs Pro, Stripe checkout
      plan/                    # The core wizard: Datos → Dietocálculo → Auditoría SMAE → Menú IA → Resumen/PDF (+ share-link generation)
        steps/                  # One component per wizard step
        planMath.ts             # Pure functions: macro grams from %, OMS range checks, clinical alerts
      reference/               # Static-content study/reference page (formulas, SMAE guide, KDOQI table)
      classroom/                # Classroom mode — role-dependent view (professor creates/manages, student joins by code)
      public/                  # PublicPlanPage — no-auth route rendered at /portal/:token (outside ProtectedRoute)
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

GitHub Actions (`.github/workflows/sonar.yml`) runs the backend pytest suite (`backend/tests/`) on every push and pull request, and SonarCloud static analysis on push to `main` only. Run tests locally with `pip install -r requirements-dev.txt && pytest`. Deployment is to Railway via Docker; the multi-stage `Dockerfile` builds the frontend with Node, then copies the output into the Python image, which runs `uvicorn` on `$PORT` (default 8080).

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues (`galleazzijuniorsoftwareenginer/NutriElite`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at the repo root (created lazily as needed). See `docs/agents/domain.md`.
