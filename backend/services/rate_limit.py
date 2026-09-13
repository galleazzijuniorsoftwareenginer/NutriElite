"""Limitador de intentos en memoria, sin dependencias nuevas — pensado para
un único proceso (Railway hoy corre una sola instancia de este backend). Si
en el futuro se escala a más de una instancia, esto necesita un backend
compartido (Redis) en vez de un dict en memoria, porque cada instancia
tendría su propio contador."""
import time
from collections import defaultdict
from fastapi import HTTPException, Request

_attempts: dict[str, list[float]] = defaultdict(list)


def rate_limit(key_prefix: str, max_attempts: int, window_seconds: int):
    """Devuelve una dependencia de FastAPI que limita a `max_attempts`

    llamadas por IP cada `window_seconds`, agrupadas bajo `key_prefix`
    (para no compartir el contador entre endpoints distintos)."""

    def dependency(request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        key = f"{key_prefix}:{client_ip}"
        now = time.time()
        attempts = [t for t in _attempts.get(key, []) if t > now - window_seconds]
        if len(attempts) >= max_attempts:
            _attempts[key] = attempts
            raise HTTPException(
                status_code=429,
                detail="Demasiados intentos. Espera unos minutos y vuelve a intentar.",
            )
        attempts.append(now)
        _attempts[key] = attempts

    return dependency
