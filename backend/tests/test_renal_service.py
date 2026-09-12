import pytest

from backend.services.renal_service import calculate_adjusted_body_weight, calculate_renal_targets


def test_invalid_ckd_stage_raises():
    with pytest.raises(ValueError):
        calculate_renal_targets("9", "none", weight=70)


def test_invalid_dialysis_modality_raises():
    with pytest.raises(ValueError):
        calculate_renal_targets("3a", "not-a-modality", weight=70)


def test_dialysis_overrides_protein_target():
    result = calculate_renal_targets("3a", "hemodialysis", weight=70)
    assert result["protein_g_per_kg"] == 1.2
    assert result["protein_g_total"] == pytest.approx(84.0, abs=0.1)


def test_non_dialysis_stage_3_uses_restricted_protein():
    result = calculate_renal_targets("3a", "none", weight=70)
    assert result["protein_g_per_kg"] == 0.6


def test_potassium_restriction_scales_with_lab_value():
    normal = calculate_renal_targets("3a", "none", weight=70, potassium_meq_l=4.5)
    high = calculate_renal_targets("3a", "none", weight=70, potassium_meq_l=6.0)
    assert high["potassium_mg"] < normal["potassium_mg"]


def test_adjusted_body_weight_unused_without_height_or_gender():
    weight, note = calculate_adjusted_body_weight(110, None, None)
    assert weight == 110
    assert note is None


def test_adjusted_body_weight_kicks_in_for_obesity():
    # 110kg, 165cm, hombre — IBW (Devine) ~61.4kg, 125% ~76.75kg, 110kg lo supera
    weight, note = calculate_adjusted_body_weight(110, 165, "male")
    assert weight < 110
    assert note is not None


def test_adjusted_body_weight_unchanged_for_normal_weight():
    weight, note = calculate_adjusted_body_weight(70, 175, "male")
    assert weight == 70
    assert note is None


def test_renal_targets_use_dosing_weight_for_kcal_and_protein():
    result = calculate_renal_targets("3a", "none", weight=110, height_cm=165, gender="male")
    assert result["dosing_weight_kg"] < 110
    assert result["kcal_total"] == pytest.approx(result["kcal_per_kg"] * result["dosing_weight_kg"], abs=1)
