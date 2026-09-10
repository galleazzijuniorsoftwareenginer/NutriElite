"""Generación del reporte clínico en PDF — visual alineado a la identidad
Aurora de Datos del app (mismo violeta/turquesa/dorado de macros, cards con
franja de color), pensado para verse bien tanto en pantalla como impreso
(fondos claros, poco gasto de tinta, buen contraste)."""

import io
from datetime import datetime

import requests
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, KeepTogether, HRFlowable,
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.widgets.markers import makeMarker

from backend.services.smae_calculation_service import SMAECalculationService
from backend.services.shopping_list_service import build_shopping_list

# ---------- Paleta Aurora de Datos (backend/frontend/src/index.css) ----------
ACCENT = colors.HexColor("#6d5bff")
ACCENT_LIGHT = colors.HexColor("#efebff")
ACCENT_DARK = colors.HexColor("#4a37d1")
ACCENT_2 = colors.HexColor("#0e9c92")
ACCENT_2_LIGHT = colors.HexColor("#e3f9f6")
COLOR_CARB = colors.HexColor("#0e9c92")
COLOR_PROT = colors.HexColor("#6d5bff")
COLOR_FAT = colors.HexColor("#b7791f")
TEXT_DARK = colors.HexColor("#171132")
TEXT_2 = colors.HexColor("#6b6584")
BORDER = colors.HexColor("#e6e3f2")
PAGE_MARGIN = 0.6 * inch

_IMAGE_CACHE: dict = {}


def _fetch_thumbnail(url: str, size: int = 34):
    """Descarga y redimensiona una foto real de plato para el menú semanal.
    Cachea por URL (muchos platos se repiten en la semana) y falla en
    silencio si no hay red o la imagen no carga — el PDF sigue generándose
    sin la foto en ese caso."""
    if not url:
        return None
    if url in _IMAGE_CACHE:
        return _IMAGE_CACHE[url]
    try:
        resp = requests.get(url, timeout=4)
        resp.raise_for_status()
        img = PILImage.open(io.BytesIO(resp.content)).convert("RGB")
        img.thumbnail((size * 3, size * 3))
        w, h = img.size
        side = min(w, h)
        img = img.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
        img = img.resize((size * 3, size * 3))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        buf.seek(0)
        flowable = RLImage(buf, width=size, height=size)
        _IMAGE_CACHE[url] = flowable
        return flowable
    except Exception:
        _IMAGE_CACHE[url] = None
        return None


def _section_card(flowables, accent=ACCENT, bg=ACCENT_LIGHT, content_width=None):
    """Envuelve una lista de flowables en una 'card' con franja de color a la
    izquierda y fondo claro — el mismo lenguaje visual de los cards del app,
    pero económico en tinta para cuando el reporte se imprime."""
    table = Table([[flowables]], colWidths=[content_width])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3.5, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    return table


def _build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("title", parent=base["Title"], textColor=ACCENT_DARK, fontSize=20, spaceAfter=2),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], textColor=TEXT_2, fontSize=9.5),
        "section": ParagraphStyle("section", parent=base["Heading2"], textColor=ACCENT_DARK, fontSize=13, spaceAfter=6),
        "section2": ParagraphStyle("section2", parent=base["Heading2"], textColor=ACCENT_2, fontSize=13, spaceAfter=6),
        "label": ParagraphStyle("label", parent=base["Normal"], textColor=TEXT_2, fontSize=9),
        "value": ParagraphStyle("value", parent=base["Normal"], textColor=TEXT_DARK, fontSize=10.5),
        "normal": ParagraphStyle("normal", parent=base["Normal"], textColor=TEXT_DARK, fontSize=9.5, leading=13),
        "day": ParagraphStyle("day", parent=base["Heading3"], textColor=ACCENT_DARK, fontSize=12, spaceAfter=4),
        "meal": ParagraphStyle("meal", parent=base["Normal"], textColor=ACCENT_2, fontSize=10, fontName="Helvetica-Bold"),
        "note": ParagraphStyle("note", parent=base["Normal"], textColor=TEXT_2, fontSize=8, leading=11),
        "center": ParagraphStyle("center", parent=base["Normal"], textColor=TEXT_DARK, fontSize=10, alignment=1),
        "centerNote": ParagraphStyle("centerNote", parent=base["Normal"], textColor=TEXT_2, fontSize=8.5, alignment=1),
    }
    return styles


