# Trabajo actual

_Última actualización: 2026-07-03 (iteración 7)_

## Estado actual

MVP completo de la plataforma (v0.5): todas las vistas operativas en modo demo y contra Supabase real. Stack estable, 8 migraciones aplicadas, 33 pruebas unitarias y 28 E2E en verde.

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

## Hecho en la iteración 5 (registro auto + onboarding + rol cajero)

- ✅ **Login redirige** automáticamente a `/registro-inicial` cuando no hay admin; tras crear la cuenta y verificar, el login funciona normal.
- ✅ **Onboarding con driver.js** en el panel admin: tour guiado (9 pasos) automático la primera vez + botón "Ver guía del panel".
- ✅ **Rol Cajero**: DB (rol en profiles, tabla `payment_methods`, `orders.paid/payment_method/paid_at`), vista `/cajero` (cobro por método), sección admin "Métodos de pago", alta de cajeros en "Meseros y turnos" (con selección de rol mesero/cocina/cajero).
- ✅ **manual.md**: guía de instalación no técnica (Supabase, claves, primer admin, día a día), que se irá actualizando.
- ✅ 24 unit + 27 e2e verde; build limpio.

## Hecho en la iteración 6 (recorte manual de imágenes)

- ✅ **Recorte manual antes de subir** en imágenes de producto y logo: modal reutilizable con preview, zoom y desplazamiento horizontal/vertical
- ✅ Nueva utilidad `cropImageSquare` en `shared/image-utils.ts` para generar un recorte cuadrado controlado por el usuario
- ✅ Cobertura de pruebas: unitaria para la utilidad de recorte + E2E Playwright del flujo real en admin (subir → recortar → aplicar)
- ✅ Suite validada en verde: **33 unitarias** y **28 E2E**

## Hecho en la iteración 7 (registro inicial + cierre del registro público)

- ✅ **Registro del administrador propietario**: servidor arrancado apuntando a Supabase real; el admin entra en `http://localhost:4200/registro-inicial` y crea su cuenta
- ✅ **Registro público desactivado a nivel base de datos**: nueva función `check_signup_allowed()` + trigger `on_auth_signup_check` en `auth.users BEFORE INSERT` — bloquea cualquier registro una vez que existe un propietario; las invitaciones del dashboard Supabase (`invited_at`) se siguen permitiendo
- ✅ Migración `20260703000008_disable_public_signup.sql` creada y aplicada al proyecto Supabase

## Qué falta por terminar

- Ninguno — el stack está completo. Los próximos pasos son operativos (dar de alta al equipo, publicar).

## Próximos pasos

1. Completar el formulario de registro en `http://localhost:4200/registro-inicial` (acción del usuario)
2. Dar de alta al equipo: en el panel de Supabase (Authentication → Users → **Invite user**) y luego asignar rol/turno desde el panel admin
3. Publicar el repositorio (ya tiene licencia MIT y CI)

## Bloqueadores

- Ninguno.
