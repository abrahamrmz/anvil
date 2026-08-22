# Testing en Django

## Runner y layout

- **pytest + pytest-django** como estándar (`pytest.ini` con `DJANGO_SETTINGS_MODULE=...settings.dev`, `--reuse-db -q`). En proyectos que ya usan el runner de Django (`manage.py test`), respetar lo existente — no migrar runner y feature en el mismo cambio.
- `tests/` global para transversales (auth, middleware, API) + `tests.py`/`tests/` por app para lo propio del dominio.

## Qué testear primero (orden de retorno)

1. **Piezas puras**: parsers, filtros, prompts/plantillas, routers de entrega, cálculo de métricas — baratas, estables, atrapan la mayoría de regresiones.
2. **Contratos de ingesta**: el endpoint idempotente no duplica al reintento; payload inválido → 4xx, no 500.
3. **Tenancy**: middleware resuelve host→cliente; manager filtra; host desconocido → 404.
4. **Comandos de seed/import**: correr dos veces = mismo estado.

Los scrapers y llamadas a APIs externas no se testean contra el servicio real: se testea el parseo con respuestas guardadas como fixture.

## Fixtures

- **Sin secretos ni datos reales de clientes** en fixtures. Generarlos sintéticos con un script versionado (`tests/fixtures/build_sample.py`) en lugar de exportar producción.
- Factory functions simples > fixtures JSON gigantes; el test debe poder leerse sin abrir el fixture.

## Reglas

- Un bug corregido = un test que lo habría atrapado, en el mismo commit.
- Tests que tocan BD marcados con `@pytest.mark.django_db`; el resto corre sin BD (rápido).
- No mockear el ORM — usar la BD de test; mockear solo fronteras externas (HTTP, LLM, mensajería).
- Scripts de exploración con `print` no son tests: viven en un directorio ignorado por git, no en `tests/`.
