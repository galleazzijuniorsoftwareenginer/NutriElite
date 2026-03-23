from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from io import BytesIO
from backend.services.smae_calculation_service import SMAECalculationService

def generate_plan_pdf(plan, portions, menu_data=None):

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer)
    elements = []

    styles = getSampleStyleSheet()

    from backend.database import SessionLocal

    db = SessionLocal()
    audit = SMAECalculationService.calculate(plan.id, db)
    db.close()

    height_m = plan.height / 100
    bmi = round(plan.weight / (height_m ** 2), 2)

    if bmi < 18.5:
        bmi_class = "Bajo peso"
    elif bmi < 25:
        bmi_class = "Normal"
    elif bmi < 30:
        bmi_class = "Sobrepeso"
    else:
        bmi_class = "Obesidad"

    closure_percent = round(
        (audit["energy_validation"]["kcal_from_macros"] / plan.get) * 100,
        1
    )

    elements.append(Paragraph("INFORME NUTRICIONAL CLÍNICO", styles["Title"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph("<b>Datos del Paciente</b>", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    patient_data = [
    ["Paciente:", f"{plan.patient_name}"],
    ["Email:", f"{plan.patient_email}"],
    ["Teléfono:", f"{plan.patient_phone}"],
    ["Edad:", f"{plan.age} años"],
    ["Género:", f"{plan.gender}"],
    ["Peso:", f"{plan.weight} kg"],
    ["Altura:", f"{plan.height} cm"],
    ["Nivel de actividad:", f"{plan.activity_level}"],
    ["Objetivo:", f"{plan.goal}"],
    ["Fecha:", f"{plan.created_at}"],
    ]

    patient_table = Table(patient_data, colWidths=[150, 300])

    patient_table.setStyle(TableStyle([
    ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))

    elements.append(patient_table)
    elements.append(Spacer(1, 0.4 * inch))
    elements.append(Paragraph("Evaluación Antropométrica", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))
    elements.append(Paragraph(f"IMC: {bmi}", styles["Normal"]))
    elements.append(Paragraph(f"Clasificación: {bmi_class}", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    

    elements.append(Paragraph("Auditoría Nutricional", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    protein_g = audit["totals"]["protein_g"]
    fats_g = audit["totals"]["fats_g"]
    carbs_g = audit["totals"]["carbs_g"]

    protein_kcal = protein_g * 4
    fats_kcal = fats_g * 9
    carbs_kcal = carbs_g * 4

    total_kcal = protein_kcal + fats_kcal + carbs_kcal

    protein_pct = round((protein_kcal / total_kcal) * 100, 1) if total_kcal else 0
    fats_pct = round((fats_kcal / total_kcal) * 100, 1) if total_kcal else 0
    carbs_pct = round((carbs_kcal / total_kcal) * 100, 1) if total_kcal else 0

    macro_table_data = [
        ["Macronutriente", "Gramos", "Kcal", "%"],
        ["Proteínas", round(protein_g,1), round(protein_kcal,1), f"{protein_pct}%"],
        ["Grasas", round(fats_g,1), round(fats_kcal,1), f"{fats_pct}%"],
        ["Carbohidratos", round(carbs_g,1), round(carbs_kcal,1), f"{carbs_pct}%"],
        ["Total", "", round(total_kcal,1), "100%"],
    ]

    macro_table = Table(macro_table_data, repeatRows=1)

    macro_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("ALIGN", (1,1), (-1,-1), "CENTER"),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ]))

    elements.append(macro_table)
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph("Distribución SMAE", styles["Heading2"]))
    elements.append(Spacer(1, 0.2 * inch))

    # Cabeçalho da tabela
    table_data = [
        ["Grupo", "Subgrupo", "Porciones", "Kcal", "Prot (g)", "Grasa (g)", "Carb (g)"]
    ]

    for row in audit["smae_table"]:
        table_data.append([
            row["group"],
            row["subgroup"] if row["subgroup"] else "-",
            round(row["portions"], 1),
            round(row["kcal"], 1),
            round(row["protein"], 1),
            round(row["fats"], 1),
            round(row["carbs"], 1),
        ])

    # Linha de totais
    table_data.append([
        "TOTAL",
        "",
        "",
        round(audit["totals"]["kcal_from_table"], 1),
        round(audit["totals"]["protein_g"], 1),
        round(audit["totals"]["fats_g"], 1),
        round(audit["totals"]["carbs_g"], 1),
    ])

    table = Table(table_data, repeatRows=1)

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (2, 1), (-1, -1), "CENTER"),
    ]))

    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))

    # =========================
    # MENU GERADO POR IA
    # =========================
    import sys
    print("MENU_DATA RECEBIDO:", str(menu_data)[:500], file=sys.stderr)
    if menu_data and "meals" in menu_data:
        elements.append(Paragraph("Cardápio Alimentar", styles["Heading2"]))
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(f"<b>{menu_data.get('name', 'Menu selecionado')}</b>", styles["Normal"]))
        elements.append(Spacer(1, 0.15 * inch))

        FOOD_GRAMS = {
            "Frango grelhado": 130, "Atum em água": 100, "Ovo cozido": 120,
            "Carne magra": 130, "Tilápia assada": 130, "Clara de ovo": 240,
            "Feijão carioca": 80, "Lentilha": 80, "Grão-de-bico": 80,
            "Arroz branco": 75, "Batata doce": 100, "Aveia": 60,
            "Macarrão integral": 80, "Banana": 120, "Maçã": 150,
            "Mamão": 120, "Brócolis": 100, "Espinafre": 80,
            "Cenoura": 80, "Azeite": 10, "Castanha": 20,
            "Iogurte grego": 170, "Leite desnatado": 200,
            "Mel": 15, "Açúcar mascavo": 10,
        }

        for meal in menu_data["meals"]:
            elements.append(Paragraph(f"<b>{meal['meal']}</b>", styles["Heading3"]))
            meal_data = [["Alimento", "Quantidade", "Kcal"]]
            for item in meal["items"]:
                qty = item.get("qty", "")
                if not qty or qty == "undefinedg":
                    qty = f"{item.get('quantidade_g', 100)}g"
                meal_data.append([
                    item["food"],
                    qty,
                    f"{item.get('kcal', '—')} kcal"
                ])
            meal_table = Table(meal_data, colWidths=[220, 100, 130])
            meal_table.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
                ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
                ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
                ("ALIGN", (1,1), (-1,-1), "CENTER"),
            ]))
            elements.append(meal_table)
            elements.append(Spacer(1, 0.15 * inch))

    doc.build(elements)
    buffer.seek(0)
    return buffer
