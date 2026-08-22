# Multi-tenancy (nivel ORM, una sola BD)

Patrón: tenancy por fila con FK `cliente` en cada modelo de negocio, resuelta por request. No schema-per-tenant.

## Resolución del tenant

```python
# middleware.py
class TenantMiddleware:
    def __call__(self, request):
        request.cliente = resolver_por_host(request.get_host())  # Host header → Cliente
        set_current_cliente(request.cliente)                     # thread-local
        try:
            return self.get_response(request)
        finally:
            clear_current_cliente()   # SIEMPRE limpiar — los threads se reusan
```

- Resolver por `Host` (subdominio o dominio propio por cliente). Host desconocido → 404, nunca un tenant default.
- El thread-local se limpia en `finally`; un thread-local sucio filtra datos entre clientes.

## Aislamiento en queries

- Manager custom que filtra por el cliente actual (`Modelo.objects` ya filtrado); el manager sin filtro (`all_objects`) existe pero su uso es explícito y auditable.
- **Nunca confiar en que la view filtre** — el default seguro es el manager. Toda query que use `all_objects` lleva un comentario de por qué.
- FK `cliente` con `db_index`; toda clave natural de deduplicación incluye al cliente.

## Aislamiento fuera de la BD

- Archivos generados (screenshots, reportes, media) bajo directorio por slug del cliente: `media/<slug>/...`. Nunca un directorio plano compartido.
- Al servir archivos: verificar que el path solicitado pertenece al tenant del request (el slug del path == slug del request), idealmente vía X-Accel/X-Sendfile.
- API keys y configuración por cliente en campo JSON del modelo Cliente — no en env ni en settings.

## Hosts de administración

- `/admin/` solo en el host administrativo dedicado; en subdominios de cliente responde 404.
- Comandos de gestión que operan sobre un tenant reciben `--cliente <slug>` explícito; sin default.

## Puertas

- Si un modelo de negocio nuevo no tiene FK `cliente` — detener y justificar (¿es realmente global?).
- Si un test de tenancy no existe para el middleware/managers — crearlo antes de tocar la resolución de tenant: es el código con mayor costo de regresión del sistema.
