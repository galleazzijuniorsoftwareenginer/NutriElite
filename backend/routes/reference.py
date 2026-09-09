from fastapi import APIRouter, Depends
from backend.routes.auth import verify_token

router = APIRouter(prefix="/reference")

BMR_FORMULAS = [
    {
        "nombre": "Mifflin-St Jeor",
        "cuando_usar": "Fórmula por defecto recomendada para adultos — la más precisa según la evidencia actual.",
        "formula_hombre": "(10 × peso kg) + (6.25 × talla cm) − (5 × edad) + 5",
        "formula_mujer": "(10 × peso kg) + (6.25 × talla cm) − (5 × edad) − 161",
    },
    {
        "nombre": "Harris-Benedict",
        "cuando_usar": "Fórmula clásica, aún usada en algunos protocolos clínicos e investigación.",
        "formula_hombre": "88.362 + (13.397 × peso kg) + (4.799 × talla cm) − (5.677 × edad)",
        "formula_mujer": "447.593 + (9.247 × peso kg) + (3.098 × talla cm) − (4.330 × edad)",
    },
    {
        "nombre": "Schofield (pediátrica)",
        "cuando_usar": "Para pacientes de 3 a 18 años — la Mifflin/Harris-Benedict no están validadas en población pediátrica.",
        "formula_hombre": "3-10 años: (22.7 × peso) + 495 · 10-18 años: (17.5 × peso) + 651",
        "formula_mujer": "3-10 años: (22.5 × peso) + 499 · 10-18 años: (12.2 × peso) + 746",
    },
]

ACTIVITY_MULTIPLIERS = [
    {"nivel": "Sedentario", "factor": 1.2, "descripcion": "Poco o ningún ejercicio, trabajo de oficina"},
    {"nivel": "Ligero", "factor": 1.375, "descripcion": "Ejercicio ligero 1-3 días/semana"},
    {"nivel": "Moderado", "factor": 1.55, "descripcion": "Ejercicio moderado 3-5 días/semana"},
    {"nivel": "Intenso", "factor": 1.725, "descripcion": "Ejercicio intenso 6-7 días/semana"},
    {"nivel": "Muy intenso", "factor": 1.9, "descripcion": "Ejercicio muy intenso, trabajo físico"},
]

SMAE_GROUPS_GUIDE = [
    {"grupo": "Verduras", "rol": "Fibra, vitaminas y minerales — porciones libres o casi libres en la mayoría de los planes."},
    {"grupo": "Frutas", "rol": "Carbohidratos + fibra — aportan ~20% de los carbohidratos restantes tras cereales."},
    {"grupo": "Cereales y tubérculos", "rol": "Principal fuente de carbohidratos — ~80% de los carbohidratos restantes."},
    {"grupo": "Leguminosas", "rol": "Proteína vegetal + carbohidrato — cubre ~30% de la proteína restante tras AOA."},
    {"grupo": "Alimentos de origen animal (AOA)", "rol": "Principal fuente de proteína — ~70% de la proteína restante, variantes por % de grasa."},
    {"grupo": "Leche", "rol": "Calcio + proteína — porciones fijas (típicamente 2), variante según objetivo."},
    {"grupo": "Aceites y grasas", "rol": "Cierra el requerimiento de grasas restante tras las demás fuentes."},
    {"grupo": "Azúcares", "rol": "Porción fija pequeña — flexibilidad calórica, no base del plan."},
]

KDOQI_SUMMARY = [
    {"etapa": "1-2", "tfg": "≥60", "proteina_g_kg": "0.8 (sin restricción)", "nota": "Enfocarse en causa base y factores de riesgo cardiovascular."},
    {"etapa": "3a-3b", "tfg": "30-59", "proteina_g_kg": "0.55-0.60", "nota": "Restricción proteica moderada para retrasar progresión, en paciente estable."},
    {"etapa": "4", "tfg": "15-29", "proteina_g_kg": "0.55-0.60", "nota": "Preparar para terapia de reemplazo renal si progresa."},
    {"etapa": "5 (sin diálisis)", "tfg": "<15", "proteina_g_kg": "0.55-0.60", "nota": "Vigilar estado nutricional de cerca — riesgo de desnutrición."},
    {"etapa": "5D Hemodiálisis", "tfg": "—", "proteina_g_kg": "≥1.2", "nota": "Proteína elevada por pérdidas del procedimiento."},
    {"etapa": "5D Peritoneal", "tfg": "—", "proteina_g_kg": "≥1.2", "nota": "Considerar calorías absorbidas del dializado."},
]


@router.get("/guide")
def get_reference_guide(token: dict = Depends(verify_token)):
    return {
        "bmr_formulas": BMR_FORMULAS,
        "activity_multipliers": ACTIVITY_MULTIPLIERS,
        "smae_groups_guide": SMAE_GROUPS_GUIDE,
        "kdoqi_summary": KDOQI_SUMMARY,
    }
