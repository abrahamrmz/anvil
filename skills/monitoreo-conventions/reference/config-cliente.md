# Config por cliente

## Estructura

```
config/
├── plantilla_config.py       # documentada — la fuente de verdad de qué opciones existen
├── config_<cliente>.py       # dict CONFIG_OPTIONS del cliente
└── prompts_<cliente>.py      # tono, instrucciones, perspectiva de sentimiento
data/<cliente>/               # estado y artefactos aislados por cliente
```

## Carga dinámica

```python
import importlib

def load_config(cliente: str):
    cfg = importlib.import_module(f"config.config_{cliente}")
    prompts = importlib.import_module(f"config.prompts_{cliente}")
    return validar(cfg.CONFIG_OPTIONS), prompts   # validar: pydantic o chequeo de claves
```

- `validar()` rechaza claves desconocidas y aplica defaults — un typo en la config de un cliente debe fallar al arrancar, no producir comportamiento silencioso.
- El entrypoint recibe el cliente por argumento (`python monitor.py <cliente>` o `--cliente`); sin cliente default.

## Qué va en config (versionado) y qué no

| En `config_<cliente>.py` (git) | En `.env` / BD (fuera de git) |
|---|---|
| Keywords, cuentas a vigilar, filtros | API keys y tokens |
| Tono editorial, instrucciones de prompt | IDs de grupos reales de WhatsApp/Telegram* |
| Flags de features (`SYNC_DASHBOARD=True`) | Credenciales SMTP/proxy |
| Umbrales (mín. autores, similitud) | |

\* Los IDs de destino real son config sensible: filtran topología de clientes y habilitan envíos. En `.env` por cliente o en BD; en el config versionado solo la clave que los referencia.

## Reglas

- Config declarativa (dicts/TOML), no lógica: si una opción necesita un `if` complejo, el `if` va al pipeline leyendo la opción.
- Toda opción nueva entra primero a la plantilla con default = comportamiento actual; los clientes existentes no cambian sin decisión explícita.
- Variación por cliente que no cabe en config (parser especial, fuente propia) → módulo plugin registrado en config (`"fuente_extra": "fuentes.sharepoint"`), no un fork del main.
