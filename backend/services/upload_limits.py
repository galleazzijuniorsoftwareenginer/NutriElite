"""Shared server-side size guard for base64 uploads (logo, lab photos).

The frontend already limits file size before encoding, but that's
trivially bypassed by calling the API directly — without a server-side
check, an oversized payload gets stored as-is (logo) or forwarded to the
Claude vision API at real cost (lab photos).
"""
from fastapi import HTTPException

# Base64 inflates the original byte size by ~4/3 — compare against the
# encoded string length directly to avoid decoding untrusted input twice.
_BASE64_INFLATION = 4 / 3


def assert_base64_size_ok(value: str, max_mb: float, field_name: str) -> None:
    if not value:
        return
    # Payloads may arrive as a data: URL ("data:image/png;base64,...") —
    # only the base64 part counts toward the size limit.
    encoded = value.split(",", 1)[1] if value.startswith("data:") else value
    max_bytes = max_mb * 1024 * 1024
    if len(encoded) * _BASE64_INFLATION > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"{field_name} supera el máximo permitido de {max_mb:.0f}MB.",
        )
