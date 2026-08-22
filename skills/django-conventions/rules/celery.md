# Celery

## Colas y workers

- Una cola por dominio de trabajo (screenshots, reportes, mensajería, scraping) — no una cola global. Cada cola con su unit de systemd, para reiniciar/escala independiente.
- Nombrar colas y units igual: la unit `reportes_<proyecto>` consume la cola `reportes`.
- `acks_late=True` + `task_reject_on_worker_lost=True` para tareas que no deben perderse; solo si la tarea es idempotente.

## Idempotencia y reintentos

- Toda tarea que escribe a BD o llama APIs externas debe tolerar ejecutarse dos veces (clave natural + `update_or_create`, o check de estado previo).
- Reintentos con backoff exponencial y tope (`autoretry_for`, `retry_backoff=True`, `max_retries`); nunca retry infinito contra una API caída.
- Con SQLite: serializar escritores — un solo worker de concurrencia 1 en las colas que escriben mucho; los demás leen.

## Envíos a clientes reales — gate obligatorio

Cualquier tarea que pueda mandar WhatsApp/Telegram/email a grupos o contactos reales:

1. Lee `ENTORNO` (`dev`/`prod`) de config y pasa por un **router de entrega**: en dev, los envíos van a un grupo/canal de pruebas o a log, jamás al destino real.
2. Expone `--dry-run` cuando se invoca por management command.
3. Nunca se dispara "a mano en producción para probar" — eso es un envío real.

Un fallback de clasificación (LLM caído, parser fallido) **nunca publica un valor default a clientes**: marca el ítem para revisión y notifica, no inventa.

## Beat / cron

- Programación versionada (celery beat schedule en settings o crontab documentado en el repo), no solo en el crontab del server.
- Toda tarea programada loggea inicio/fin con conteo de ítems — silencio total es indistinguible de "no corrió".