def _header_footer(canvas, doc, nutritionist_name=""):
    canvas.saveState()
    page_w, page_h = letter
    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(2.5)
    canvas.line(0, page_h - 4, page_w, page_h - 4)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(TEXT_2)
    footer_text = f"NutriElite · Reporte generado el {datetime.utcnow().strftime('%d/%m/%Y')}"
    if nutritionist_name:
        footer_text += f" · {nutritionist_name}"
    canvas.drawString(PAGE_MARGIN, 0.35 * inch, footer_text)
    canvas.drawRightString(page_w - PAGE_MARGIN, 0.35 * inch, f"Página {doc.page}")
    canvas.restoreState()


def _macro_row(label, grams, kcal, pct, color):
    return [
        Table([[""]], colWidths=[10], rowHeights=[10], style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), color), ("ROUNDEDCORNERS", [2, 2, 2, 2]),
        ])),
        label, f"{grams:.1f} g", f"{kcal:.0f} kcal", f"{pct:.1f}%",
    ]


def _build_weight_chart(consultations, styles):
    """consultations: lista ordenada cronológicamente de dicts {fecha, peso}."""
    points = [(c["fecha"], c["peso"]) for c in consultations if c.get("peso") is not None]
    if len(points) < 2:
        return None
    pesos = [p[1] for p in points]
    labels = [p[0].strftime("%d/%m") for p in points]

    drawing = Drawing(460, 150)
    chart = HorizontalLineChart()
    chart.x = 45
    chart.y = 25
    chart.height = 105
    chart.width = 400
    chart.data = [pesos]
    chart.categoryAxis.categoryNames = labels
    chart.categoryAxis.labels.fontSize = 7
    chart.categoryAxis.labels.fillColor = TEXT_2
    chart.valueAxis.valueMin = max(0, min(pesos) - 2)
    chart.valueAxis.valueMax = max(pesos) + 2
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.labels.fillColor = TEXT_2
    chart.lines[0].strokeColor = ACCENT
    chart.lines[0].strokeWidth = 2.2
    chart.lines[0].symbol = makeMarker("Circle")
    chart.lines[0].symbol.strokeColor = ACCENT_DARK
    chart.lines[0].symbol.fillColor = ACCENT
    chart.lines[0].symbol.size = 5
    drawing.add(chart)
    return KeepTogether([
        Paragraph("Evolución de peso", styles["section"]),
        Spacer(1, 0.1 * inch),
        drawing,
        Spacer(1, 0.05 * inch),
        Paragraph(
            f"De {points[0][1]:.1f} kg ({points[0][0].strftime('%d/%m/%Y')}) "
            f"a {points[-1][1]:.1f} kg ({points[-1][0].strftime('%d/%m/%Y')}) "
            f"— {'▼' if points[-1][1] < points[0][1] else '▲'} {abs(points[-1][1] - points[0][1]):.1f} kg",
            styles["note"],
        ),
        Spacer(1, 0.3 * inch),
    ])


