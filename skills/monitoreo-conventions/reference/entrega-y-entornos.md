# Entrega y entornos

## Router de entrega (el gate que protege a los clientes)

Todo mensaje saliente (WhatsApp, Telegram, email) pasa por un único módulo router; ningún script llama a la API de mensajería directo.

```python
def destino(canal: str, cfg) -> str:
    if cfg.ENTORNO != "prod":
        return cfg.DESTINOS_PRUEBA[canal]    # grupo de pruebas o log
    return cfg.DESTINOS_REALES[canal]
```

- `ENTORNO` viene de `.env` (`ENTORNO=dev|prod`); **el default es `dev`** — producción se activa explícitamente.
- `--dry-run` en todo entrypoint que entrega: imprime lo que enviaría, no envía.
- Probar "rapidito a mano en el server" ES un envío real a clientes. La prueba se hace en dev contra el grupo de pruebas.
- Reintentos de envío idempotentes: registrar `enviado_at` por mensaje y verificar antes de reenviar — un retry no debe duplicar el mensaje al grupo del cliente.

## Sync monitor → dashboard: patrón outbox

Cuando el monitor alimenta un dashboard por API:

1. El pipeline escribe el evento en una tabla `outbox` local (misma transacción que el dato).
2. Un worker separado (`sync_worker`) drena el outbox contra la API con retry/backoff y marca enviados.
3. La API de ingesta del dashboard es idempotente — reenviar un evento no duplica.

Ventajas sobre el barrido de archivos: nada se pierde si el dashboard está caído, el estado de sync es consultable, y el monitor no se bloquea por la red.

- El worker de sync corre como servicio (systemd), desacoplado del cron del pipeline.
- Autenticación por Bearer token de servicio, uno por monitor/VPS, rotable sin tocar código.

## Despliegue en VPS

- Un servicio/cron por responsabilidad, versionado en el repo (`deploy/systemd/*.service`, crontab documentado) — el server no es la única copia de la programación.
- `deploy.sh` idempotente: pull/copy + deps + migraciones + restart de units; con backup previo del estado.
- El cutover de un pipeline viejo al nuevo = cambiar la línea del crontab/unit, con la línea vieja comentada y fechada durante el periodo de convivencia.
- Healthcheck barato (endpoint o script) que verifica: última corrida < N horas, outbox sin atasco, disco con espacio.
