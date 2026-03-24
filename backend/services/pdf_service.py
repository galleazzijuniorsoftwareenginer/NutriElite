from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from io import BytesIO
from backend.services.smae_calculation_service import SMAECalculationService

def generate_plan_pdf(plan, portions, menu_data=None, perfil_data=None):

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

    # Cabeçalho com branding do nutricionista
    if perfil_data and perfil_data.get("nombre"):
        from reportlab.platypus import HRFlowable
        from reportlab.platypus import Image as RLImage
        import base64
        import io

        # Logo
        logo_cell = ""
        if perfil_data.get("logo"):
            try:
                logo_b64 = perfil_data["logo"].split(",")[1] if "," in perfil_data["logo"] else perfil_data["logo"]
                logo_bytes = base64.b64decode(logo_b64)
                logo_buf = io.BytesIO(logo_bytes)
                logo_img = RLImage(logo_buf, width=60, height=60)
                logo_img.hAlign = "LEFT"
                logo_cell = logo_img
            except Exception:
                logo_cell = ""

        text_cell = Paragraph(
            f"<b>{perfil_data.get('nombre','')}</b><br/>"
            f"{perfil_data.get('especialidad','')}<br/>"
            f"<font size='9'>Cédula: {perfil_data.get('cedula','—')}</font>",
            styles["Normal"]
        )
        contact_cell = Paragraph(
            f"<b>{perfil_data.get('clinica','')}</b><br/>"
            f"<font size='9'>{perfil_data.get('telefono','')} {perfil_data.get('email','')}</font>",
            styles["Normal"]
        )

        # Layout centralizado
        contacto = " · ".join(filter(None, [perfil_data.get('telefono',''), perfil_data.get('email','')]))
        center_style = styles["Normal"].clone("cs")
        center_style.alignment = 1  # CENTER

        if logo_cell:
            logo_cell.hAlign = "CENTER"
            elements.append(logo_cell)
            elements.append(Spacer(1, 0.08 * inch))

        elements.append(Paragraph(f"<b><font size='13'>{perfil_data.get('nombre','')}</font></b>", center_style))
        if perfil_data.get('especialidad'):
            elements.append(Paragraph(perfil_data.get('especialidad',''), center_style))
        if perfil_data.get('cedula'):
            elements.append(Paragraph(f"<font size='9'>Cédula: {perfil_data.get('cedula','')}</font>", center_style))
        if perfil_data.get('clinica'):
            elements.append(Paragraph(f"<font size='9'>{perfil_data.get('clinica','')}</font>", center_style))
        if contacto:
            elements.append(Paragraph(f"<font size='9'>{contacto}</font>", center_style))

        elements.append(Spacer(1, 0.15 * inch))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
        elements.append(Spacer(1, 0.2 * inch))

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
    table_data.append([
        "TOTAL", "",
        "",
        round(audit["totals"]["kcal_from_table"], 1),
        round(audit["totals"]["protein_g"], 1),
        round(audit["totals"]["fats_g"], 1),
        round(audit["totals"]["carbs_g"], 1),
    ])

    from reportlab.platypus import KeepTogether
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (2, 1), (-1, -1), "CENTER"),
    ]))
    elements.append(KeepTogether([
        Paragraph("Distribución SMAE", styles["Heading2"]),
        Spacer(1, 0.2 * inch),
        table,
        Spacer(1, 0.3 * inch)
    ]))

    # =========================
    # CARDÁPIO SEMANAL 7 DIAS
    # =========================
    import sys
    print("MENU_DATA RECEBIDO:", str(menu_data)[:200], file=sys.stderr)

    if menu_data and "semana" in menu_data:
        elements.append(Paragraph("Plan Alimenticio Semanal", styles["Heading2"]))
        elements.append(Spacer(1, 0.2 * inch))

        for dia in menu_data["semana"]:
            elements.append(Paragraph(f"<b>{dia['dia']}</b>", styles["Heading3"]))
            elements.append(Spacer(1, 0.1 * inch))

            for comida in dia["comidas"]:
                elements.append(Paragraph(
                    f"<i>{comida.get('tiempo', comida.get('tempo',''))}</i> — {comida.get('kcal','')} kcal",
                    styles["Normal"]
                ))
                meal_data = [["Alimento", "Cantidad (g)", "Kcal"]]
                for item in comida["itens"]:
                    meal_data.append([
                        item["alimento"],
                        f"{item.get('quantidade_g') or item.get('qty', '—')}g",
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
                elements.append(Spacer(1, 0.1 * inch))

            # Totais do dia
            macros = dia.get("macros", {})
            elements.append(Paragraph(
                f"<b>Total del día:</b> {macros.get('kcal_total', '—')} kcal | "
                f"Prot: {macros.get('proteina_g', '—')}g | "
                f"Carb: {macros.get('carb_g', '—')}g | "
                f"Grasa: {macros.get('gordura_g', '—')}g",
                styles["Normal"]
            ))
            elements.append(Spacer(1, 0.3 * inch))

    # fallback: formato antigo (3 opciones)
    elif menu_data and "meals" in menu_data:
        elements.append(Paragraph("Cardápio Alimentar", styles["Heading2"]))
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(f"<b>{menu_data.get('name', 'Menu selecionado')}</b>", styles["Normal"]))
        elements.append(Spacer(1, 0.15 * inch))

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