def generate_plan_pdf(plan, menu_data=None, perfil_data=None, override_plan=None, consultations=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=PAGE_MARGIN + 0.15 * inch, bottomMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN, rightMargin=PAGE_MARGIN,
    )
    content_width = letter[0] - PAGE_MARGIN * 2
    styles = _build_styles()
    elements = []

    from backend.database import SessionLocal
    db = SessionLocal()
    audit = SMAECalculationService.calculate(plan.id, db, override_plan=override_plan)
    db.close()

    has_menu = bool(menu_data and menu_data.get("semana"))
    was_overridden = override_plan is not None

    # ---------- Encabezado con marca del nutricionista ----------
    nutritionist_name = ""
    if perfil_data and perfil_data.get("nombre"):
        nutritionist_name = perfil_data.get("nombre", "")
        logo_flowable = None
        logo_raw = perfil_data.get("logo") or perfil_data.get("logo_base64")
        if logo_raw:
            try:
                import base64
                logo_b64 = logo_raw.split(",")[1] if "," in logo_raw else logo_raw
                logo_buf = io.BytesIO(base64.b64decode(logo_b64))
                logo_img = RLImage(logo_buf, width=52, height=52)
                logo_img.hAlign = "CENTER"
                logo_flowable = logo_img
            except Exception:
                logo_flowable = None

        if logo_flowable:
            elements.append(logo_flowable)
            elements.append(Spacer(1, 0.08 * inch))
        elements.append(Paragraph(f"<b>{nutritionist_name}</b>", styles["center"]))
        if perfil_data.get("especialidad"):
            elements.append(Paragraph(perfil_data["especialidad"], styles["centerNote"]))
        if perfil_data.get("cedula"):
            elements.append(Paragraph(f"Cédula: {perfil_data['cedula']}", styles["centerNote"]))
        contacto = " · ".join(filter(None, [perfil_data.get("clinica", ""), perfil_data.get("telefono", ""), perfil_data.get("email", "")]))
        if contacto:
            elements.append(Paragraph(contacto, styles["centerNote"]))
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(HRFlowable(width="100%", thickness=1, color=BORDER))
        elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph("Informe Nutricional Clínico", styles["title"]))
    elements.append(Paragraph(f"Paciente: {plan.patient_name or '—'}", styles["subtitle"]))
    elements.append(Spacer(1, 0.25 * inch))

    # ---------- Datos del paciente ----------
    if plan.height and plan.weight:
        height_m = plan.height / 100
        bmi = round(plan.weight / (height_m ** 2), 2)
        bmi_class = "Bajo peso" if bmi < 18.5 else "Normal" if bmi < 25 else "Sobrepeso" if bmi < 30 else "Obesidad"
    else:
        bmi, bmi_class = "—", "Pendiente de captura"

    goal_label = {"cut": "Pérdida de peso", "bulk": "Ganancia de masa", "maintenance": "Mantenimiento"}.get(plan.goal, plan.goal)
    gender_label = {"male": "Masculino", "female": "Femenino"}.get(plan.gender, plan.gender) if plan.gender else "—"

    datos_rows = [
        ["Email", plan.patient_email or "—", "Teléfono", plan.patient_phone or "—"],
        ["Edad", f"{plan.age} años" if plan.age else "—", "Género", gender_label],
        ["Peso", f"{plan.weight} kg" if plan.weight else "—", "Altura", f"{plan.height} cm" if plan.height else "—"],
        ["IMC", f"{bmi} ({bmi_class})" if bmi != "—" else bmi, "Objetivo", goal_label],
        ["Fecha", str(plan.created_at)[:10], "", ""],
    ]
    datos_table = Table(datos_rows, colWidths=[70, (content_width - 32 - 140) / 2, 70, (content_width - 32 - 140) / 2])
    datos_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (0, -1), TEXT_2),
        ("TEXTCOLOR", (2, 0), (2, -1), TEXT_2),
        ("TEXTCOLOR", (1, 0), (1, -1), TEXT_DARK),
        ("TEXTCOLOR", (3, 0), (3, -1), TEXT_DARK),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(_section_card(
        [Paragraph("Datos del paciente", styles["section"]), datos_table],
        accent=ACCENT, bg=ACCENT_LIGHT, content_width=content_width,
    ))
    elements.append(Spacer(1, 0.25 * inch))

    # ---------- Auditoría nutricional ----------
    protein_g, fats_g, carbs_g = audit["totals"]["protein_g"], audit["totals"]["fats_g"], audit["totals"]["carbs_g"]
    protein_kcal, fats_kcal, carbs_kcal = protein_g * 4, fats_g * 9, carbs_g * 4
    total_kcal = protein_kcal + fats_kcal + carbs_kcal
    protein_pct = round((protein_kcal / total_kcal) * 100, 1) if total_kcal else 0
    fats_pct = round((fats_kcal / total_kcal) * 100, 1) if total_kcal else 0
    carbs_pct = round((carbs_kcal / total_kcal) * 100, 1) if total_kcal else 0

    macro_rows = [
        ["", "Macronutriente", "Gramos", "Kcal", "%"],
        _macro_row("Proteínas", protein_g, protein_kcal, protein_pct, COLOR_PROT),
        _macro_row("Grasas", fats_g, fats_kcal, fats_pct, COLOR_FAT),
        _macro_row("Carbohidratos", carbs_g, carbs_kcal, carbs_pct, COLOR_CARB),
        ["", "Total", "", f"{total_kcal:.0f} kcal", "100%"],
    ]
    macro_table = Table(macro_rows, colWidths=[18, 140, 80, 80, 60])
    macro_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_LIGHT),
        ("GRID", (1, 0), (-1, -1), 0.5, BORDER),
        ("ALIGN", (2, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (1, -1), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
    ]))
    audit_children = [Paragraph("Auditoría nutricional", styles["section2"]), Spacer(1, 0.1 * inch), macro_table]
    if has_menu and was_overridden:
        audit_children.append(Spacer(1, 0.1 * inch))
        audit_children.append(Paragraph(
            "Nota: estos totales reflejan el objetivo ajustado en Dietocálculo. "
            "El menú semanal de abajo fue generado por IA con anterioridad y puede no coincidir "
            "exactamente día a día — puedes regenerarlo desde la app si necesitas que coincida al detalle.",
            styles["note"],
        ))
    elements.append(_section_card(audit_children, accent=ACCENT_2, bg=ACCENT_2_LIGHT, content_width=content_width))
    elements.append(Spacer(1, 0.25 * inch))

    # ---------- Distribución SMAE ----------
    smae_rows = [["Grupo", "Subgrupo", "Porciones", "Kcal", "Prot (g)", "Grasa (g)", "Carb (g)"]]
    for row in audit["smae_table"]:
        smae_rows.append([
            row["group"], row["subgroup"] or "-", round(row["portions"], 1),
            round(row["kcal"], 1), round(row["protein"], 1), round(row["fats"], 1), round(row["carbs"], 1),
        ])
    smae_rows.append([
        "TOTAL", "", "", round(audit["totals"]["kcal_from_table"], 1),
        round(audit["totals"]["protein_g"], 1), round(audit["totals"]["fats_g"], 1), round(audit["totals"]["carbs_g"], 1),
    ])
    smae_table = Table(smae_rows, repeatRows=1)
    smae_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT_LIGHT),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ALIGN", (2, 1), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
    ]))
    elements.append(KeepTogether([Paragraph("Distribución SMAE", styles["section"]), Spacer(1, 0.15 * inch), smae_table]))
    elements.append(Spacer(1, 0.3 * inch))

    # ---------- Evolución del paciente ----------
    if consultations:
        chart_block = _build_weight_chart(consultations, styles)
        if chart_block:
            elements.append(chart_block)

    # ---------- Menú semanal con fotos ----------
    if has_menu:
        elements.append(Paragraph("Plan alimenticio semanal", styles["section"]))
        elements.append(Spacer(1, 0.15 * inch))

        for dia in menu_data["semana"]:
            elements.append(Paragraph(dia["dia"], styles["day"]))
            for comida in dia.get("comidas", []):
                elements.append(Paragraph(
                    f"{comida.get('tiempo', comida.get('tempo', ''))} — {comida.get('kcal', '')} kcal",
                    styles["meal"],
                ))
                meal_rows = [["", "Alimento", "Cantidad", "Kcal"]]
                for item in comida.get("itens", comida.get("items", [])):
                    thumb = _fetch_thumbnail(item.get("imagen_url"))
                    qty = item.get("quantidade_g") or item.get("qty", "—")
                    meal_rows.append([thumb or "", item.get("alimento", ""), f"{qty}g", f"{item.get('kcal', '—')} kcal"])
                meal_table = Table(meal_rows, colWidths=[38, content_width - 38 - 90 - 80, 90, 80])
                meal_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), ACCENT_2_LIGHT),
                    ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ALIGN", (2, 1), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
                ]))
                elements.append(meal_table)
                elements.append(Spacer(1, 0.1 * inch))

            macros = dia.get("macros", {})
            elements.append(Paragraph(
                f"<b>Total del día:</b> {macros.get('kcal_total', '—')} kcal · "
                f"Prot: {macros.get('proteina_g', '—')}g · Carb: {macros.get('carb_g', '—')}g · "
                f"Grasa: {macros.get('gordura_g', '—')}g",
                styles["normal"],
            ))
            elements.append(Spacer(1, 0.25 * inch))

        # ---------- Lista de compras ----------
        shopping_items = build_shopping_list(menu_data)
        if shopping_items:
            elements.append(Spacer(1, 0.1 * inch))
            list_rows = [[item["alimento"].capitalize(), f"{item['cantidad_g_total']:.0f} g"] for item in shopping_items]
            half = (len(list_rows) + 1) // 2
            col1, col2 = list_rows[:half], list_rows[half:]
            while len(col2) < len(col1):
                col2.append(["", ""])
            cell_style = styles["normal"].clone("shop", fontSize=8.5, leading=11)
            combined = [["Alimento", "Cantidad", "Alimento", "Cantidad"]]
            for a, b in zip(col1, col2):
                combined.append([
                    Paragraph(a[0], cell_style), a[1],
                    Paragraph(b[0], cell_style) if b[0] else "", b[1],
                ])
            colw = content_width / 2
            shop_table = Table(combined, colWidths=[colw * 0.72, colw * 0.28, colw * 0.72, colw * 0.28])
            shop_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_DARK),
            ]))
            elements.append(KeepTogether([
                Paragraph("Lista de compras", styles["section"]),
                Spacer(1, 0.1 * inch),
                Paragraph("Suma de todos los ingredientes del menú semanal, lista para llevar al súper.", styles["note"]),
                Spacer(1, 0.1 * inch),
                shop_table,
            ]))

    elif menu_data and "meals" in menu_data:
        # Formato antiguo (3 opciones) — se mantiene por compatibilidad con planes viejos.
        elements.append(Paragraph("Cardápio Alimentar", styles["section"]))
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(f"<b>{menu_data.get('name', 'Menu selecionado')}</b>", styles["normal"]))
        elements.append(Spacer(1, 0.15 * inch))
        for meal in menu_data["meals"]:
            elements.append(Paragraph(meal["meal"], styles["meal"]))
            meal_data = [["Alimento", "Quantidade", "Kcal"]]
            for item in meal["items"]:
                qty = item.get("qty", "")
                if not qty or qty == "undefinedg":
                    qty = f"{item.get('quantidade_g', 100)}g"
                meal_data.append([item["food"], qty, f"{item.get('kcal', '—')} kcal"])
            meal_table = Table(meal_data, colWidths=[220, 100, 130])
            meal_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), ACCENT_2_LIGHT),
                ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 1), (-1, -1), "CENTER"),
            ]))
            elements.append(meal_table)
            elements.append(Spacer(1, 0.15 * inch))

    def _on_page(canvas, doc_):
        _header_footer(canvas, doc_, nutritionist_name)

    doc.build(elements, onFirstPage=_on_page, onLaterPages=_on_page)
    buffer.seek(0)
    return buffer
