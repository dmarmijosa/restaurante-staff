# Trabajo actual

_Última actualización: 2026-07-08 (iteración 13)_

## Estado actual

Plataforma **v0.8**: 10 migraciones SQL aplicadas. **Build limpio**, **33 unitarias** y **29 E2E en verde**.
Los E2E ahora fijan `locale: es-ES` en Playwright (la app detecta idioma del navegador) y esperan a que
la mock API con latencia cargue los datos antes de contar.

## Hecho en la iteración 11 (mock API, login demo, salir de demo, horarios, responsive, i18n)

- ✅ **Mock API única** (`core/data/demo/mock-api.service.ts`): un solo backend en memoria con
  latencia simulada que sirve a todos los roles (incluido cliente). Los repositorios demo pasan a
  ser adaptadores finos sobre ella.
- ✅ **Login demo con accesos rápidos**: se elimina el `div` con credenciales en texto; ahora hay
  botones "Entrar como Administrador/Mesero/Cocina/Cajero" que autentican y redirigen al área del rol.
- ✅ **Salir del modo demo en runtime** (`runtime-config.ts` + diálogo `connect-supabase`): el admin
  pega la URL y la clave publishable de su proyecto; se guardan en localStorage y, al recargar, la app
  trabaja contra su base (vacía, desde cero) sin recompilar. Botón visible solo en modo demo.
- ✅ **Módulo Horario de trabajo** (`/admin/horarios`): editor semanal por empleado (día/franja/libre),
  tabla `work_schedules` (migración 10 con RLS multi-tenant), y el horario de hoy se muestra al
  trabajador en la barra superior.
- ✅ **Panel responsivo**: sidebar convertido en cajón deslizante con hamburguesa en móvil; topbar sin
  scroll horizontal; grids adaptativos. Verificado a 375 px sin overflow.
- ✅ **i18n ampliada**: dashboard e historial totalmente traducidos; nuevas claves (horarios, días de la
  semana, connect, login demo, rangos). Los 6 idiomas mantienen **paridad exacta de claves**.
- ✅ El tour de driver.js ya cubre cada sección del panel, incluida Horarios.

- ✅ **E2E arreglados**: `locale: es-ES` determinista en Playwright y esperas al primer elemento antes
  de contar (por la latencia de la mock API). Toast de disponibilidad con matcher tolerante a comillas.

## Hecho en la iteración 13 (Wizard de instalación guiada)

- ✅ **Ruta `/instalacion`** — wizard de 6 pasos completamente funcional, sin login, accesible desde la home en modo demo.
- ✅ **Paso 1 — Bienvenida**: descripción de la plataforma, requisitos ("qué necesitas": solo correo, internet y 15 min) y vista previa de funcionalidades.
- ✅ **Paso 2 — Crear proyecto Supabase**: instrucciones paso a paso (crear cuenta, nuevo proyecto, elegir región), enlace a supabase.com.
- ✅ **Paso 3 — Conectar claves**: instrucciones de dónde copiar URL y anon key + formulario inline que guarda en localStorage (mismo mecanismo que "salir del modo demo"). Validación con mensaje claro.
- ✅ **Paso 4 — Aplicar el esquema SQL**: botón de descarga del `schema.sql` combinado (10 migraciones + seed), enlace directo al SQL Editor del proyecto Supabase del usuario, instrucciones para pegar y ejecutar.
- ✅ **Paso 5 — Crear cuenta de administrador**: explicación de qué ocurrirá, enlace a `/nuevo-restaurante`. Si ya existe admin → avanza directamente.
- ✅ **Paso 6 — ¡Todo listo!**: checklist de primeros pasos con enlaces directos a cada sección del panel (ajustes, categorías, menú, plano, personal).
- ✅ **Progreso persistido** en localStorage (`rs_setup_step`) — el usuario puede cerrar el navegador y continuar.
- ✅ **Detección automática**: si Supabase ya está configurado → salta a paso 3; si el admin ya existe → salta a paso 6.
- ✅ **Banner "Configurar mi restaurante"** en la home del cliente (solo en modo demo) — entrada directa al wizard.
- ✅ **`public/setup/schema.sql`** generado (concat de los 10 archivos de migración + seed.sql, 895 líneas).
- ✅ TypeScript sin errores, lints limpios.

