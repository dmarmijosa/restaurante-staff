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

## Estado — v0.13 · 2026-07-14

**43 unitarias** (Vitest) · **29 E2E de UI** (Playwright, escritorio + móvil) · **1 E2E funcional contra Supabase real** (28 asserts, 0 fallos) · Build limpio

| Área | Estado |
| ---- | ------ |
| Menú QR del cliente (carrito, seguimiento, llamar mesero) | ✅ |
| Pantalla de cocina (tiempo real, aviso sonoro, temporizador, acceso por PIN) | ✅ |
| Tablet del mesero con PWA/offline | ✅ |
| Caja (cobro, historial, arqueo por método) | ✅ |
| Panel admin completo (plano, kanban, menú, personal, ajustes, métricas) | ✅ |
| Autenticación y roles (admin / mesero / cocina / cajero) | ✅ |
| Multi-restaurante (multi-tenant, RLS scoped) | ✅ |
| Tenant nuevo listo para operar de inmediato — `create_restaurant()` siembra 4 categorías, 6 productos, 4 mesas y 3 métodos de pago | ✅ |
| Moneda configurable (12 símbolos, propagación automática) | ✅ |
| Internacionalización (6 idiomas, paridad de claves) | ✅ |
| Wizard de instalación guiada (6 pasos, sin código) | ✅ |
| Migraciones Supabase (26 SQL + RLS + seed) | ✅ |
| Prueba E2E que recorre el ciclo de vida del pedido (cliente → cocina → mesero → cajero → historial) contra Supabase real | ✅ |
| CI (GitHub Actions: build + unit + E2E en modo demo) | ✅ |

## Arranque rápido (modo demo, sin configurar nada)

```bash
nvm use            # Node 24.16.0 (lee .nvmrc)
corepack enable    # npm 11.13.0 (lee packageManager en package.json)
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

### Opción A · Wizard visual (prueba rápida en el navegador)

1. `npm start` (arranca en modo demo si no hay `.env`).
2. Abre <http://localhost:4200/instalacion> — asistente de 6 pasos:
   - Crear proyecto en Supabase
   - **Desactivar «Confirm email»** en Authentication → Providers → Email
   - Pegar URL + clave publishable (solo en **este navegador**, no modifica `.env`)
   - Descargar y ejecutar `schema.sql` en el SQL Editor (26 migraciones unificadas)
   - Crear restaurante + cuenta en `/nuevo-restaurante`
3. **Limitación:** las claves del wizard son temporales (almacenamiento local del navegador). Si cierras el navegador, borras datos del sitio o usas otro dispositivo, debes volver a conectar.
4. **Instalación completa y permanente:** sigue [manual.md](manual.md) (§3–§5): `schema.sql`, confirmación de correo, `.env` y `npm run build`.

### Opción B · `.env` + build (recomendado para producción)

1. Lee el **[manual de instalación](manual.md)** paso a paso (pensado para personas no técnicas).
2. Crea un proyecto en [supabase.com](https://supabase.com).
3. Ejecuta `public/setup/schema.sql` en el SQL Editor (o `reset-and-schema.sql` para empezar de cero).
4. Copia las variables — **nunca se versionan claves**:

   ```bash
   cp .env.example .env
   # Edita .env:
   # SUPABASE_URL=https://<tu-proyecto>.supabase.co
   # SUPABASE_ANON_KEY=<tu clave publishable/anon>
   ```

5. `npm start` (desarrollo) o `npm run build` (producción). `scripts/set-env.mjs` genera `env.generated.ts` (gitignorado) antes de compilar. Tras editar `.env`, **reinicia** el servidor de desarrollo.
6. **Registro:** `/nuevo-restaurante` crea el tenant + admin propietario. Desactiva el registro público en Supabase tras el bootstrap (ver manual §5.1).
7. El QR de cada mesa apunta a `https://tu-dominio/r/<slug>/mesa/<numero>` (generable desde el plano del salón).

## Scripts

| Comando           | Qué hace                            |
| ----------------- | ----------------------------------- |
| `npm start`       | Dev server (genera env primero)     |
| `npm run build`   | Build de producción                 |
| `npm test`        | Unitarias (Vitest)                  |
| `npm run e2e`     | Playwright (levanta el server solo) |
| `npm run set-env` | Regenera `env.generated.ts`         |
| `node scripts/build-schema.mjs` | Regenera `public/setup/schema.sql` |
| `node scripts/build-reset-schema.mjs` | Genera `reset-and-schema.sql` (borrar + schema) |

## Documentación

- **[CHANGELOG.md](CHANGELOG.md)** — historial de versiones
- **[manual.md](manual.md)** — guía de instalación paso a paso (no técnica); también en `/manual.md` con la app en marcha
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

Historial completo en **[CHANGELOG.md](CHANGELOG.md)**.

### 2026-07-14 — v0.13.1
- **fix(wizard):** conectar en `/instalacion` ya no falla silenciosamente si `rs-force-demo` estaba activo; mensaje de error y repoblado del formulario; claves `sb_publishable_…` documentadas

