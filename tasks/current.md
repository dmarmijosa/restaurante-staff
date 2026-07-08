# Trabajo actual

_Última actualización: 2026-07-08 (iteración 17)_

## Estado actual

Plataforma **v0.12** publicada en `main`.

- **26 migraciones SQL** — v0.11 añadió staff passwords (21) y kiosk cocina (22); v0.12 añade PIN de cocina (23), fix `auth.identities` (24), URLs canónicas (25) y resolución/validación de PIN (26).
- **43 pruebas unitarias** (Vitest) en verde.
- **1 prueba funcional E2E** (`scripts/functional-test.mjs`, Playwright) que cubre el **ciclo de vida completo del pedido** contra Supabase real: 28 capturas, 28 asserts, 0 fallos.
- **Build limpio** (`ng build`).
- **Modo demo por defecto** (`.env` vacío → mock en memoria). El usuario decide cuándo conectar su propio Supabase (wizard visual o `.env` clásico).

### Últimos commits en `main`

| Commit | Descripción |
|--------|-------------|
| `5a63f15` | feat(kitchen): acceso por PIN de 6 dígitos con cuenta interna por restaurante |
| `658304e` | feat(ops): cocina kiosk, contraseñas de staff y fixes QR/móvil |
| `bf24e17` | fix(rls): policy anon SELECT en `waiter_calls` — root cause del `42501` al llamar al mesero |
| `ef7dc30` | test: flujo cruzado entre roles — cliente/admin/cocina/mesero/cajero ven el mismo pedido |
| `f51fa9f` | fix(multi-tenant): `UNIQUE(restaurant_id, name)` en categorías + reapply anon RLS + i18n `kitchen.min_label` |
| `38f2ccc` | test: script funcional E2E contra Supabase real |
| `297b4eb` | fix(multi-tenant): RLS legacy + singleton settings + grants + `getFirstAvailable` |
| `006b057` | Merge feat/redesign-responsive → main: rediseño responsivo de todos los roles |

## Hecho en la iteración 16 (rediseño responsivo + prueba E2E real + fixes multi-tenant + seed de tenant)

- ✅ **Rediseño responsivo** en los 5 roles (cliente, admin, mesero, cajero, cocina) — fondos con gradiente, marco tipo tablet, tipografía y jerarquía visual afinadas, chips con `ChipBtnDirective`, iconos SVG en el sidebar del admin.
- ✅ **Prueba E2E contra Supabase real** (`scripts/functional-test.mjs`): 28 capturas por corrida, valida el **ciclo de vida completo del pedido** con acciones reales de cada rol y verificación en la DB de cada transición (`recibido → preparando → listo → entregado → cobrado`).
- ✅ **8 migraciones nuevas** (12–19) que arreglan bugs descubiertos por la prueba:
  - **12**: RLS legacy + `restaurant_settings.id` singleton → `bigserial` + policies multi-tenant limpias.
  - **13**: reapply de `handle_new_user` y `check_signup_allowed` (multi-tenant).
  - **14**: `grant execute` a `my_restaurant_id()` para `authenticated`.
  - **15**: `UNIQUE(restaurant_id, name)` en `categories` y `UNIQUE(restaurant_id, number)` en `tables`.
  - **16**: reapply de `anon crea llamadas` y `anon crea pedidos qr` con nombres calificados.
  - **17**: `anon lee llamadas` — root cause del `42501` fantasma al llamar al mesero (INSERT + `Prefer: return=representation` requería SELECT).
  - **18**: `UNIQUE(restaurant_id, name)` en `payment_methods`.
  - **19**: `create_restaurant()` con **seed automático** — al crear un tenant se insertan 4 categorías, 6 productos, 4 mesas y 3 métodos de pago.
- ✅ **i18n**: clave `kitchen.min_label` añadida en los 6 idiomas (la card de la cocina mostraba el literal).
- ✅ **Repositorio**: nuevo método `RestaurantRepository.getFirstAvailable()` (Supabase + Demo) — resuelve el tenant cuando el cliente entra por `/` sin slug.

## Hecho en la iteración 15 (endurecer modo demo + puente al wizard)

- ✅ **`.env` vaciado** localmente y `env.generated.ts` regenerado → la app arranca por defecto en modo demo.
- ✅ **`.env.example`** rehecho con placeholders (`YOUR_PROJECT_REF.supabase.co`, `YOUR_PUBLISHABLE_ANON_KEY`) y comentarios que apuntan al wizard `/instalacion` como alternativa sin tocar archivos.
- ✅ **Diálogo "Salir del modo demo"** en el sidebar del admin: nuevo banner destacado enlaza al wizard `/instalacion` para quien necesite la guía completa.
- ✅ **README** con nueva sección **"Conectar tu propio Supabase"** — aviso explícito: las credenciales del sandbox privado histórico (`vtkdvxrocemdyybynegs`) no son back-end público; cada quien debe usar su proyecto. Dos opciones documentadas: wizard visual (recomendado) y `.env` clásico.

