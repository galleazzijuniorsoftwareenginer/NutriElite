def calculate_tmb(weight, height, age, gender, formula, body_fat_percent=None):

    gender = gender.lower()
    formula = formula.lower()

    # =========================
    # Mifflin-St Jeor (adultos)
    # =========================
    if formula == "mifflin":
        if gender == "male":
            return (10 * weight) + (6.25 * height) - (5 * age) + 5
        else:
            return (10 * weight) + (6.25 * height) - (5 * age) - 161

    # =========================
    # Harris-Benedict (adultos)
    # =========================
    elif formula == "harris":
        if gender == "male":
            return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        else:
            return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

    # =========================
    # Schofield (peso) — WHO/FAO/UNU 1985, las 6 franjas etarias completas
    # =========================
    elif formula == "schofield":
        if age < 3:
            return (59.512 * weight - 30.4) if gender == "male" else (58.317 * weight - 31.1)
        elif age <= 10:
            return (22.7 * weight) + 495 if gender == "male" else (22.5 * weight) + 499
        elif age <= 18:
            return (17.5 * weight) + 651 if gender == "male" else (12.2 * weight) + 746
        elif age <= 30:
            return (15.057 * weight) + 692.2 if gender == "male" else (14.818 * weight) + 486.6
        elif age <= 60:
            return (11.472 * weight) + 873.1 if gender == "male" else (8.126 * weight) + 845.6
        else:
            return (11.711 * weight) + 587.7 if gender == "male" else (9.082 * weight) + 658.5

    # =========================
    # Katch-McArdle — usa masa magra (requiere % grasa corporal)
    # =========================
    elif formula == "katch":
        if body_fat_percent is None:
            raise ValueError("Katch-McArdle requiere % de grasa corporal")
        lean_mass = weight * (1 - body_fat_percent / 100)
        return 370 + (21.6 * lean_mass)

    # =========================
    # Cunningham (1980) — usa masa magra (requiere % grasa corporal)
    # =========================
    elif formula == "cunningham":
        if body_fat_percent is None:
            raise ValueError("Cunningham requiere % de grasa corporal")
        lean_mass = weight * (1 - body_fat_percent / 100)
        return 500 + (22 * lean_mass)

    else:
        raise ValueError("Fórmula inválida")