### 2026-07-08 — v0.12
- **feat(cocina):** acceso protegido por **PIN de 6 dígitos** (`/cocina/acceso`); cuenta interna por restaurante; admin configura PIN en Ajustes
- **fix(cocina):** resolución del tenant correcto y validación de PIN en servidor (`resolve_kitchen_restaurant`, `kitchen_pin_is_valid`)
- **fix(auth):** cuentas cocina sin `auth.identities` no podían hacer login (migración 24)
- **chore:** `schema.sql` con 26 migraciones; Node 24.16.0 + npm 11.13.0 en `.nvmrc` / `.npmrc`

### 2026-07-08 — v0.11
- **feat(cocina):** pantalla `/cocina` y `/cocina/:slug` **sin login** — kiosk abierto para la tablet de cocina; migración `22_kitchen_kiosk` (`anon avanza pedidos cocina`); parche `public/setup/patch-kitchen-kiosk.sql`
- **feat(personal):** el admin **asigna y restablece contraseñas** del equipo desde Meseros y Ajustes (modal con copiar + icono mostrar/ocultar); RPC `admin_set_staff_password` (migración 21 + parche SQL); página **`/perfil`** para que cada empleado cambie la suya
- **feat(cliente):** alta de empleados con contraseña opcional; ya no se da de alta rol Cocina (solo mesero y cajero)
- **fix(cliente):** llamar mesero y enviar pedido usan **cliente Supabase anon** aunque haya sesión staff abierta; migración `20_qr_insert_authenticated` para INSERT como `authenticated`
- **fix(cliente):** eliminada tarjeta “Mesero” en el seguimiento del pedido; **scroll completo en Chrome móvil** (`viewport-fit=cover`, scroll de página en lugar de contenedor `h-dvh`)
- **fix(mesero):** llamadas **atendidas** visibles en sección verde; lista de llamadas del turno (24 h)
- **fix(caja):** al cobrar, la **mesa pasa a libre** si no quedan pedidos abiertos en ella
- **fix(admin):** editar/eliminar productos, `restaurant_id` en altas de mesa, repos dinámicos tras wizard, registro admin y validación de contraseñas
- **chore:** `schema.sql` regenerado (22 migraciones); parches `patch-admin-set-staff-password.sql` y `patch-kitchen-kiosk.sql` para bases ya desplegadas

### 2026-07-08 — v0.10 (continuación)
- **docs:** wizard aclara que pegar credenciales es **temporal en el navegador** y remite al [manual.md](manual.md) para instalación completa (`.env` + `npm run build`); manual actualizado a v0.10 (19 migraciones, confirmación de correo, `reset-and-schema.sql`, modo demo recuperable)
- **feat(login):** enlace «Probar modo demo» cuando hay credenciales en `.env` o localStorage (`rs-force-demo`)
- **fix(wizard):** `schema.sql` regenerado (19 migraciones), reload tras conectar credenciales, política RLS `restaurant_id` corregida
- **chore:** `.mcp.json` en `.gitignore`; scripts `build-schema.mjs`, `build-reset-schema.mjs`, `wizard-test.mjs`

### 2026-07-08 — v0.10
- **feat:** `create_restaurant()` con **seed automático** — al crear un tenant nuevo se insertan 4 categorías (Entradas, Principales, Postres, Bebidas), 6 productos de ejemplo, 4 mesas en cuadrícula 2×2 y 3 métodos de pago (Efectivo, Tarjeta, Transferencia). Antes un tenant recién creado quedaba vacío: el cliente veía la home sin menú y el cajero no podía cobrar hasta configurar todo a mano. Migración `19_create_restaurant_seed`
- **test:** E2E cubre el **ciclo de vida completo del pedido** con acciones reales de cada rol — cocina pulsa "Empezar a preparar" y "Platillo listo" (verifica `recibido → preparando → listo` en la DB), mesero "Atender mesa" (verifica `waiter_calls.attended = true`) y "Marcar Entregado" (`listo → entregado`), cajero cobra con Efectivo (verifica `paid = true` y `payment_method` en la DB), admin final ve historial + resumen con métricas coherentes. 28 capturas, 28 asserts, 0 fallos
- **fix:** `payment_methods.name` era UNIQUE global (mismo patrón que categorías) — dos tenants no podían tener "Efectivo" a la vez, bloqueando el arranque del rol Cajero al crear un tenant nuevo. Migración `18_fix_payment_methods_unique` cambia a `UNIQUE(restaurant_id, name)`
- **fix:** root cause del `42501` al llamar al mesero — la migración 12 dropeó `"todos leen llamadas"` sin dejar reemplazo para `anon`. Como el cliente inserta con `.select().single()` en supabase-js, PostgREST hace INSERT + SELECT con `Prefer: return=representation` y el SELECT falla, devolviendo el mismo código de error que un INSERT rechazado. Solución: policy `"anon lee llamadas"` restringida a tenants existentes (migración `17_add_anon_read_waiter_calls`). Verificado con la prueba E2E — la llamada aparece en la card `"Mesa 1 llama · Atender mesa"` del panel del mesero
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
