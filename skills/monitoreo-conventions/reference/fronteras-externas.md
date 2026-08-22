# Fronteras externas: APIs, LLMs y salida estructurada

## Toda llamada externa

```python
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

@retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=2, max=30), reraise=True)
def llamar(url, **kw):
    return httpx.get(url, timeout=30, **kw)   # timeout SIEMPRE explícito
```

- Timeout explícito en cada request — sin excepción. Un request sin timeout cuelga el cron entero.
- Retry con backoff exponencial + jitter y **tope**; `reraise=True` para que el fallo definitivo sea visible.
- Al agotar reintentos: registrar el ítem como fallido con causa, seguir con el resto del batch. Un ítem malo no tumba la corrida.
- Rate limits: respetar `Retry-After`; presupuesto de llamadas por corrida loggeado (costo de APIs de pago es operación, no sorpresa).

## Cadena LLM primario → fallback

- Cadena declarada en config: `[primario, secundario, ...]` (ej. proveedor barato OpenAI-compatible primero, Anthropic de último recurso). El código itera la cadena; no hay if-else por proveedor regado en el pipeline.
- Un solo módulo cliente LLM por repo (o del paquete común) — no un `deepinfra.py` copiado y divergido por proyecto.
- Loggear qué proveedor respondió cada ítem: sin eso no se puede depurar calidad ni costo.

## Salida estructurada del LLM

1. Pedir JSON con schema explícito en el prompt (o structured outputs si el proveedor lo soporta).
2. Validar con pydantic. Si falla el parseo → **reintentar la llamada** pidiendo corrección (máx 2), no rescatar con regex.
3. Si tras los reintentos no hay salida válida → el ítem queda `pendiente_revision` y se notifica al operador.

**Prohibido**: publicar a clientes un valor default ("Política mexicana", "neutral") porque el LLM falló. El default silencioso es un error de datos frente al cliente — peor que un hueco avisado.

## Embeddings y clustering

- Cachear embeddings por hash del texto — re-embeddear todo en cada corrida es costo puro.
- Verificar el límite de contexto del embedder: varios SDKs truncan en silencio; trocear antes de embeddear.
- Umbrales de similitud y ventanas de tiempo en config, no como constantes enterradas.
