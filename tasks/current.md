# Trabajo actual

_Última actualización: 2026-07-02_

## Qué se está desarrollando

MVP completo de la plataforma (v0.4): réplica del diseño original con las cuatro vistas funcionando en modo demo y contra Supabase.

**Hecho en esta iteración:**
- ✅ Proyecto Angular 22 + Tailwind v4 con design tokens del mockup
- ✅ Clean architecture: dominio, aplicación (store con signals), datos (Supabase + demo)
- ✅ Autenticación con roles (admin/mesero/cocina) y guards; cliente sin login
- ✅ Vistas: Cliente (home + QR `/mesa/:n`), Login (footer), Admin (7 secciones con plano drag & drop y fusión de mesas), Mesero, Cocina
- ✅ Eliminación permanente de personal con doble confirmación (protección de datos)
- ✅ Migraciones SQL + RLS + seed en `supabase/`
- ✅ 19 pruebas unitarias (Vitest) y 25 E2E (Playwright, escritorio + móvil) en verde
- ✅ Build de producción sin errores
- ✅ Documentación en `docs/` y este tablero

## Hecho tras conectar Supabase (2026-07-02, iteración 2)

- ✅ MCP de Supabase autorizado; proyecto `vtkdvxrocemdyybynegs` ("Restaurante Staff") accesible
- ✅ Migraciones aplicadas: esquema (8 tablas), RLS en todas, seed (4 categorías, 11 productos, 8 mesas, ajustes)
- ✅ Advisors de seguridad revisados: revocado EXECUTE de las funciones SECURITY DEFINER e INSERT anónimos endurecidos (order_items/waiter_calls contra registros existentes). Solo queda el aviso de `rls_auto_enable`, función interna de Supabase.
- ✅ `.env` con la clave publishable (gitignorado); app compila y corre en modo Supabase
- ✅ Corregido 401 del cliente anónimo: `getOrders` ya no incrusta `profiles` (privacidad); `refreshAll` usa `allSettled`; nombre de mesero resuelto en el store
- ✅ Verificado en preview: la home carga los 11 productos reales desde la base

## Hecho tras el pulido de diseño (2026-07-02, iteración 3)

- ✅ Pulido de accesibilidad/UX global con **ui-ux-pro-max** (identidad intacta): `:focus-visible` terracota, `prefers-reduced-motion`, transiciones 150–300 ms, `touch-action: manipulation`, `min-h-dvh` en todas las vistas
- ✅ Login mejorado: validación inline tras *touched*, indicadores requeridos, toggle mostrar/ocultar contraseña, `aria-invalid`/`aria-describedby`, focus al primer campo inválido, `aria-live` en el error
- ✅ **QR real por mesa** (`app-table-qr`): generación local con `qrcode` (sin llamadas externas), apunta a `/mesa/:numero`, botón de impresión. Reemplaza el placeholder del diseño
- ✅ **LICENSE MIT** y **CI** (`.github/workflows/ci.yml`): build + unit + e2e en cada push/PR, en modo demo
- ✅ E2E herméticas: `RS_FORCE_DEMO=1` fuerza modo demo en Playwright (no muta la base real). 25/25 verde
- ✅ Verificado en preview: login pulido y QR generándose

## Hecho en la iteración 4 (registro inicial + Storage)

- ✅ **Registro inicial del admin** (`/registro-inicial` + `bootstrapGuard`): formulario público que solo funciona la primera vez; el trigger `handle_new_user` hace admin+propietario al primer perfil; `admin_exists()` (RPC) gobierna la visibilidad. Enlace en `/login` cuando no hay cuentas.
- ✅ **Supabase Storage** (bucket `imagenes`, público-lectura / admin-escritura): subida de fotos de producto (desde cada tarjeta) y logo (en Ajustes); render en tarjetas admin, menú del cliente y cabecera. `restaurant_settings.logo_url` añadido.
- ✅ Contrato `StorageRepository` + `AuthRepository.signUpFirstAdmin/adminExists`; modo demo con data URL local.
- ✅ `.gitignore` corregido (una regla ignoraba las migraciones; ahora migraciones y seed se versionan).
- ✅ 21 unit + 26 e2e verde; build limpio; advisors sin problemas reales (admin_exists es público a propósito).

## Qué falta por terminar

- **Registrar el administrador propietario** entrando a `/registro-inicial` — **acción del usuario** (el asistente no crea cuentas ni introduce contraseñas).
- Opcional: desactivar el registro público en Supabase Auth tras el bootstrap.

## Próximos pasos

1. Hacer el registro inicial y probar login real + RLS con los tres roles
2. Dar de alta al equipo desde el panel y asignar roles
3. Publicar el repositorio (ya tiene licencia MIT y CI)

## Bloqueadores

- Ninguno.

## Archivos afectados (iteración 3 — diseño/pendientes)

- `src/styles.css` (focus-visible, reduced-motion, transiciones, sr-only)
- `src/app/features/auth/login.component.ts` (validación inline, toggle, a11y)
- `src/app/shared/table-qr/table-qr.component.ts` (nuevo, QR por mesa)
- `src/app/features/admin/floor-plan/floor-plan.component.ts` (usa el QR real)
- `src/app/features/**` (`min-h-dvh` en las raíces)
- `scripts/set-env.mjs` (RS_FORCE_DEMO), `playwright.config.ts` (env demo)
- `e2e/auth.spec.ts`, `e2e/admin.spec.ts` (selectores por id)
- `LICENSE` (MIT), `.github/workflows/ci.yml` (nuevo)
- `docs/*.md`, `tasks/*.md`, `README.md`