## Hecho en la iteración 12 (PWA / offline para la tablet del mesero)

- ✅ **`@angular/service-worker`** instalado y configurado.
- ✅ **`ngsw-config.json`**: app-shell precacheable (HTML, JS, CSS) + runtime-cache para i18n JSON.
- ✅ **`public/manifest.webmanifest`**: nombre, colores de marca (terracota/cacao), `start_url: /mesero`, orientación landscape, acceso directo a "Mis mesas". Instalable en Android/iOS/Chrome/Safari.
- ✅ **Iconos SVG** (`/icons/icon-192.svg` y `/icons/icon-512.svg`) con diseño de plato y cubiertos en paleta terracota/cacao.
- ✅ **`index.html`** actualizado: `<link rel="manifest">`, `theme-color`, `apple-mobile-web-app-*`.
- ✅ **`angular.json`**: `serviceWorker: ngsw-config.json` en la configuración de producción.
- ✅ **`OfflineService`** (`core/pwa/offline.service.ts`): signal `isOnline` que reacciona en tiempo real a `window:online/offline`.
- ✅ **`WaiterCacheService`** (`core/pwa/waiter-cache.service.ts`): persiste el último snapshot de mesas/pedidos/llamadas en localStorage con TTL de 4 horas.
- ✅ **`OfflineBannerComponent`** (`shared/offline-banner/`): banner amarillo al perder red (con indicador de "datos en caché") y banner verde 3 segundos al reconectarse. `aria-live="polite"` para accesibilidad.
- ✅ **`WaiterComponent`** actualizado: carga caché al abrir sin red, deshabilita botones de acción offline, guarda snapshot automáticamente al recibir datos nuevos, refresca el store al reconectarse.
- ✅ **`app.config.ts`**: `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode() })`.
- ✅ **Claves i18n** `pwa.*` añadidas en 6 idiomas (es/en/ca/pt/fr/it).
- ✅ **8 pruebas unitarias** (jsdom) para `OfflineService` y `WaiterCacheService` en verde.
- ✅ TypeScript compila sin errores (`tsc --noEmit`).

## Hecho en la iteración 13 (notificación sonora automática en cocina)

- ✅ **`BeepService` mejorado** (`shared/beep.service.ts`): se extrae `_play()` como método privado;
  `beep()` ya no descarta el tono silenciosamente si el AudioContext está suspendido (política de
  autoplay): marca `pendingBeep = true` e intenta `ctx.resume()` en background. `prime()` (llamado en
  cada `pointerdown` de la pantalla de cocina) reanuda el contexto y dispara el tono pendiente de
  inmediato. Nueva señal pública `pendingBeep` para que la UI pueda reaccionar.
- ✅ **`KitchenComponent` mejorado** (`features/kitchen/kitchen.component.ts`): el `effect` de
  detección pasa de comparar `.length` a rastrear un `Set<number>` de IDs conocidas. La primera
  evaluación marca los pedidos existentes como conocidos (sin sonar); las siguientes solo beepean
  cuando aparece un ID nuevo — robusto ante añadir+quitar en el mismo ciclo reactivo.
- ✅ **Indicador visual pulsante**: punto terracota con `animate-ping` en la cabecera de cocina
  cuando `beep.pendingBeep() && !beep.muted()`. Accesible con `role="status"` + `aria-label`
  (`kitchen.tap_for_sound`).
- ✅ **i18n**: clave `kitchen.tap_for_sound` añadida en los 6 idiomas (es/en/ca/pt/fr/it).
- ✅ **33 unitarias en verde**; sin errores de lint.

