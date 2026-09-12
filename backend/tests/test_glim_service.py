from datetime import datetime, timedelta

from backend.services.glim_service import calculate_glim


def test_no_criteria_no_diagnosis():
    result = calculate_glim(
        weight_history=[],
        current_weight=70,
        height_cm=170,
        age=40,
        ingesta_reducida="no",
        carga_enfermedad_aguda=False,
    )
    assert result["diagnosed"] is False
    assert result["severity"] is None


def test_only_phenotypic_without_etiologic_not_diagnosed():
    now = datetime.utcnow()
    history = [(now - timedelta(days=90), 80)]  # perdió 10kg de 80kg en 3 meses = 12.5%
    result = calculate_glim(
        weight_history=history,
        current_weight=70,
        height_cm=170,
        age=40,
        ingesta_reducida="no",
        carga_enfermedad_aguda=False,
        current_date=now,
    )
    assert len(result["phenotypic_criteria"]) > 0
    assert result["diagnosed"] is False


def test_severe_weight_loss_plus_reduced_intake_diagnoses_severe():
    now = datetime.utcnow()
    history = [(now - timedelta(days=90), 80)]  # 12.5% en 3 meses -> severo (>10% en <=6m)
    result = calculate_glim(
        weight_history=history,
        current_weight=70,
        height_cm=170,
        age=40,
        ingesta_reducida="severa",
        carga_enfermedad_aguda=False,
        current_date=now,
    )
    assert result["diagnosed"] is True
    assert result["severity"] == "severa"
    assert result["weight_loss_pct"] == 12.5


def test_low_bmi_plus_disease_burden_diagnoses_moderate():
    result = calculate_glim(
        weight_history=[],
        current_weight=52,
        height_cm=170,  # IMC ~18.0 -> bajo (moderado, <20 pero no <18.5... calc)
        age=40,
        ingesta_reducida="no",
        carga_enfermedad_aguda=True,
    )
    assert result["bmi"] is not None
    assert result["diagnosed"] is True


def test_elderly_uses_higher_bmi_cutoffs():
    # IMC 21 es normal para un adulto pero bajo (<22) para un anciano
    result_adult = calculate_glim(
        weight_history=[], current_weight=60.7, height_cm=170, age=40,
        ingesta_reducida="leve", carga_enfermedad_aguda=False,
    )
    result_elderly = calculate_glim(
        weight_history=[], current_weight=60.7, height_cm=170, age=75,
        ingesta_reducida="leve", carga_enfermedad_aguda=False,
    )
    assert len(result_adult["phenotypic_criteria"]) == 0
    assert len(result_elderly["phenotypic_criteria"]) > 0


def test_missing_height_or_weight_skips_bmi():
    result = calculate_glim(
        weight_history=[], current_weight=None, height_cm=None, age=40,
        ingesta_reducida="no", carga_enfermedad_aguda=False,
    )
    assert result["bmi"] is None
    assert result["diagnosed"] is False
