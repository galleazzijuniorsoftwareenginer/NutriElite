"""Genera una lista de compras agregando los alimentos de un menú semanal
generado por IA (mismo shape que ai_menu_service devuelve): suma los gramos
de cada alimento a través de todos los días y comidas."""


def build_shopping_list(weekly_menu: dict) -> list[dict]:
    totals: dict[str, dict] = {}

    for dia in weekly_menu.get("semana", []):
        for comida in dia.get("comidas", []):
            for item in comida.get("itens", comida.get("items", [])):
                nombre = (item.get("alimento") or "").strip()
                if not nombre:
                    continue
                key = nombre.lower()
                cantidad = item.get("quantidade_g") or item.get("qty") or 0
                try:
                    cantidad = float(cantidad)
                except (TypeError, ValueError):
                    cantidad = 0
                if key not in totals:
                    totals[key] = {"alimento": nombre, "cantidad_g_total": 0.0, "veces_usado": 0}
                totals[key]["cantidad_g_total"] += cantidad
                totals[key]["veces_usado"] += 1

    items = list(totals.values())
    for item in items:
        item["cantidad_g_total"] = round(item["cantidad_g_total"], 0)
    items.sort(key=lambda x: x["alimento"])
    return items
