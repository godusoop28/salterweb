# SALTER · Prototipo interactivo

**SALTER — Alternativa en Movimiento.** Prototipo de alta fidelidad del sistema integral de gestión de paquetería (Plan Integral).

Es una aplicación **Next.js navegable**. Sirve para que SALTER pruebe cómo funcionará su sistema antes del desarrollo definitivo: administración, app del repartidor, portal de remitentes y rastreo público, en computadora y en celular.

> ⚠️ **Entorno de demostración.** Todos los datos son ficticios y los cambios se guardan sólo en el navegador (localStorage). No hay autenticación real ni conexión a servidores.

---

## Tecnologías

| Área | Herramienta |
|---|---|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 con variables de diseño propias de SALTER |
| Íconos | Lucide React |
| Gráficas | Recharts |
| Formularios | React Hook Form + Zod |
| Tipografía | Plus Jakarta Sans (texto), Exo 2 (títulos), JetBrains Mono (guías) |
| Capturas | playwright-core (usa Edge o Chrome ya instalados) |

## Requisitos

- Node.js 20.9 o superior (probado con Node 24)
- npm 10 o superior

## Instalación y ejecución

```bash
npm install
npm run dev          # http://localhost:3000
```

Versión de producción:

```bash
npm run build
npm run start        # http://localhost:3000
```

Otros comandos:

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript sin emitir archivos
npm run previews     # Capturas de pantalla (con la app corriendo)
```

## Perfiles de demostración

En `/login` hay botones de **acceso rápido**. También puedes escribir las credenciales:

| Perfil | Correo | Contraseña | Entra a |
|---|---|---|---|
| Administración | `admin@salter.mx` | `demo1234` | `/dashboard` |
| Supervisor | `operaciones@salter.mx` | `demo1234` | `/dashboard` |
| Repartidor (Juan Pérez) | `repartidor@salter.mx` | `demo1234` | `/entregas` |
| Remitente (Tienda El Sol) | `cliente@tiendaelsol.mx` | `demo1234` | `/portal` |

Sin iniciar sesión, cada área muestra su perfil de demostración por defecto.

## Rutas disponibles

| Ruta | Pantalla |
|---|---|
| `/` | Bienvenida con acceso a las cuatro vistas |
| `/login` | Inicio de sesión |
| **Administración** | |
| `/dashboard` | Panel general: indicadores, gráficas, entregas del día, incidencias y actividad |
| `/paquetes` | Tabla con buscador, filtros, pestañas, paginación, vista rápida y exportación CSV |
| `/paquetes?nuevo=1` | Abre directamente el formulario de nuevo paquete |
| `/paquetes/[guia]` | Detalle: línea de tiempo, remitente, destinatario, datos, repartidor y evidencia |
| `/repartidores` | Tarjetas o tabla, productividad, ficha, cambio de estado y asignación de paquetes |
| `/remitentes` | Clientes, actividad mensual, alta de remitentes |
| `/incidencias` | Registro, filtros, severidad, evidencia, seguimiento y resolución |
| `/reportes` | Indicadores por periodo y ciudad, gráficas, resumen ejecutivo y exportación |
| `/usuarios` | Usuarios, roles, estado de cuenta y matriz de permisos |
| `/configuracion` | Datos de la empresa, identidad de marca, reglas de operación y datos demo |
| **App del repartidor** (móvil) | |
| `/entregas` | Entregas del día con avance y siguiente parada |
| `/entregas/[guia]` | Detalle, llamar, cómo llegar, reprogramar e incidencia |
| `/entregas/[guia]/evidencia` | Foto, quién recibe, firma en pantalla y confirmación |
| `/ruta` | Ruta del día con mapa **ilustrativo** (no es GPS) |
| `/historial` | Entregas de los últimos 7 días |
| **Portal del remitente** | |
| `/portal` | Inicio del cliente con envíos en curso |
| `/mis-envios` | Historial con estados y detalle |
| `/nuevo-envio` | Registro de una solicitud de envío |
| **Público** | |
| `/rastreo?guia=SAL-001230` | Rastreo por número de guía |

## Logotipos

Los originales están en `branding-original/`, renombrados según su uso y sin modificar. Para la web se generaron versiones **recortadas y con fondo transparente** en `public/branding/`:

| Archivo | Uso en el sistema |
|---|---|
| `salter-horizontal.png` | Login |
| `salter-compacto.png` | Barra lateral, portal, app del repartidor y rastreo |
| `salter-vertical.png` | Pantalla de bienvenida |
| `salter-isotipo.png` | Barra lateral contraída, encabezado móvil y favicon (`src/app/icon.png`) |
| `salter-mono.png` | Documentos e impresión (muestra en Configuración) |
| `salter-oscuro.png` | Paneles navy (login, app del repartidor en escritorio) |

Los colores de marca se extrajeron de los logos y se definen en `src/app/globals.css`: azul `#0B5CD5`, naranja `#FF7A00`, naranja de acción `#E35D00` (contraste AA), cielo `#00A3F0` y navy `#011638`.

