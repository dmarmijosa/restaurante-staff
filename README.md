# Restaurante Staff

Sistema de gestión para restaurantes construido con **Angular 22 + Supabase**. Cubre el ciclo completo de una operación: el cliente escanea el QR de su mesa, hace el pedido desde el móvil, la cocina lo recibe en tiempo real, el mesero lo gestiona desde la tablet y el administrador supervisa todo desde el panel.

Arranca en **modo demo** (sin cuenta, sin configurar nada) en menos de un minuto. Cuando quieras usarlo en tu local, un wizard de 6 pasos te conecta a tu propio Supabase.

---

## Qué incluye

### Para el cliente
- **Menú QR por mesa** — acceso desde el móvil sin instalar nada, carrito, seguimiento del pedido en vivo y botón para llamar al mesero.

### Para la cocina
- **Pantalla de comandas en tiempo real** — las nuevas comandas aparecen solas (Supabase Realtime), con aviso sonoro automático y temporizador por plato.

### Para el mesero (tablet)
- **Vista de mesas y pedidos activos** — gestión de llamadas, estado de las mesas y pedidos propios. Funciona **offline** gracias al service worker (PWA): si la tablet pierde señal, los datos del turno siguen disponibles.

### Para el cajero
- **Cobro por método de pago** — efectivo, tarjeta u otros métodos configurables. Historial y arqueo de caja por método.

### Para el administrador
- **Panel completo**: plano del salón interactivo (drag & drop, fusión/separación de mesas), kanban de pedidos, menú y categorías con imágenes, gestión del personal (roles, turnos, horarios), temporada activa, ajustes del restaurante y métricas.
- **Métricas y resumen**: ingresos totales, ticket medio, top de productos, ventas por método de pago, con filtros por periodo (Hoy / 7 días / 30 días / Todo).
- **Moneda configurable**: elige entre 12 símbolos ($, €, £, ¥, R$, S/, ₹, ₩, CHF, CLP$, COP$, ARS$) — se propaga automáticamente a toda la UI.
- **Multi-restaurante**: un solo despliegue puede servir a varios locales.

### Operación y despliegue
- **Wizard de instalación** `/instalacion` — 6 pasos guiados para conectar Supabase desde cero, sin tocar código.
- **Modo demo completo** — mock API en memoria con latencia simulada para todos los roles; ideal para demostrar o desarrollar sin base de datos.
- **Internacionalización** — 6 idiomas (es / en / ca / pt / fr / it), detección automática del navegador.
- **QR por mesa** — generación local e impresión desde el panel.
- **Seguridad** — RLS en todas las tablas, registro público bloqueado tras el bootstrap, roles y guards por área.

---

## Estado — v0.9 · 2026-07-08

**43 unitarias** (Vitest) · **29 E2E** (Playwright, escritorio + móvil) · Build limpio

| Área | Estado |
| ---- | ------ |
| Menú QR del cliente (carrito, seguimiento, llamar mesero) | ✅ |
| Pantalla de cocina (tiempo real, aviso sonoro, temporizador) | ✅ |
| Tablet del mesero con PWA/offline | ✅ |
| Caja (cobro, historial, arqueo por método) | ✅ |
| Panel admin completo (plano, kanban, menú, personal, ajustes, métricas) | ✅ |
| Autenticación y roles (admin / mesero / cocina / cajero) | ✅ |
| Multi-restaurante (multi-tenant, RLS scoped) | ✅ |
| Moneda configurable (12 símbolos, propagación automática) | ✅ |
| Internacionalización (6 idiomas, paridad de claves) | ✅ |
| Wizard de instalación guiada (6 pasos, sin código) | ✅ |
| Migraciones Supabase (11 SQL + RLS + seed) | ✅ |
| CI (GitHub Actions: build + unit + E2E en modo demo) | ✅ |

## Arranque rápido (modo demo, sin configurar nada)

```bash
npm install
npm start          # http://localhost:4200
```

Sin credenciales de Supabase la app usa **datos de ejemplo en memoria** (los del diseño). Cuentas demo:

| Rol    | Correo            | Contraseña  |
| ------ | ----------------- | ----------- |
| Admin  | `admin@demo.dev`  | `admin123`  |
| Mesero | `mesero@demo.dev` | `mesero123` |
| Cocina | `cocina@demo.dev` | `cocina123` |
| Cajero | `cajero@demo.dev` | `cajero123` |

