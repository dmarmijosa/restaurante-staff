# Changelog

Todos los cambios relevantes del proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/ES/1.1.0/).

## [0.13.2] — 2026-07-14

### Corregido
- **Resumen admin:** interpolación i18n (`{{count}}`, `{{paid}}`, `{{pending}}`) en las tarjetas KPI; importes usan `CurrencyService` en lugar de `$` fijo.
- **E2E Playwright:** specs alineados con moneda € en demo, cocina por PIN (`/cocina/acceso`), alta de mesero con correo obligatorio, `adminExists` en demo y selectores strict mode.

### Cambiado
- Moneda por defecto **€** (demo, nuevos tenants y `schema.sql`).

### Tests
- **Unit:** `auth.service.spec` alineado con `adminExists() === false` en demo.

---

## [0.13.1] — 2026-07-14

### Corregido
- **Wizard `/instalacion`:** conectar Supabase ya no queda bloqueado si antes se activó «Probar modo demo» (`rs-force-demo`); `saveSupabaseConfig()` limpia esa bandera al guardar credenciales.
- **Wizard paso 3:** mensaje de error cuando la conexión no se aplica tras recargar; el formulario repuebla URL/clave desde `localStorage` o `.env`; textos actualizados para claves `sb_publishable_…` además de JWT `eyJ…`.

### Documentación
- `manual.md`, `README.md`, `tasks/current.md`, `docs/decisions.md` y `docs/architecture.md` alineados con el flujo del wizard y la prioridad runtime-config (localStorage → `.env`).

---

## [0.13.0] — 2026-07-09

### Añadido
- Script `scripts/frontend-flow.mjs`: recorrido funcional completo solo por frontend contra Supabase real (bootstrap de tenant o restaurante existente).
- Comando npm `e2e:flow` para ejecutar el flujo con capturas en `/Playwright`.
- Modos: tenant nuevo (`/nuevo-restaurante`) o existente (`E2E_EXISTING=1` + credenciales admin).
- Cobertura: admin (todas las secciones), cliente (menú, carrito, pedido, llamar mesero), cocina (PIN), mesero, cajero y vista móvil.

---

## [0.12.0] — 2026-07-08

### Añadido
- **Acceso a cocina por PIN** de 6 dígitos en `/cocina/acceso` (y `/cocina/acceso/:slug` con varios restaurantes).
- Cuenta interna por restaurante (`kitchen+{uuid}@restaurantestaff.internal`) con rol `cocina`.
- Configuración del PIN desde **Admin → Ajustes → Tablet de cocina** (`admin_set_kitchen_pin`).
- Pantalla `kitchen-access` con teclado numérico y validación en servidor (`kitchen_pin_is_valid`).
- RPC `resolve_kitchen_restaurant` para resolver el tenant correcto (prioriza el que tiene PIN).
- RPC `count_kitchen_url_tenants` para URLs canónicas: un restaurante → `/cocina`; varios → `/cocina/:slug`.
- Parches SQL incrementales: `patch-kitchen-pin.sql`, `patch-kitchen-identity-fix.sql`, `patch-kitchen-url-tenants.sql`, `patch-kitchen-resolve-pin.sql`.
- Migraciones 23–26 en `supabase/migrations/`.

### Cambiado
- La cocina **deja de ser kiosk anónimo**: se elimina la policy `anon avanza pedidos cocina`.
- Solo el rol `cocina` accede al panel (el admin ya no entra por esa ruta).
- `schema.sql` regenerado con **26 migraciones**.

### Corregido
- Cuentas cocina creadas sin fila en `auth.identities` impedían el login (migración 24).
- PIN correcto rechazado porque `/cocina/acceso` resolvía otro restaurante distinto al configurado (migración 26).

### Infraestructura
- Node **24.16.0** y npm **11.13.0** fijados en `.nvmrc`, `.npmrc` y `package.json` (`engines` + `packageManager`).

---

## [0.11.0] — 2026-07-08

### Añadido
- Pantalla `/cocina` y `/cocina/:slug` como kiosk (posteriormente sustituido por PIN en v0.12); migración `22_kitchen_kiosk`.
- Admin **asigna y restablece contraseñas** del equipo desde Meseros y Ajustes; RPC `admin_set_staff_password` (migración 21).
- Página **`/perfil`** para que cada empleado cambie su contraseña.
- Alta de empleados con contraseña opcional; rol Cocina ya no se da de alta manualmente (solo mesero y cajero).

### Corregido
- Llamar mesero y enviar pedido usan cliente Supabase **anon** aunque haya sesión staff; migración `20_qr_insert_authenticated`.
- Scroll completo en Chrome móvil (`viewport-fit=cover`).
- Llamadas atendidas visibles en mesero; mesa libre al cobrar si no quedan pedidos abiertos.
- Editar/eliminar productos, `restaurant_id` en altas de mesa, repos dinámicos tras wizard.

### Chore
- `schema.sql` con 22 migraciones; parches `patch-admin-set-staff-password.sql` y `patch-kitchen-kiosk.sql`.

---

## [0.10.0] — 2026-07-08

### Añadido
- `create_restaurant()` con **seed automático** (4 categorías, 6 productos, 4 mesas, 3 métodos de pago); migración 19.
- Enlace «Probar modo demo» en login (`rs-force-demo`).
- Scripts `build-schema.mjs`, `build-reset-schema.mjs`, `wizard-test.mjs`.

### Corregido
- `payment_methods.name` UNIQUE global → `UNIQUE(restaurant_id, name)` (migración 18).
- `42501` al llamar al mesero: falta policy `anon lee llamadas` (migración 17).
- Bugs multi-tenant: categorías, mesas, RLS, singleton settings, grants (migraciones 12–16).

### Test
- E2E ciclo de vida completo del pedido (28 asserts, 0 fallos).
- Script `scripts/functional-test.mjs` contra Supabase real.

### Docs
- Wizard aclara credenciales temporales en navegador; manual actualizado.
- `.mcp.json` en `.gitignore`.

---

## [0.9.0] — 2026-07-07

- Moneda configurable (12 símbolos, `CurrencyService`, migración 11).
- Wizard de instalación `/instalacion` (6 pasos).
- Notificación sonora automática en cocina.
- PWA/offline para tablet del mesero.
- Mock API demo, login rápido, horarios, responsive.
- Rediseño responsivo de todos los roles.
- i18n con @ngx-translate (6 idiomas).

---

## [0.5.0] — 2026-07-03 / 2026-07-04

- Multi-restaurante (multi-tenant).
- Aviso sonoro en cocina, asignación de meseros, historial de caja.
- Filtros por fecha en Resumen del admin.
- Registro público bloqueado tras bootstrap.
- Recorte manual de imágenes.

---

## [0.1.0] — 2026-07-02

- Lanzamiento inicial: menú QR, cocina en tiempo real, mesero, cajero, panel admin.
- Resumen con métricas, temporizador de cocina, MoneyPipe.
- Registro de admin, Storage de imágenes, QR por mesa, onboarding con driver.js.

[0.13.0]: https://github.com/Restaurante-Staff-Open-Source/restaurante-staff/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/Restaurante-Staff-Open-Source/restaurante-staff/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/Restaurante-Staff-Open-Source/restaurante-staff/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/Restaurante-Staff-Open-Source/restaurante-staff/compare/v0.9.0...v0.10.0
