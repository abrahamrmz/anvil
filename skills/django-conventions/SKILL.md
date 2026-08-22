---
name: django-conventions
description: Convenciones para proyectos Django 5+ en producción — settings por entorno, secretos, SQLite/PostgreSQL, Celery, multi-tenancy y testing. Úsalo cuando escribas o revises código Django, cuando el usuario mencione "django", "settings.py", "migrations", "celery", "multi-tenant", "manage.py", "gunicorn", o al trabajar con models.py, views.py, tasks.py o archivos de migración.
---

# Django Conventions

> Dispatcher ligero. Leer la tabla de enrutamiento y cargar SOLO los archivos relevantes a la tarea con Read.

## Filosofía

1. **Producción es el default** — todo settings se escribe asumiendo que va a correr en un VPS real con clientes reales. Dev es la excepción explícita, nunca al revés.
2. **La configuración es entorno, no código** — lo que cambia entre máquinas (DEBUG, hosts, credenciales, rutas) vive en `.env`; lo que no cambia vive en settings versionado.
3. **La base de datos es el cuello de botella que ya conoces** — SQLite aguanta hasta que hay escritores concurrentes (Celery, gunicorn multi-worker); diseñar hoy para que la migración a PostgreSQL sea un cambio de `DATABASES`, no una reescritura.

## Red Flags (siempre detener el trabajo)

- `DEBUG = True` hardcodeado en un settings que se despliega → error
- `SECRET_KEY`, API keys o contraseñas en claro en settings, código o **data migrations** → error
- Lectura de config comentada "temporalmente" (`# config('DEBUG')`) junto al valor hardcodeado → error
- Paquete usado en settings (`decouple`, `environ`) ausente de requirements → error
- SQLite con múltiples escritores concurrentes sin WAL + `busy_timeout` → error
- `manage.py runserver` como servidor de producción → error
- `tests.py` stub de 3 líneas en una app con lógica de negocio → warning

## Qué Cargar

| Trabajando en... | Cargar |
|---|---|
| settings, .env, secretos, despliegue | `rules/settings.md` |
| Tareas Celery, colas, envíos a clientes reales | `rules/celery.md` |
| Multi-tenancy (middleware, managers, archivos por cliente) | `guides/multitenancy.md` |
| Tests, fixtures, pytest-django | `guides/testing.md` |

## Reglas núcleo (siempre aplican)

### Settings y secretos
- `DEBUG`, `SECRET_KEY`, `ALLOWED_HOSTS`, credenciales de BD y API keys: **siempre** desde `.env` (python-decouple o django-environ). `.env` en `.gitignore`; `.env.example` versionado sin valores.
- Settings divididos: `settings/base.py` + `settings/dev.py` + `settings/prod.py`. `DJANGO_SETTINGS_MODULE` decide, no un if.
- Las **data migrations nunca contienen secretos** — si una migración necesita poblar credenciales, las lee de env en tiempo de ejecución o se puebla con un management command.

### Base de datos
- SQLite en producción exige: modo WAL, `busy_timeout` ≥ 5000 ms, y una sola cola de escritores pesados. Si aparecen errores "database is locked" recurrentes, la respuesta es PostgreSQL (psycopg 3), no más retries.
- Toda query de reporte pesado va en el reader/queries del app (`queries.py`), no dispersa en views.
- Migraciones siempre reversibles cuando sea posible; nunca editar una migración ya aplicada en producción.

### Vistas y APIs
- Endpoints de ingesta (django-ninja/DRF) **idempotentes**: recibir dos veces el mismo payload no duplica datos (`update_or_create` con clave natural).
- Auth de API por Bearer token o API key hasheada; nunca comparar tokens en claro guardados en BD.
- Al tocar JS/CSS servido por templates, bump del query param de versión (`?v=`) para invalidar caché.

### Management commands
- Comandos de seed/import idempotentes (`update_or_create`), con `--dry-run` cuando mutan datos de clientes.
- Scripts de exploración van a un directorio ignorado por git (ej. `test-local/`), nunca a la raíz del proyecto.

## Checklist Pre-Implementación

- [ ] ¿El cambio toca settings? → confirmar que el valor viene de `.env` y existe en `.env.example`
- [ ] ¿Agrega dependencia? → está en requirements/pyproject
- [ ] ¿Escribe a BD desde una tarea o comando? → es idempotente y tolera re-ejecución
- [ ] ¿Toca modelos multi-tenant? → el queryset filtra por tenant (manager o middleware), no confía en el caller
- [ ] ¿Puede disparar un envío real (WhatsApp/Telegram/email)? → hay gate de entorno y `--dry-run`

## Detección de Anti-Patrones

| Patrón | Anti-patrón | Severidad | Corrección |
|---|---|---|---|
| `DEBUG = True` en settings desplegado | debug-en-prod | error | Leer de env: `DEBUG = config('DEBUG', default=False, cast=bool)` |
| Secreto literal en settings/migración/código | secreto-versionado | error | Mover a `.env`; rotar la credencial expuesta; purgar historial si se commiteó |
| `except:` desnudo alrededor de ORM/IO | except-desnudo | error | Capturar excepción específica; loggear con contexto; re-raise si no se puede manejar |
| SQLite + Celery concurrente sin WAL | sqlite-lock | error | WAL + busy_timeout; plan PostgreSQL si persiste |
| Endpoint de ingesta que duplica al reintento | ingesta-no-idempotente | error | Clave natural + `update_or_create` |
| Query pesada inline en la view | query-en-view | warning | Extraer a `queries.py` / manager |
| Copias de `db.sqlite3` fechadas en el árbol | backup-manual-en-repo | warning | Backups fuera del árbol; script de deploy los gestiona |
| `tests.py` stub en app con lógica | tests-stub | warning | Crear tests de las piezas puras como mínimo |

Reporte: `[file:line] [severidad] [categoría] nombre-del-anti-patrón`.

## Gate Post-Implementación

Invocar skill `lint` tras cualquier cambio de código; `run-tests` si el proyecto tiene suite.