## Pendiente inmediato

- Commit + push (con confirmación del usuario).
- Opcional: rediseño visual más profundo estilo 21st.dev (la base responsiva ya está).

## Estado anterior

Plataforma v0.6 — multi-restaurante: 9 migraciones SQL aplicadas, 33 unit y 29 E2E en verde.

## Hecho tras conectar Supabase (2026-07-02, iteración 2)

- ✅ MCP de Supabase autorizado; proyecto `vtkdvxrocemdyybynegs` ("Restaurante Staff") accesible
- ✅ Migraciones aplicadas: esquema (8 tablas), RLS en todas, seed (4 categorías, 11 productos, 8 mesas, ajustes)
- ✅ Advisors de seguridad revisados: revocado EXECUTE de las funciones SECURITY DEFINER e INSERT anónimos endurecidos (order_items/waiter_calls contra registros existentes). Solo queda el aviso de `rls_auto_enable`, función interna de Supabase.
- ✅ `.env` con la clave publishable (gitignorado); app compila y corre en modo Supabase
- ✅ Corregido 401 del cliente anónimo: `getOrders` ya no incrusta `profiles` (privacidad); `refreshAll` usa `allSettled`; nombre de mesero resuelto en el store
- ✅ Verificado en preview: la home carga los 11 productos reales desde la base

## Hecho tras el pulido de diseño (2026-07-02, iteración 3)

- ✅ Pulido de accesibilidad/UX global con **ui-ux-pro-max** (identidad intacta): `:focus-visible` terracota, `prefers-reduced-motion`, transiciones 150–300 ms, `touch-action: manipulation`, `min-h-dvh` en todas las vistas
- ✅ Login mejorado: validación inline tras _touched_, indicadores requeridos, toggle mostrar/ocultar contraseña, `aria-invalid`/`aria-describedby`, focus al primer campo inválido, `aria-live` en el error
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

## Hecho en la iteración 9 (tour onboarding: paso multi-restaurante)

- ✅ **Nuevo paso en el tour de driver.js**: al final de la guía interactiva del panel aparece el paso "¿Tienes más locales?" que explica la URL `/nuevo-restaurante` para crear nuevos tenants.
- ✅ E2E actualizado: prueba que navega por todos los pasos del tour y verifica que el último menciona `/nuevo-restaurante`.
- ✅ Suite en verde: **33 unitarias + 29 E2E**.

## Qué falta por terminar

- Ninguno — ver backlog para próximas funcionalidades opcionales.

## Próximos pasos

1. Completar el formulario de registro en `http://localhost:4200/nuevo-restaurante` (acción del usuario)
2. Dar de alta al equipo desde el panel de Supabase (Authentication → Users → **Invite user**)
3. Publicar el repositorio (ya tiene licencia MIT y CI)

