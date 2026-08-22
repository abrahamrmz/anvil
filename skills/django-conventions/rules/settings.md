# Settings y secretos

## Estructura

```
proyecto/settings/
├── __init__.py
├── base.py      # todo lo común; lee .env con decouple/environ
├── dev.py       # from .base import *; DEBUG=True permitido AQUÍ y solo aquí
└── prod.py      # from .base import *; hardening (SECURE_*, logging)
```

- systemd/gunicorn fija `DJANGO_SETTINGS_MODULE=proyecto.settings.prod` en la unit o `EnvironmentFile`.
- `manage.py` local puede default a `dev`, nunca a `prod` implícito.

## base.py — patrón

```python
from decouple import config, Csv

SECRET_KEY = config("SECRET_KEY")                    # sin default: falla ruidoso si falta
DEBUG = config("DEBUG", default=False, cast=bool)    # default seguro
ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())
```

Reglas:
- `SECRET_KEY` **sin default** — un default "inseguro para dev" termina en producción.
- Todo lo que se lee con `config()` existe en `.env.example` con valor vacío o de ejemplo.
- La librería de config está en requirements — verificarlo al agregar el import.

## Secretos

- `.env` con permisos 600, fuera de git. En VPS: `EnvironmentFile=` de systemd o `/etc/environment` según el patrón del servidor.
- API keys por cliente (multi-tenant) van en BD (campo JSON del modelo cliente), no en env global — env es del sistema, la BD es del tenant.
- Si un secreto ya se commiteó: (1) rotarlo con quien lo administre, (2) purgar historial (`git-filter-repo`), (3) recién entonces borrarlo del código. Borrar solo el archivo no lo saca del historial.

## Anti-patrón real a vigilar

```python
# INCORRECTO — visto en producción:
DEBUG = True
# DEBUG = config('DEBUG', default=False, cast=bool)   # "temporal"
```

La línea comentada es la correcta; el hardcode "temporal" sobrevive años. Si se necesita DEBUG puntualmente en el server: `DEBUG=True` en el `.env`, nunca en el código.