> En modo demo el estado vive en memoria: al recargar, vuelve al ejemplo.

## Conectar tu propio Supabase

> Cada quien debe usar **su propio proyecto**. Si ves credenciales `vtkdvxrocemdyybynegs` en algún commit histórico, era un sandbox privado de desarrollo — **no está pensado para producción ni funcionará como back-end de nadie más**. Este repositorio arranca por defecto en **modo demo** (mock en memoria) y tú decides cuándo/cómo conectarlo a tu Supabase.

### Opción A · Wizard visual (recomendado, sin tocar archivos)

1. `npm start` (arranca en modo demo, sin credenciales).
2. Abre <http://localhost:4200/instalacion> — un asistente de 6 pasos te guía:
   - Cómo crear tu proyecto gratuito en Supabase
   - Dónde encontrar la URL y la clave `anon` / `public`
   - Descargas `schema.sql` (las 10 migraciones + seed unificadas) y lo pegas en el SQL Editor
   - Creas tu cuenta de administrador propietario
3. Las claves se guardan en `localStorage` — persisten entre reinicios sin recompilar.
4. Desde el propio panel puedes volver a cambiarlas o volver al modo demo en cualquier momento (**Salir del modo demo** en la barra lateral del admin).

### Opción B · `.env` clásico

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica `supabase/migrations/*.sql` y `supabase/seed.sql` (SQL Editor o `supabase db push`).
3. Copia las variables — **nunca se versionan claves**:

   ```bash
   cp .env.example .env
   # Edita .env:
   # SUPABASE_URL=https://<tu-proyecto>.supabase.co
   # SUPABASE_ANON_KEY=<tu clave publishable/anon>
   ```

4. `npm start`. El script `scripts/set-env.mjs` genera `src/environments/env.generated.ts` (gitignorado) antes de compilar.
5. **Registro inicial del administrador**: abre la app y ve a **`/registro-inicial`** (o pulsa el aviso que aparece en `/login` cuando aún no hay cuentas). El **primer** usuario registrado se convierte automáticamente en **administrador propietario**; a partir de ahí esa ruta se cierra sola y el resto del equipo se da de alta desde el panel.
   - Recomendado: en Supabase → Authentication → Providers, **desactiva el registro público** tras crear al propietario, para que solo el admin dé de alta cuentas.
6. El QR físico de cada mesa apunta a `https://tu-dominio/mesa/<numero>` (el panel del plano genera e imprime cada QR).

## Scripts

| Comando           | Qué hace                            |
| ----------------- | ----------------------------------- |
| `npm start`       | Dev server (genera env primero)     |
| `npm run build`   | Build de producción                 |
| `npm test`        | Unitarias (Vitest)                  |
| `npm run e2e`     | Playwright (levanta el server solo) |
| `npm run set-env` | Regenera `env.generated.ts`         |

## Documentación

- [docs/architecture.md](docs/architecture.md) — arquitectura, flujo de datos, diagramas
- [docs/api.md](docs/api.md) — endpoints, DTOs, servicios, ejemplos
- [docs/decisions.md](docs/decisions.md) — decisiones (ADRs) y patrones
- [docs/conventions.md](docs/conventions.md) — convenciones de código
- [tasks/current.md](tasks/current.md) · [tasks/backlog.md](tasks/backlog.md) — tablero vivo del proyecto

## Stack

Angular 22 (standalone + signals) · Tailwind CSS 4 · Supabase (Postgres, Auth, Realtime) · Vitest · Playwright · TypeScript estricto · Clean architecture

## Licencia

[MIT](LICENSE) — proyecto open source, úsalo y modifícalo libremente.

---

## Changelog

