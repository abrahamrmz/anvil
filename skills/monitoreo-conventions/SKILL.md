---
name: monitoreo-conventions
description: Convenciones para pipelines de monitoreo de medios y redes sociales — scrapers (Selenium/Playwright/APIs), clasificación con LLM, y entrega por WhatsApp/Telegram a clientes. Úsalo cuando escribas o revises scrapers, monitores, bots de entrega o pipelines de noticias/tendencias, o cuando el usuario mencione "monitor", "scraper", "selenium", "playwright", "apify", "rss", "ultramsg", "whatsapp", "telegram", "deepinfra", "openrouter", "nuevo cliente".
---

# Monitoreo Conventions

> Dispatcher ligero. Cargar SOLO los archivos de referencia relevantes a la tarea con Read.

## Filosofía

1. **Un cliente nuevo es configuración, nunca un repo nuevo** — clonar el repo por cliente multiplica cada bug por N; la variación por cliente vive en archivos de config y prompts, el pipeline es uno.
2. **Toda frontera externa falla; el pipeline lo asume** — scraping, APIs, LLMs y mensajería fallan a diario. Timeout, retry con backoff y fallback explícito no son mejoras: son el diseño base.
3. **Nunca inventar de cara al cliente** — cuando la clasificación falla, el sistema marca para revisión y avisa; jamás publica un valor default como si fuera análisis real.

## Red Flags (siempre detener el trabajo)

- `requests`/httpx **sin timeout** hacia cualquier servicio externo → error
- `except:` desnudo tragándose fallos de scraping o LLM → error
- Fallback que asigna categoría/sentimiento default y **publica a clientes** → error
- Credenciales en `common.py`, TOML versionado o cualquier archivo trackeado → error
- Envío real (WhatsApp/Telegram) posible desde entorno dev sin gate → error
- Reescritura completa de un CSV/estado compartido sin lock ni archivo temporal → error
- Binarios (geckodriver, .xpi, .7z, screenshots) versionados en git → warning
- Timestamps naive mezclados con UTC en el mismo pipeline → warning

## Qué Cargar

| Trabajando en... | Cargar |
|---|---|
| Alta de cliente, estructura de config, prompts por cliente | `reference/config-cliente.md` |
| Llamadas a APIs, LLMs, cadena primario/fallback, salida estructurada | `reference/fronteras-externas.md` |
| Entrega a WhatsApp/Telegram, entornos dev/prod, sync a dashboards | `reference/entrega-y-entornos.md` |

## Reglas núcleo (siempre aplican)

### Estado y datos
- Persistencia en **SQLite (WAL + busy_timeout)** o PostgreSQL — no CSV como base de datos. Si un CSV legado sigue vivo, escribir a temporal + rename atómico, nunca reescribir in-place.
- **UTC interno en todo el pipeline**; conversión a hora local únicamente al presentar (reportes, mensajes). Nunca comparar naive contra aware.
- Deduplicación con clave natural explícita (URL canónica, ID de post, hash de contenido) — definida en un solo lugar.
- Logs rotativos en **UTF-8** con tamaño acotado; el encoding exótico (UTF-16) solo donde un consumidor legado lo exija, y documentado.

### Scraping
- Esperas explícitas por condición (elemento presente/visible), no `sleep()` fijos.
- Selenium/Playwright detrás de una función única por sitio: cambiar el selector se hace en un lugar.
- Drivers y navegadores se instalan en el deploy (`playwright install`, paquete del sistema), no se versionan en el repo.
- Proxy y user-agent salen de config, no hardcodeados en cada script.

### Higiene de repo
- `.gitignore` cubre: `data/`, `logs/`, screenshots, venvs, `__pycache__`, artefactos descargados.
- Prohibido el versionado manual por sufijo (`_back`, `_previo`, `copy`, `old_*`) — para eso es git; borrar al encontrarlos.
- Código compartido entre monitores se comparte como paquete instalable (`pip install -e ../paquete-comun`), no copiando archivos entre repos.

## Flujo: alta de cliente nuevo

1. Crear `config/config_<cliente>.py` + `config/prompts_<cliente>.py` a partir de la plantilla — **sin tocar el pipeline**.
2. Si el pipeline necesita un cambio para este cliente — detener: convertirlo en opción de config con default al comportamiento actual.
3. Secretos del cliente a `.env` (o BD si el sistema es multi-tenant); nunca al archivo de config versionado.
4. Correr el pipeline completo en dev con router de entrega apuntando al grupo de pruebas.
5. Solo tras validar salida con el humano: activar destino real en config de prod.

## Detección de Anti-Patrones

| Patrón | Anti-patrón | Severidad | Corrección |
|---|---|---|---|
| Request sin timeout | sin-timeout | error | `timeout=` explícito siempre; tenacity para retry |
| `except:` desnudo | except-desnudo | error | Excepción específica + log con contexto |
| Default silencioso publicado a cliente | fallback-inventado | error | Marcar para revisión + notificar; no publicar |
| Secreto en archivo versionado | secreto-versionado | error | `.env` + rotación + purga de historial |
| Envío real alcanzable desde dev | envio-sin-gate | error | Router de entrega por `ENTORNO` + `--dry-run` |
| CSV reescrito in-place como estado | csv-como-bd | error | SQLite WAL; si CSV legado: temporal + rename |
| `sleep(15)` esperando la página | espera-fija | warning | Espera explícita por condición |
| Cliente nuevo = repo clonado | fork-por-cliente | warning | Config por cliente sobre pipeline único |
| Copia de módulo compartido entre repos | copia-divergente | warning | Extraer a paquete común instalable |
| Naive y UTC mezclados | tz-mixta | warning | UTC interno; localizar solo al presentar |

Reporte: `[file:line] [severidad] [categoría] nombre-del-anti-patrón`.

## Checklist Pre-Implementación

- [ ] ¿Nueva llamada externa? → timeout + retry con tope + qué pasa si falla definitivamente
- [ ] ¿Nuevo dato persistido? → clave de deduplicación definida y UTC
- [ ] ¿Puede llegar a un cliente real? → gate de entorno verificado en el camino del código
- [ ] ¿Config nueva? → tiene default seguro y está en la plantilla de cliente
- [ ] ¿Pieza pura nueva (parser, filtro, prompt, router)? → test que la cubra

## Gate Post-Implementación

Invocar skill `lint` tras cualquier cambio; `run-tests` para las piezas puras.
