def calculate_body_fat_jp3(folds_sum_mm: float, age: int, gender: str) -> float:
    """Protocolo Jackson-Pollock 3 sitios (Jackson & Pollock 1978 para hombres,
    Jackson/Pollock/Ward 1980 para mujeres) + ecuación de Siri (1961) para
    convertir densidad corporal en % de grasa.

    Hombre: pliegues pecho + abdominal + muslo
    Mujer: pliegues tríceps + suprailíaco + muslo
    """
    gender = gender.lower()
    s = folds_sum_mm
    if gender == "male":
        body_density = 1.10938 - (0.0008267 * s) + (0.0000016 * s ** 2) - (0.0002574 * age)
    else:
        body_density = 1.0994921 - (0.0009929 * s) + (0.0000023 * s ** 2) - (0.0001392 * age)

    body_fat_pct = (495 / body_density) - 450
    return round(body_fat_pct, 1)