- ✅ **Tabla `restaurants`** como raíz de cada tenant; `restaurant_id` FK en todas las tablas de negocio (profiles, settings, categories, products, tables, orders, waiter_calls, payment_methods). Datos existentes migrados al restaurante por defecto.
- ✅ **RLS actualizado**: autenticados ven solo su restaurante (`my_restaurant_id()`); anon (cliente QR) filtra por `restaurant_id` en la query.
- ✅ **RPCs públicos**: `create_restaurant(name, slug)` (crea tenant + settings iniciales), `restaurant_by_slug(slug)` (resuelve URL → UUID), `admin_exists(restaurant_id?)` (por tenant).
- ✅ **Triggers actualizados**: `handle_new_user` usa `restaurant_id` del metadata; `check_signup_allowed` exige restaurant_id válido o `invited_at`.
- ✅ **Angular — dominio**: entidad `Restaurant`, `RestaurantRepository`, `restaurantId` en `SessionUser`.
- ✅ **Angular — datos**: `RestaurantContextService` (signal compartido del tenant activo); todos los repos Supabase inyectan el contexto y filtran por `restaurant_id`; `DemoRestaurantRepository` con UUID fijo.
- ✅ **Angular — auth**: `AuthService.restaurantId` signal; `createRestaurant()` + `signUpFirstAdmin({..., restaurantId})`.
- ✅ **Angular — routing**: rutas `/r/:slug` y `/r/:slug/mesa/:numero` para clientes multi-tenant; `/nuevo-restaurante` siempre disponible; `/registro-inicial` como alias legacy con guard.
- ✅ **Angular — bootstrap**: formulario `RegisterAdminComponent` con campos de nombre de restaurante + slug (auto-generado) + admin; flujo: `createRestaurant` → `signUpFirstAdmin`.
- ✅ **Angular — cliente QR**: `ClientHomeComponent` lee el `:slug` del param de ruta, lo resuelve a `restaurant_id` vía `RestaurantRepository` y lo fija en el contexto antes de cargar datos.
- ✅ Migración SQL aplicada en Supabase; slug corregido a `casa-nogal`.
- ✅ **33 unitarias + 28 E2E** en verde.

## Qué falta por terminar

- Ninguno — el stack multi-tenant está completo. Los próximos pasos son operativos.

- ✅ **Registro del administrador propietario**: servidor arrancado apuntando a Supabase real; el admin entra en `http://localhost:4200/registro-inicial` y crea su cuenta
- ✅ **Registro público desactivado a nivel base de datos**: nueva función `check_signup_allowed()` + trigger `on_auth_signup_check` en `auth.users BEFORE INSERT` — bloquea cualquier registro una vez que existe un propietario; las invitaciones del dashboard Supabase (`invited_at`) se siguen permitiendo
- ✅ Migración `20260703000008_disable_public_signup.sql` creada y aplicada al proyecto Supabase

## Hecho en la iteración 10 (i18n)

- ✅ **`@ngx-translate/core` + `@ngx-translate/http-loader`** integrados en el proyecto
- ✅ **6 archivos de traducción** en `public/assets/i18n/` (es, en, ca, pt, fr, it) con **334 claves** organizadas en namespaces: `topbar`, `client`, `order`, `table_status`, `shift`, `login`, `register`, `kitchen`, `waiter`, `cashier`, `admin`, `toast`
- ✅ **Detector automático de idioma** vía `navigator.languages`; fallback a español; persistencia en `localStorage`
- ✅ **18 componentes actualizados** con `TranslatePipe` y/o `TranslateService`: cliente, login, registro, mesero, cajero, cocina, admin-layout, historial, categorías, órdenes, pagos, personal, ajustes, temporada, topbar, toast...
- ✅ **`data-testid`** añadidos a todos los elementos interactivos del cliente (add-to-cart, call-waiter-button, cart-bar-button, cart-heading, submit-order-button, order-sent-heading, login-heading, staff-login-link)
- ✅ **E2E del cliente corregidos** para no depender de texto visible sino de `data-testid`; 12/12 pasan (chromium + mobile)
- ✅ **Bug de configuración resuelto**: `provideTranslateHttpLoader()` debe ir **después** de `provideTranslateService()` en el array de providers; de lo contrario el `TranslateNoOpLoader` por defecto sobrescribe el HttpLoader
- ✅ **33 unitarias + 12 E2E cliente** en verde; build limpio

## Qué falta por terminar

- Ninguno — el stack está completo. Los próximos pasos son operativos (dar de alta al equipo, publicar).

## Próximos pasos

1. Completar el formulario de registro en `http://localhost:4200/registro-inicial` (acción del usuario)
2. Dar de alta al equipo: en el panel de Supabase (Authentication → Users → **Invite user**) y luego asignar rol/turno desde el panel admin
3. Publicar el repositorio (ya tiene licencia MIT y CI)

## Bloqueadores

- Ninguno.