## Hecho en la iteración 14 (moneda configurable + refactors)

- ✅ **Moneda configurable por el admin** (`features/admin/settings/settings.component.ts`): selector visual con 12 símbolos ($, €, £, ¥, R$, S/, ₹, ₩, CHF, CLP$, COP$, ARS$). Chips con estilo `outlined` activo/inactivo en terracota; vista previa "los importes se verán como €12.50".
- ✅ **`CurrencyService`** (`shared/currency.service.ts`): signal `symbol` (default `'$'`), inyectable en `MoneyPipe` sin crear dependencias circulares con el store.
- ✅ **`MoneyPipe` reactivo** (`shared/money.pipe.ts`): `pure: false`, lee `CurrencyService.symbol()` — todos los precios del panel, caja, historial y menú del cliente se actualizan en tiempo real al cambiar la moneda.
- ✅ **`RestaurantStore.setCurrency()`**: actualiza `settings().currency` + `CurrencyService.symbol` + llama a `settingsRepo.updateSettings()` para persistir. Toast de confirmación con clave i18n `toast.currency_updated`.
- ✅ **Migración SQL** (`20260708000011_add_currency.sql`): columna `currency TEXT NOT NULL DEFAULT '$'` en `public.restaurant_settings`; `public/setup/schema.sql` regenerado.
- ✅ **Repos Supabase y Demo**: `getSettings()` / `updateSettings()` mapean la nueva columna; `DEMO_SETTINGS` incluye `currency: '$'`.
- ✅ **i18n**: clave `toast.currency_updated` en 6 idiomas.
- ✅ **Tests actualizados**: `money.pipe.spec.ts` usa `TestBed.runInInjectionContext` + `CurrencyService`. **43 unitarias en verde**.

### Refactors incluidos

- ✅ **`ChipBtnDirective`** (`shared/chip-btn.directive.ts`): directiva `button[chipBtn]` con inputs `active` y `variant` (`tinta | terracota | outlined | cacao`). Aplicada en 7 componentes: dashboard, history, menu-products, season, schedule, staff-page, client-home. Elimina decenas de líneas de clases Tailwind duplicadas.
- ✅ **`OrderCardComponent`** (`shared/order-card/order-card.component.ts`): componente reutilizable con inputs `order`, `showStatus`, `showMeta`, `actionLabel`, `actionFull`, `disabled` y output `advance`. Usado en `orders-board` (admin) y `waiter` (mesero).
- ✅ **`waiterName` real en demo**: `mock-api.service.ts` resuelve el nombre del mesero desde la asignación de mesa en lugar del hardcoded `'Carlos M.'`.

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
- ✅ **`public/setup/schema.sql`** generado (concat de los archivos de migración + seed.sql).

## Hecho en la iteración 12b (notificación sonora automática en cocina)

- ✅ **`BeepService` mejorado** (`shared/beep.service.ts`): se extrae `_play()` como método privado; `beep()` ya no descarta el tono silenciosamente si el AudioContext está suspendido (política de autoplay): marca `pendingBeep = true` e intenta `ctx.resume()` en background. `prime()` (llamado en cada `pointerdown` de la pantalla de cocina) reanuda el contexto y dispara el tono pendiente de inmediato. Nueva señal pública `pendingBeep` para que la UI pueda reaccionar.
- ✅ **`KitchenComponent` mejorado** (`features/kitchen/kitchen.component.ts`): el `effect` de detección pasa de comparar `.length` a rastrear un `Set<number>` de IDs conocidas. La primera evaluación marca los pedidos existentes como conocidos (sin sonar); las siguientes solo beepean cuando aparece un ID nuevo — robusto ante añadir+quitar en el mismo ciclo reactivo.
- ✅ **Indicador visual pulsante**: punto terracota con `animate-ping` en la cabecera de cocina cuando `beep.pendingBeep() && !beep.muted()`. Accesible con `role="status"` + `aria-label` (`kitchen.tap_for_sound`).
- ✅ **i18n**: clave `kitchen.tap_for_sound` añadida en los 6 idiomas.

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
- ✅ **Claves i18n** `pwa.*` añadidas en 6 idiomas.
- ✅ **8 pruebas unitarias** (jsdom) para `OfflineService` y `WaiterCacheService` en verde.

## Hecho en la iteración 11 (mock API, login demo, salir de demo, horarios, responsive, i18n)