### 2026-07-08
- **fix:** más bugs multi-tenant y de i18n descubiertos ampliando el E2E a flujo cruzado entre roles · `categories.name` era UNIQUE global (dos tenants no podían compartir el nombre "Principales") → `UNIQUE(restaurant_id, name)` · `tables` sin unicidad de nº de mesa dentro del tenant → `UNIQUE(restaurant_id, number)` preventivo · policy `anon crea llamadas` (y `anon crea pedidos qr`) reaplicada con nombres calificados para forzar el estado correcto en DB · clave i18n `kitchen.min_label` faltaba en los 6 idiomas (la card de la cocina mostraba el string literal) · 2 migraciones nuevas (`15_fix_categories_multitenancy_unique`, `16_fix_waiter_calls_anon_insert`)
- **test:** el script funcional ahora hace un **flujo cruzado real**: crea el tenant + admin + staff por API, siembra categoría/productos/mesa con el token del admin, el cliente entra a `/:slug/mesa/1` y hace pedido — luego cada rol (admin/cocina/mesero/cajero) inicia sesión y **ve el mismo pedido `#N · Mesa 1 · Sopa de tortilla · $7.50`** en su vista, validando multi-tenancy + Realtime + RLS punto a punto. 22 capturas por corrida
- **fix:** bugs multi-tenant descubiertos en la prueba funcional end-to-end · policies legacy pre-multi-tenant en `orders`/`order_items`/`waiter_calls` invocando `is_staff()` sin `EXECUTE` para anon · singleton `restaurant_settings.id = 1` bloqueando la creación de settings del segundo tenant · `revoke execute` de `my_restaurant_id()` que rompía las lecturas del panel autenticado · cliente sin slug no resolvía el tenant → `getFirstAvailable()` en `RestaurantRepository` · 3 migraciones nuevas (`12_fix_rls_and_settings`, `13_reapply_signup_triggers`, `14_grant_my_restaurant_id`)
- **test:** script `scripts/functional-test.mjs` — prueba end-to-end contra Supabase real (Playwright) que crea un tenant nuevo por corrida, cubre el flujo del cliente (menú → carrito → pedido → llamar mesero), registra al admin propietario, recorre las 11 secciones del panel, crea cuentas de mesero/cocina/cajero por API y captura la vista de cada rol logueado (22 capturas en `Playwright/`)
- `33b7102` **feat:** moneda configurable por el admin (12 símbolos, `CurrencyService` + `MoneyPipe` reactivo, migración SQL 11, selector en Ajustes, i18n) · **refactor:** `ChipBtnDirective` (7 componentes), `OrderCardComponent` (admin kanban + mesero), `waiterName` real en demo
- `8fce1ef` **feat:** wizard de instalación guiada `/instalacion` (6 pasos, sin código, schema.sql descargable, banner "Configurar mi restaurante" en la home demo, enlace desde el diálogo de conexión del admin)
- `310ba5b` **feat:** notificación sonora automática en cocina — detección por ID de comanda, beep encolado si `AudioContext` está suspendido, indicador visual pulsante e i18n
- `745bbdd` **feat:** PWA/offline para la tablet del mesero — service worker, manifest instalable, `OfflineService` + `WaiterCacheService` (localStorage con TTL 4h), banner offline/reconexión con `aria-live`
- `89aaeac` **feat:** mock API demo, login rápido, salir de demo, horarios, responsive e i18n

### 2026-07-07
- `5c629e1` **fix:** login demo, confirm password, quitar `/r/` de rutas cliente
- `a564164` **fix:** no redirigir al registro desde login, mostrar enlace si no hay admin
- `234929d` **fix:** login muestra form + credenciales demo, "Crear restaurante" en el dashboard
- `349213e` **feat:** i18n con @ngx-translate (6 idiomas, 334 claves)

### 2026-07-04
- `88696d2` agrega paso `/nuevo-restaurante` al tour de driver.js
- `5baa2e1` implementa multi-restaurante (multi-tenant)
- `d07189f` actualiza tablero iteración 9

### 2026-07-03
- `8295109` agrega recorte manual de imagen con pruebas
- `853ffdf` deshabilita registro público tras bootstrap con trigger en `auth.users`
- `5083103` **feat:** aviso sonoro en cocina, asignación de meseros, historial de caja y reinicio diario
- `3ad256c` **feat:** filtros por fecha en el Resumen del admin
- `6225a6d` actualiza tablero y versión a v0.5

### 2026-07-02
- `3540a81` **feat:** MoneyPipe para formatear moneda con dos decimales
- `28812670` **feat:** registro inicial de admin, Storage de imágenes, QR por mesa y pulido de UX
- `fd41497` **feat:** fechas de temporada editables y compresión de imágenes al subir
- `a845ba6` **feat:** registro inicial automático, onboarding con driver.js y rol Cajero
- `6bddf06` **feat:** sección Resumen con métricas del admin
- `cdb9d94` **feat:** tiempo de cocina (temporizador en vivo + tiempo medio de preparación)
