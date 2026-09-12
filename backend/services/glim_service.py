"""Criba de desnutrición según los criterios GLIM (Global Leadership
Initiative on Malnutrition) — Cederholm et al., Clin Nutr 2019, con la
actualización de 5 años (2024). Requiere al menos 1 criterio fenotípico y
1 criterio etiológico para diagnosticar desnutrición, con estadiamento de
gravedad basado en el criterio fenotípico más severo presente.

LIMITACIÓN CONOCIDA: el criterio fenotípico de "masa muscular reducida" no se
evalúa aquí — requiere bioimpedancia, DXA o circunferencia de pantorrilla, que
hoy no se capturan en el expediente. Un resultado negativo NO descarta
desnutrición si ese criterio no fue evaluado clínicamente; esto se refleja
explícitamente en la nota de salida.
"""
from datetime import datetime, timedelta


def _pct_weight_loss(weight_history: list[tuple[datetime, float]], current_weight: float, current_date: datetime):
    """weight_history: lista de (fecha, peso) de consultas anteriores a la actual,
    ordenadas o no. Retorna (pct_perdida, meses_transcurridos) usando como
    referencia el registro más antiguo dentro de los últimos ~6 meses (o el
    más antiguo disponible si no hay ninguno en esa ventana)."""
    candidates = [(fecha, peso) for fecha, peso in weight_history if peso and fecha < current_date]
    if not candidates:
        return None, None

    six_months_ago = current_date - timedelta(days=182)
    within_window = [c for c in candidates if c[0] >= six_months_ago]
    reference = min(within_window, key=lambda c: c[0]) if within_window else min(candidates, key=lambda c: c[0])

    ref_fecha, ref_peso = reference
    if ref_peso <= 0:
        return None, None

    months = max(1, round((current_date - ref_fecha).days / 30))
    pct = (ref_peso - current_weight) / ref_peso * 100
    return round(pct, 1), months


def calculate_glim(
    weight_history: list[tuple[datetime, float]],
    current_weight: float | None,
    height_cm: float | None,
    age: int | None,
    ingesta_reducida: str | None,
    carga_enfermedad_aguda: bool | None,
    current_date: datetime | None = None,
) -> dict:
    current_date = current_date or datetime.utcnow()

    pct_loss, months = (None, None)
    if current_weight:
        pct_loss, months = _pct_weight_loss(weight_history, current_weight, current_date)

    bmi = None
    if current_weight and height_cm:
        bmi = current_weight / ((height_cm / 100) ** 2)

    is_elderly = bool(age and age >= 70)
    bmi_cutoff_moderate = 22 if is_elderly else 20
    bmi_cutoff_severe = 20 if is_elderly else 18.5

    phenotypic = []
    if pct_loss is not None and pct_loss > 0:
        if months is not None and months <= 6:
            if pct_loss > 10:
                phenotypic.append({"code": "severe_weight_loss", "detail": f"Pérdida de {pct_loss}% en {months} meses (>10% en ≤6 meses)"})
            elif pct_loss > 5:
                phenotypic.append({"code": "moderate_weight_loss", "detail": f"Pérdida de {pct_loss}% en {months} meses (5-10% en ≤6 meses)"})
        elif months is not None:
            if pct_loss > 20:
                phenotypic.append({"code": "severe_weight_loss", "detail": f"Pérdida de {pct_loss}% en {months} meses (>20% en >6 meses)"})
            elif pct_loss > 10:
                phenotypic.append({"code": "moderate_weight_loss", "detail": f"Pérdida de {pct_loss}% en {months} meses (10-20% en >6 meses)"})

    if bmi is not None:
        if bmi < bmi_cutoff_severe:
            phenotypic.append({"code": "severe_low_bmi", "detail": f"IMC {bmi:.1f} (< {bmi_cutoff_severe})"})
        elif bmi < bmi_cutoff_moderate:
            phenotypic.append({"code": "moderate_low_bmi", "detail": f"IMC {bmi:.1f} (< {bmi_cutoff_moderate})"})

    etiologic = []
    if ingesta_reducida in ("leve", "severa"):
        etiologic.append({
            "code": "reduced_intake",
            "detail": f"Ingesta alimentaria reducida ({ingesta_reducida})",
        })
    if carga_enfermedad_aguda:
        etiologic.append({"code": "disease_burden", "detail": "Carga de enfermedad aguda/crónica con inflamación"})

    diagnosed = bool(phenotypic) and bool(etiologic)
    severity = None
    if diagnosed:
        severe_codes = {"severe_weight_loss", "severe_low_bmi"}
        severity = "severa" if any(p["code"] in severe_codes for p in phenotypic) else "moderada"

    return {
        "diagnosed": diagnosed,
        "severity": severity,
        "bmi": round(bmi, 1) if bmi is not None else None,
        "weight_loss_pct": pct_loss,
        "weight_loss_period_months": months,
        "phenotypic_criteria": phenotypic,
        "etiologic_criteria": etiologic,
        "note": (
            "Criba GLIM simplificada — no evalúa el criterio fenotípico de masa "
            "muscular reducida (requiere bioimpedancia, DXA o circunferencia de "
            "pantorrilla, no capturados hoy). Un resultado negativo no descarta "
            "desnutrición si ese criterio no fue evaluado clínicamente. Esto es un "
            "punto de partida, no un diagnóstico — requiere siempre criterio clínico."
        ),
    }