- ✅ **Mock API única** (`core/data/demo/mock-api.service.ts`): un solo backend en memoria con latencia simulada que sirve a todos los roles (incluido cliente). Los repositorios demo pasan a ser adaptadores finos sobre ella.
- ✅ **Login demo con accesos rápidos**: botones "Entrar como Administrador/Mesero/Cocina/Cajero" que autentican y redirigen al área del rol.
- ✅ **Salir del modo demo en runtime** (`runtime-config.ts` + diálogo `connect-supabase`): el admin pega la URL y la clave publishable de su proyecto; se guardan en localStorage y, al recargar, la app trabaja contra su base sin recompilar.
- ✅ **Módulo Horario de trabajo** (`/admin/horarios`): editor semanal por empleado (día/franja/libre), tabla `work_schedules` (migración 10 con RLS multi-tenant), y el horario de hoy se muestra al trabajador en la barra superior.
- ✅ **Panel responsivo**: sidebar convertido en cajón deslizante con hamburguesa en móvil; topbar sin scroll horizontal; grids adaptativos. Verificado a 375 px sin overflow.
- ✅ **i18n ampliada**: dashboard e historial totalmente traducidos; 6 idiomas con paridad exacta de claves.
- ✅ El tour de driver.js cubre cada sección del panel, incluida Horarios.
- ✅ **E2E arreglados**: `locale: es-ES` determinista en Playwright y esperas al primer elemento antes de contar (por la latencia de la mock API). Toast de disponibilidad con matcher tolerante a comillas.

## Pendiente inmediato

- Ninguno — `main` está actualizado y publicado con la iteración 16. Ver [backlog.md](backlog.md) para próximas funcionalidades opcionales.

## Próximos pasos

1. Opcional: rediseño visual más profundo estilo 21st.dev (la base responsiva ya está).
2. Automatizar la prueba E2E en CI (Playwright ya está instalado; falta añadir el job).
3. Backlog abierto — ver [backlog.md](backlog.md).

## Bloqueadores

- Ninguno.

---

## Historial de estados anteriores

<details>
<summary>Iteraciones 2–10 (histórico completo)</summary>

### Iteración 2 · Conectar Supabase (2026-07-02)
- MCP de Supabase autorizado; proyecto de desarrollo accesible.
- Migraciones aplicadas: esquema (8 tablas), RLS en todas, seed (4 categorías, 11 productos, 8 mesas, ajustes).
- Advisors de seguridad revisados: revocado EXECUTE de las funciones SECURITY DEFINER e INSERT anónimos endurecidos.
- Corregido 401 del cliente anónimo: `getOrders` ya no incrusta `profiles`; `refreshAll` usa `allSettled`.

### Iteración 3 · Pulido de diseño (2026-07-02)
- Pulido de accesibilidad/UX global con **ui-ux-pro-max** (identidad intacta): `:focus-visible` terracota, `prefers-reduced-motion`, transiciones 150–300 ms, `min-h-dvh`.
- Login mejorado con validación inline, indicadores requeridos, toggle mostrar/ocultar contraseña, `aria-invalid`/`aria-describedby`.
- **QR real por mesa** con generación local (`qrcode`) y botón de impresión.
- **LICENSE MIT** y **CI** (`.github/workflows/ci.yml`).
- E2E herméticas: `RS_FORCE_DEMO=1` fuerza modo demo en Playwright.

### Iteración 4 · Registro inicial + Storage
- Registro inicial del admin (`/registro-inicial` + `bootstrapGuard`); trigger `handle_new_user` hace admin+propietario al primer perfil; `admin_exists()` gobierna la visibilidad.
- Supabase Storage (bucket `imagenes`, público-lectura / admin-escritura): subida de fotos de producto y logo.
- Contrato `StorageRepository` con implementación demo (data URL local).

### Iteración 5 · Registro automático + onboarding + rol cajero
- Login redirige automáticamente a `/registro-inicial` cuando no hay admin.
- Onboarding con driver.js en el panel admin (tour guiado + botón "Ver guía del panel").
- **Rol Cajero**: DB, vista `/cajero` (cobro por método), sección admin "Métodos de pago", alta de cajeros en Personal.
- `manual.md`: guía de instalación no técnica.

### Iteración 6 · Recorte manual de imágenes
- Modal reutilizable con preview, zoom y desplazamiento.
- Utilidad `cropImageSquare` en `shared/image-utils.ts`.
- Cobertura de pruebas: unitaria + E2E Playwright.

### Iteración 7–8 · Multi-restaurante
- Tabla `restaurants` como raíz de cada tenant; `restaurant_id` FK en todas las tablas.
- RLS actualizado: autenticados ven solo su restaurante (`my_restaurant_id()`).
- RPCs públicos: `create_restaurant`, `restaurant_by_slug`, `admin_exists(restaurant_id?)`.
- Angular: entidad `Restaurant`, `RestaurantRepository`, `RestaurantContextService`, rutas `/r/:slug` y `/r/:slug/mesa/:numero`.

### Iteración 9 · Tour onboarding (paso multi-restaurante)
- Nuevo paso en el tour de driver.js: al final aparece "¿Tienes más locales?" que explica `/nuevo-restaurante`.
- E2E actualizado.

### Iteración 10 · i18n
- `@ngx-translate/core` + `@ngx-translate/http-loader` integrados.
- 6 archivos de traducción en `public/assets/i18n/` (es, en, ca, pt, fr, it) con 334 claves organizadas por namespace.
- Detector automático de idioma vía `navigator.languages`; fallback a español; persistencia en `localStorage`.
- 18 componentes actualizados con `TranslatePipe`/`TranslateService`.

</details>
