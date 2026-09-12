"""Cálculo de metas nutricionales para Enfermedad Renal Crónica (ERC),
basado en las guías KDOQI 2020 Clinical Practice Guideline for Nutrition in CKD.

IMPORTANTE: estas son metas iniciales orientativas, no un diagnóstico. Siempre
deben ajustarse con criterio clínico individual — especialmente potasio y
fósforo, que dependen de laboratorios reales del paciente, y líquidos, que
depende de diuresis residual y estado de volumen.
"""

VALID_STAGES = {"1", "2", "3a", "3b", "4", "5"}
VALID_MODALITIES = {"none", "hemodialysis", "peritoneal"}

# Proteína g/kg/día — KDOQI 2020, paciente metabólicamente estable, no diabético.
PROTEIN_G_PER_KG = {
    "1": 0.8,
    "2": 0.8,
    "3a": 0.6,
    "3b": 0.6,
    "4": 0.6,
    "5": 0.6,
}
PROTEIN_G_PER_KG_DIALYSIS = {
    "hemodialysis": 1.2,
    "peritoneal": 1.2,
}

SODIUM_MG = 2300  # KDOQI 2020: <100 mmol/día (~2300 mg) para ERC 1-5D y post-trasplante


def calculate_adjusted_body_weight(weight: float, height_cm: float | None, gender: str | None) -> tuple[float, str | None]:
    """Peso corporal ajustado para obesidad — evita sobreestimar kcal/proteína
    en pacientes obesos usando el peso real bruto. Fórmula estándar usada en
    nutrición clínica (KDOQI no fija una única ecuación, pero recomienda
    ajustar por peso ideal en obesidad): peso ideal por Devine, y si el peso
    real es ≥125% del ideal, aBW = IBW + 0.25 × (peso real − IBW).
    Sin talla/sexo no hay forma de calcular IBW, así que se usa el peso real
    (comportamiento previo, sin cambios) y no se ajusta nada."""
    if not height_cm or height_cm <= 0 or gender not in ("male", "female"):
        return weight, None

    height_in = height_cm / 2.54
    extra_in = max(0.0, height_in - 60)
    ibw = (50.0 if gender == "male" else 45.5) + 2.3 * extra_in

    if weight >= 1.25 * ibw:
        adjusted = round(ibw + 0.25 * (weight - ibw), 1)
        note = (
            f"Peso corporal ajustado por obesidad: {adjusted}kg (peso ideal {ibw:.1f}kg + 25% del "
            f"exceso sobre peso real {weight}kg) — se usa este valor para kcal/kg y proteína/kg en "
            "vez del peso real bruto, evitando sobreestimar necesidades."
        )
        return adjusted, note

    return weight, None


