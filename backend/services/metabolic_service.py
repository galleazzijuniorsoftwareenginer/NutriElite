def calculate_tmb(weight, height, age, gender, formula):

    gender = gender.lower()
    formula = formula.lower()

    # =========================
    # MIFflin
    # =========================
    if formula == "mifflin":
        if gender == "male":
            return (10 * weight) + (6.25 * height) - (5 * age) + 5
        else:
            return (10 * weight) + (6.25 * height) - (5 * age) - 161

    # =========================
    # Harris-Benedict
    # =========================
    elif formula == "harris":
        if gender == "male":
            return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        else:
            return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)

    # =========================
    # Schofield (Pediátrica)
    # =========================
    elif formula == "schofield":

        if 3 <= age <= 10:
            if gender == "male":
                return (22.7 * weight) + 495
            else:
                return (22.5 * weight) + 499

        elif 10 < age <= 18:
            if gender == "male":
                return (17.5 * weight) + 651
            else:
                return (12.2 * weight) + 746

        else:
            raise ValueError("Schofield é apenas para 3–18 anos")

    else:
        raise ValueError("Fórmula inválida")
