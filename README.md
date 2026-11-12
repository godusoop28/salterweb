# SALTER · Frontend (salter-frontend)

**SALTER — Alternativa en Movimiento.** Interfaz web del sistema de operación de paquetería:
guías, destinatarios, manifiestos, salidas, recepción, repartidores, incidencias y reportes.

El backend vive en el repositorio **salterapi** (Java 21 + Spring Boot + PostgreSQL). Este proyecto sólo se encarga de la
experiencia de usuario: **no guarda información operativa en el navegador** ni decide reglas de negocio; todo se valida
en la API.

## Tecnologías

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query (caché e invalidación) ·
React Hook Form + Zod · Recharts · Lucide.

## Cómo se conecta con la API

```text
Navegador ──► https://frontend/api/*  ──(rewrite de Next.js)──►  SALTER_API_URL/api/*
```

- `next.config.ts` reenvía `/api/*` al backend: la cookie de sesión `SALTER_SESSION` (HttpOnly) queda en el dominio del
  frontend y no se requiere CORS desde el navegador.
- `src/lib/api/client.ts`: cliente HTTP único (cabecera anti-CSRF `X-Requested-With`, errores RFC 7807 → `ApiError`,
  manejo de sesión expirada, descarga de PDF/CSV/XLSX).
- `src/lib/api/hooks.ts`: consultas con caché e invalidación tras cada operación.
- `src/lib/session.tsx`: sesión real (`/api/auth/me`), permisos y pantalla inicial por rol.
- `src/proxy.ts`: redirige a `/login` si no hay cookie de sesión (primera barrera; la autorización real es del backend).

## Pantallas y navegación por rol

Hay sólo **4 roles**: **Administrador** (administrador general), **Remitente** (elabora sus guías y consulta sus envíos), **Receptor** (confirma la llegada a destino) y **Repartidor** (entrega). El menú se construye con los **permisos** que devuelve la API; no se muestran opciones sin acceso.

| Ruta | Módulo | Quién la ve (por defecto) |
|---|---|---|
| `/login` | Inicio de sesión real | Todos |
| `/dashboard` | Indicadores del backend | Admin |
| `/guias/nueva` | Captura rápida de guías (teclado, alta inline, duplicados, borrador/confirmación) | Remitente, Admin |
| `/guias`, `/guias/[id]` | Guías / mis guías / mis envíos, detalle, historial, acciones y PDF | Según alcance |
| `/destinatarios` | Catálogo, búsqueda sin acentos, importación Excel/CSV con correspondencia de columnas | Remitente (los suyos), Admin |
| `/manifiestos` | Elaboración, cierre, reapertura y **autorización de salida** | Admin |
| `/recepcion` | Recepción por folio (compatible con lector de códigos) | Receptor, Admin |
| `/repartidores` | Repartidores y asignación de guías | Admin |
| `/incidencias` | Seguimiento y resolución | Admin (otros: las propias) |
| `/reportes` | Filtros y exportación CSV / Excel / PDF | Admin, Remitente (propios) |
| `/usuarios` | Usuarios, roles, permisos por rol y por usuario | Admin |
| `/remitentes`, `/configuracion` | Catálogos, turnos, conceptos, reglas provisionales | Admin |
| `/entregas`, `/historial` | App móvil del repartidor (sólo sus asignaciones) | Repartidor |
| `/rastreo` | Rastreo público (sin datos personales) | Público |

Las rutas del prototipo (`/paquetes`, `/portal`, `/mis-envios`, `/nuevo-envio`, `/ruta`) redirigen a los módulos nuevos.

## Desarrollo local

1. Levanta la API (ver README de **salterapi**). Por defecto escucha en `http://localhost:8080`.
2. Frontend:
   ```bash
   cp .env.example .env.local     # ajusta SALTER_API_URL si es necesario
   npm install
   npm run dev                    # http://localhost:3000
   ```
3. Entra con un usuario creado por el administrador (o los de ejemplo del perfil `dev` de la API).

Comandos: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Despliegue en Vercel

1. Desplegar primero la API (Render u otro servicio con Docker) y obtener su URL pública.
2. En Vercel → Settings → Environment Variables: `SALTER_API_URL=https://<api>` (Production y Preview).
3. Volver a desplegar (los rewrites se generan en el build).
4. En la API: `SALTER_CORS_ORIGINS=https://<frontend>`, `SALTER_COOKIE_SECURE=true`.

## Pendientes del cliente

Los formatos de guía/manifiesto, campos obligatorios y reglas de estados son **provisionales**. Ver
`PENDIENTES_CLIENTE.md` en el repositorio salterapi.

## Logotipos

Originales en `branding-original/`; versiones web en `public/branding/`. Colores: azul `#0B5CD5`, naranja `#FF7A00`,
naranja de acción `#E35D00`, cielo `#00A3F0`, navy `#011638`.
