"""Genera una nota corta con IA sobre la evolución de un paciente —
tendencia de peso, adherencia (frecuencia de planes) y una sugerencia
puntual para la próxima consulta. Usa el mismo patrón de llamada directa
a la API de Claude que ai_menu_service, sin dependencias extra."""

import json
import os
import urllib.request

CLAUDE_TIMEOUT_SECONDS = 20


def _call_claude(prompt: str, api_key: str) -> str:
    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 300,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )
    with urllib.request.urlopen(req, timeout=CLAUDE_TIMEOUT_SECONDS) as resp:
        result = json.loads(resp.read())
    return result["content"][0]["text"].strip()


def generate_patient_insights(patient_name: str, plans: list[dict]) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return "Configura ANTHROPIC_API_KEY para habilitar los insights con IA."
    if not plans:
        return f"{patient_name} todavía no tiene planes registrados — genera el primero para empezar a ver su evolución aquí."

    ordered = sorted(plans, key=lambda p: p["created_at"])
    resumen = "\n".join(
        f"- {p['created_at'][:10]}: {p['weight']}kg, objetivo {p['goal']}, GET {round(p['get'])} kcal"
        for p in ordered
    )

    prompt = f"""Eres un asistente clínico que ayuda a un nutricionista a revisar rápido la evolución de un paciente.

Paciente: {patient_name}
Historial de planes (fecha, peso, objetivo, GET):
{resumen}

Escribe una nota de máximo 3 líneas, en español, con:
1. La tendencia de peso/adherencia que observas.
2. Una sugerencia concreta y breve para la próxima consulta.
No repitas los números tal cual, interprétalos. No uses markdown ni listas, solo texto corrido."""

    try:
        return _call_claude(prompt, api_key)
    except Exception as e:
        return f"No se pudo generar el insight en este momento ({e})."