## Estructura

```text
src/
  app/
    (auth)/login/            Inicio de sesión
    (admin)/…                Panel administrativo (layout con sidebar + topbar)
    (repartidor)/…           App móvil del repartidor
    (cliente)/…              Portal del remitente
    rastreo/                 Rastreo público
    page.tsx                 Bienvenida
  components/
    ui/                      Design system: Button, Input, Select, Modal, Drawer, Badge, StatCard, ChartCard, Tabs, Pagination…
    layout/                  AdminShell, ClientShell, CourierShell
    branding/                Logo
    shared/                  Timeline, StatusStepper, SignaturePad, PhotoPicker, Evidence
    dashboard/ paquetes/ repartidores/ remitentes/ incidencias/ reportes/ rastreo/ usuarios/ auth/
  hooks/use-demo.ts          Estado compartido (useSyncExternalStore)
  lib/
    types/                   Modelos de dominio (contrato con la futura API)
    constants/               Estados, etiquetas, ciudades
    mock-data/               Generador determinista de datos de demostración
    services/                demo-store (persistencia), salter-service (operaciones), analytics (indicadores)
    utils/                   Formatos de fecha/moneda (zona horaria de CDMX) y utilidades
scripts/capture-previews.mjs Capturas automáticas
previews/                    Capturas de escritorio y móvil
```

## Datos de demostración

- **1,248 envíos** entre mayo y octubre de 2026, con volumen mensual creciente. El "hoy" de la demo es el **29 de octubre de 2026**.
- 7 repartidores (uno por ciudad), 8 remitentes, incidencias históricas y abiertas, y usuarios con 4 roles.
- Los datos se generan con una semilla fija: todos los indicadores, gráficas y tablas son coherentes entre sí.
- Las entregas históricas muestran **evidencia ilustrativa**. Las que confirmes desde la app guardan la foto y la firma reales.

### Restaurar datos originales

Cualquiera de estas tres opciones:

- Barra lateral → **Restaurar datos**
- Menú de usuario → **Restaurar datos demo**
- **Configuración → Datos de demostración → Restaurar datos originales**

## Qué es simulado

- Autenticación: no se valida contra un servidor; las cuentas demo usan `demo1234`.
- Persistencia: localStorage del navegador.
- Mapa de ruta: dibujo ilustrativo. **No** hay GPS ni optimización de rutas (fuera del alcance).
- Avisos por correo, recuperación de contraseña e invitaciones: sólo se muestran como mensajes.
- No incluye WhatsApp, tarifas, facturación ni pagos (fuera del alcance del Plan Integral).

## Conectar la API real (Spring Boot + PostgreSQL)

Toda la interfaz lee datos con `useDemoState()` y los modifica sólo mediante las funciones de `src/lib/services/salter-service.ts`, por ejemplo `createShipment`, `assignCourier`, `confirmDelivery` o `createIncident`. Los componentes no conocen la implementación.

1. Implementar cada función de `salter-service.ts` con `fetch` a la API, conservando su firma. Por ejemplo, `POST /api/paquetes` o `POST /api/paquetes/{id}/entrega` (multipart con foto y firma).
2. Sustituir `demo-store.ts` por una capa de caché/consulta (por ejemplo TanStack Query o Server Components) que exponga el mismo `DemoState` o selectores equivalentes.
3. Mover el cálculo de `analytics.ts` a endpoints de reportes cuando el volumen lo requiera.
4. Reemplazar `login()` por la autenticación definitiva (JWT o sesión) y proteger las rutas con `proxy.ts`.
5. Subir las evidencias al almacenamiento externo que se defina, en lugar de guardarlas como data URL.
6. Configurar la URL de la API con variables de entorno (`NEXT_PUBLIC_API_URL`) en Render. No hay credenciales en el código.

## Capturas

Están en `previews/escritorio/` (1440 × 900) y `previews/movil/` (390 × 844 @2x). Para regenerarlas, con la app corriendo:

```bash
npm run previews
```
