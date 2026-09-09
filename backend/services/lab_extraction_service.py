"""Extrae valores de laboratorio de una foto de un estudio (ej. química
sanguínea) usando Claude con visión, para prellenar el campo "bioquímicos" de
una consulta. El nutriólogo siempre revisa y confirma antes de guardar —
esto nunca escribe directo en el expediente."""

import json
import os
import urllib.request

CLAUDE_TIMEOUT_SECONDS = 30

PROMPT = """Eres un asistente que extrae resultados de laboratorio de la imagen de un \
estudio clínico (ej. química sanguínea, perfil renal, perfil lipídico).

Devuelve SOLO un JSON con esta forma exacta, sin texto adicional:
{"valores": [{"nombre": "Glucosa", "valor": "95", "unidad": "mg/dL"}]}

Reglas:
- Incluye solo los analitos que puedas leer con confianza en la imagen.
- "nombre" en español, tal como aparece o su traducción común (ej. "Glucose" -> "Glucosa").
- "valor" como texto (puede incluir decimales).
- "unidad" tal como aparece en el estudio (mg/dL, mEq/L, g/dL, etc.), o "" si no es legible.
- Si no puedes leer ningún valor con confianza, devuelve {"valores": []}.
"""


def extract_lab_values(image_base64: str, media_type: str = "image/jpeg") -> list[dict]:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY no configurada")

    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 1024,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_base64}},
                {"type": "text", "text": PROMPT},
            ],
        }],
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

    text = result["content"][0]["text"].strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    parsed = json.loads(text)
    return parsed.get("valores", [])
