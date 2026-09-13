import pytest

from backend.services.metabolic_service import calculate_tmb


def test_mifflin_male_reference_value():
    # Hombre 30 años, 80kg, 180cm — valor de referencia calculado a mano con
    # la fórmula publicada: (10*80)+(6.25*180)-(5*30)+5
    tmb = calculate_tmb(80, 180, 30, "male", "mifflin")
    assert tmb == pytest.approx(1780, abs=0.5)


def test_mifflin_female_reference_value():
    # (10*65)+(6.25*165)-(5*28)-161
    tmb = calculate_tmb(65, 165, 28, "female", "mifflin")
    assert tmb == pytest.approx(1380.25, abs=0.5)


def test_harris_benedict_male_reference_value():
    # 66.473+(13.752*80)+(5.003*180)-(6.775*30)
    tmb = calculate_tmb(80, 180, 30, "male", "harris")
    assert tmb == pytest.approx(1863.923, abs=0.5)


def test_harris_benedict_female_reference_value():
    # 655.1+(9.563*65)+(1.85*165)-(4.676*28)
    tmb = calculate_tmb(65, 165, 28, "female", "harris")
    assert tmb == pytest.approx(1451.017, abs=0.5)


def test_schofield_adult_uses_15_30_band():
    tmb_male = calculate_tmb(70, 170, 25, "male", "schofield")
    assert tmb_male == pytest.approx(15.057 * 70 + 692.2, abs=0.5)


def test_schofield_pediatric_3_10_band():
    tmb = calculate_tmb(25, 120, 7, "male", "schofield")
    assert tmb == pytest.approx(22.7 * 25 + 495, abs=0.5)


def test_katch_mcardle_requires_body_fat():
    with pytest.raises(ValueError):
        calculate_tmb(80, 180, 30, "male", "katch", body_fat_percent=None)


def test_katch_mcardle_uses_lean_mass():
    tmb = calculate_tmb(80, 180, 30, "male", "katch", body_fat_percent=20)
    lean_mass = 80 * 0.8
    assert tmb == pytest.approx(370 + 21.6 * lean_mass, abs=0.5)


def test_cunningham_uses_lean_mass():
    tmb = calculate_tmb(80, 180, 30, "male", "cunningham", body_fat_percent=20)
    lean_mass = 80 * 0.8
    assert tmb == pytest.approx(500 + 22 * lean_mass, abs=0.5)


def test_invalid_formula_raises():
    with pytest.raises(ValueError):
        calculate_tmb(80, 180, 30, "male", "not-a-formula")