def calculate_renal_targets(
    ckd_stage: str,
    dialysis_modality: str,
    weight: float,
    age: int | None = None,
    potassium_meq_l: float | None = None,
    phosphorus_mg_dl: float | None = None,
    height_cm: float | None = None,
    gender: str | None = None,
) -> dict:
    if ckd_stage not in VALID_STAGES:
        raise ValueError(f"Etapa de ERC inválida: {ckd_stage}")
    if dialysis_modality not in VALID_MODALITIES:
        raise ValueError(f"Modalidad de diálisis inválida: {dialysis_modality}")
    if weight <= 0:
        raise ValueError("El peso debe ser mayor a 0")

    notes = []

    dosing_weight, adjusted_note = calculate_adjusted_body_weight(weight, height_cm, gender)
    if adjusted_note:
        notes.append(adjusted_note)

    # ---- Energía (kcal/kg) ----
    # KDOQI 2020: 25-35 kcal/kg/día según edad, sexo, actividad y objetivo de peso.
    kcal_per_kg = 30.0 if (age is not None and age >= 60) else 32.0
    if dialysis_modality == "peritoneal":
        notes.append(
            "En diálisis peritoneal, parte de la energía proviene de la glucosa "
            "absorbida del dializado — considera reducir el aporte calórico de "
            "los alimentos si hay ganancia de peso excesiva."
        )
    kcal_total = round(kcal_per_kg * dosing_weight, 0)

    # ---- Proteína (g/kg) ----
    if dialysis_modality in PROTEIN_G_PER_KG_DIALYSIS:
        protein_g_per_kg = PROTEIN_G_PER_KG_DIALYSIS[dialysis_modality]
        notes.append(
            "Meta de proteína elevada por diálisis (KDOQI recomienda ≥1.2 g/kg/día "
            "por las pérdidas del procedimiento)."
        )
    else:
        protein_g_per_kg = PROTEIN_G_PER_KG[ckd_stage]
        if ckd_stage in ("3a", "3b", "4", "5"):
            notes.append(
                "Restricción proteica moderada (KDOQI 2020, ERC 3-5 no dialítica) "
                "para retrasar progresión — requiere paciente metabólicamente estable "
                "y sin desnutrición."
            )
    protein_g_total = round(protein_g_per_kg * dosing_weight, 1)

    # ---- Sodio ----
    sodium_mg = SODIUM_MG

    # ---- Potasio — individualizado según laboratorio, no restricción universal ----
    if potassium_meq_l is None:
        potassium_mg = 3000.0
        notes.append(
            "Sin laboratorio de potasio: se usa una meta moderada de referencia. "
            "Ajusta en cuanto tengas el valor sérico real."
        )
    elif potassium_meq_l > 5.5:
        potassium_mg = 2000.0
        notes.append(f"Potasio sérico elevado ({potassium_meq_l} mEq/L) — restricción estricta.")
    elif potassium_meq_l >= 5.0:
        potassium_mg = 2700.0
        notes.append(f"Potasio sérico límite alto ({potassium_meq_l} mEq/L) — restricción moderada.")
    else:
        potassium_mg = 3500.0
        notes.append(f"Potasio sérico normal ({potassium_meq_l} mEq/L) — sin restricción estricta.")

    # ---- Fósforo — individualizado según laboratorio ----
    if phosphorus_mg_dl is None:
        phosphorus_mg = 1000.0
        notes.append(
            "Sin laboratorio de fósforo: se usa una meta moderada de referencia. "
            "Ajusta en cuanto tengas el valor sérico real."
        )
    elif phosphorus_mg_dl > 4.5:
        phosphorus_mg = 800.0
        notes.append(f"Fósforo sérico elevado ({phosphorus_mg_dl} mg/dL) — restricción a 800-1000 mg/día.")
    else:
        phosphorus_mg = 1200.0
        notes.append(f"Fósforo sérico normal ({phosphorus_mg_dl} mg/dL) — restricción leve preventiva.")

    # ---- Líquidos — solo relevante en etapas avanzadas / diálisis ----
    if dialysis_modality == "hemodialysis":
        fluid_ml = 1000.0
        notes.append("Restricción de líquidos típica en hemodiálisis — ajustar según diuresis residual.")
    elif dialysis_modality == "peritoneal":
        fluid_ml = 2000.0
        notes.append("La diálisis peritoneal continua suele permitir más líquidos — ajustar según ultrafiltración.")
    elif ckd_stage == "5":
        fluid_ml = 1500.0
        notes.append("ERC etapa 5 sin diálisis — vigilar balance de líquidos y edema.")
    else:
        fluid_ml = None

    return {
        "kcal_per_kg": kcal_per_kg,
        "kcal_total": kcal_total,
        "protein_g_per_kg": protein_g_per_kg,
        "protein_g_total": protein_g_total,
        "sodium_mg": sodium_mg,
        "potassium_mg": potassium_mg,
        "phosphorus_mg": phosphorus_mg,
        "fluid_ml": fluid_ml,
        "dosing_weight_kg": dosing_weight,
        "notes": " ".join(notes),
    }
