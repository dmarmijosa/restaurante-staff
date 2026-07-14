# Backlog

## Mejoras futuras

- [x] ~~Supabase Storage para fotos de productos y logo~~ — hecho (bucket `imagenes`, subida en menú y ajustes)
- [x] ~~Generador/impresión de códigos QR por mesa~~ — hecho (`app-table-qr`, generación local + impresión)
- [x] ~~Registro inicial del administrador~~ — hecho (`/registro-inicial`, una sola vez, con redirección automática)
- [x] ~~Onboarding del panel con driver.js~~ — hecho (tour guiado + botón "Ver guía")
- [x] ~~Rol Cajero + métodos de pago~~ — hecho (vista `/cajero`, cobro, admin de métodos)
- [x] ~~Manual de instalación no técnico~~ — hecho ([manual.md](../manual.md))
- [x] ~~Compresión/redimensionado de imágenes antes de subir~~ — hecho (`shared/image-utils.ts`, canvas)
- [x] ~~Fechas de temporada editables con date picker~~ — hecho (persistidas en `restaurant_settings`)
- [x] ~~Recorte manual (crop) de la imagen antes de subir~~ — hecho (modal de recorte con zoom/desplazamiento para productos y logo)
- [x] ~~Asignación de mesas a meseros desde el plano~~ — hecho (selector en el panel + resaltado en vista mesero)
- [x] ~~Notificación sonora en cocina~~ — hecho (Web Audio + toggle de silencio)
- [x] ~~Historial de caja y pedidos~~ — hecho (`/admin/historial`: pestañas Pedidos y Caja)
- [x] ~~Reinicio diario de datos (demo Supabase)~~ — hecho (`reset_demo_data()` + pg_cron)
- [x] ~~Registro inicial del administrador propietario~~ — hecho (servidor en modo Supabase, usuario completa `/registro-inicial`)
- [x] ~~Desactivar registro público tras el bootstrap~~ — hecho (trigger `on_auth_signup_check` en `auth.users`, invitaciones del dashboard permitidas)
- [x] ~~Multi-restaurante (multi-tenant): un despliegue, varios locales~~ — hecho (tabla `restaurants`, `restaurant_id` en todas las tablas, RLS scoped, RPCs `create_restaurant`/`restaurant_by_slug`, rutas `/r/:slug`, bootstrap con nombre de restaurante, paso en el tour de driver.js)
- [x] ~~Mock API única para el modo demo (todos los roles)~~ — hecho (`mock-api.service.ts`, backend en memoria con latencia; repos demo como adaptadores)
- [x] ~~Login demo con accesos rápidos (sin credenciales en texto)~~ — hecho (botones por rol, incluido cajero)
- [x] ~~Salir del modo demo con credenciales Supabase en runtime~~ — hecho (`runtime-config.ts` + diálogo; localStorage + recarga)
- [x] ~~Wizard `/instalacion`: conexión bloqueada tras «Probar modo demo»~~ — hecho (v0.13.1: `saveSupabaseConfig` limpia `rs-force-demo`; mensaje de error y repoblado del formulario)
- [x] ~~Módulo Horario de trabajo~~ — hecho (`/admin/horarios`, tabla `work_schedules`, visible al trabajador en la topbar)
- [x] ~~Panel 100% responsivo (drawer móvil)~~ — hecho (sidebar deslizante, sin scroll horizontal, grids adaptativos)
- [x] ~~i18n~~ — hecho (6 idiomas: es/en/ca/pt/fr/it; 334 claves; `@ngx-translate/core` + HttpLoader; detector automático del idioma del navegador; selector en el topbar; dashboard e historial incluidos)
- [x] ~~Arreglar E2E tras i18n/mock~~ — hecho (`locale: es-ES` en Playwright + esperas por la latencia de la mock API; 29 E2E en verde)

### Publicado el 2026-07-08 (v0.10 — hardening multi-tenant + E2E real)

- [x] ~~Rediseño responsivo en los 5 roles~~ — hecho (cliente, admin, mesero, cajero, cocina: gradientes, marcos tablet, tipografía y jerarquía; iconos SVG en el sidebar del admin)
- [x] ~~Prueba funcional E2E contra Supabase real~~ — hecho (`scripts/functional-test.mjs`, Playwright headless; 28 capturas por corrida; cubre el ciclo de vida completo del pedido con verificación en DB de cada transición)
- [x] ~~`RestaurantRepository.getFirstAvailable()`~~ — hecho (Supabase + Demo; el cliente sin slug resuelve el tenant automáticamente)
- [x] ~~i18n `kitchen.min_label`~~ — hecho (añadida en los 6 idiomas; la card de la cocina mostraba el literal)
- [x] ~~Fixes RLS multi-tenant descubiertos en la prueba E2E~~ — hecho (migraciones 12, 13, 14, 16, 17: policies legacy, `restaurant_settings` singleton, grants, `waiter_calls` INSERT + SELECT para anon)
- [x] ~~`UNIQUE` per-tenant en `categories`, `tables` y `payment_methods`~~ — hecho (migraciones 15 y 18; dos tenants ya pueden compartir "Efectivo", "Principales", número de mesa, etc.)
- [x] ~~Sembrar catálogo mínimo al crear un tenant~~ — hecho (migración 19: `create_restaurant()` inserta 4 categorías, 6 productos y 4 mesas al vuelo)
- [x] ~~Sembrar `payment_methods` por defecto en un tenant nuevo~~ — hecho (migración 19: Efectivo, Tarjeta, Transferencia activos desde el minuto 0)

### Publicado el 2026-07-08 (v0.9)

- [x] ~~PWA/offline para la tablet del mesero~~ — hecho (`@angular/service-worker`, `ngsw-config.json`, `manifest.webmanifest`, `OfflineService` + `WaiterCacheService`; banner offline/reconexión en la tablet; caché localStorage de turno activo)
- [x] ~~Notificación sonora en cocina al entrar comanda nueva~~ — hecho (detección por ID, beep encolado si AudioContext suspendido, indicador visual pulsante)
- [x] ~~Página de instalación guiada (wizard) para restaurantes sin equipo técnico~~ — hecho (`/instalacion`, 6 pasos: bienvenida → Supabase → claves → esquema SQL → crear admin → listo; detección automática de progreso, descarga de `schema.sql`, banner "Configurar mi restaurante" en la home demo, enlace desde el diálogo de conexión del admin)
- [x] ~~Moneda configurable por el admin~~ — hecho (12 símbolos: $, €, £, ¥, R$, S/, ₹, ₩, CHF, CLP$, COP$, ARS$; `CurrencyService` + `MoneyPipe` reactivo con `pure: false`; migración SQL 11 con columna `currency` en `restaurant_settings`; selector visual en Ajustes; toast i18n)
- [x] ~~Refactor de chip buttons~~ — hecho (`ChipBtnDirective` en `shared/chip-btn.directive.ts`, 7 componentes)
- [x] ~~Refactor de tarjetas de comanda~~ — hecho (`OrderCardComponent` compartido admin + mesero)
- [x] ~~Modo demo por defecto, credenciales del sandbox privado no son back-end público~~ — hecho (`.env.example` con placeholders, README con sección "Conectar tu propio Supabase")

## Pendiente / en curso

- [ ] Rediseño visual más profundo estilo 21st.dev (la base responsiva ya está; falta pulido de profundidad/jerarquía).
- [ ] Ejecutar la prueba E2E funcional en CI (job de Playwright contra Supabase de test — el script `scripts/functional-test.mjs` ya está listo).

## Bugs conocidos

- [ ] En modo demo el estado vive en memoria: recargar la página lo restablece (esperado, pero puede confundir; documentado en README)
- [ ] El primer clic de "Iniciar sesión" tras autocompletar programáticamente puede requerir un segundo clic (visto solo con herramientas de automatización, no reproducible con teclado/ratón reales)

## Refactors pendientes

- [x] ~~Extraer un componente `chip-button` compartido~~ — hecho (`ChipBtnDirective`, 7 componentes)
- [x] ~~`orderView`-style helper para las tarjetas de comanda~~ — hecho (`OrderCardComponent`, admin + mesero)
- [x] ~~Mover `waiterName: 'Carlos M.'` hardcodeado a asignación real por mesa~~ — hecho (`mock-api.service.ts`)
- [ ] Revisar advisors de Supabase (seguridad/rendimiento) al aplicar migraciones

## Ideas para nuevas funcionalidades

- [ ] Propinas y división de cuenta desde el QR
- [ ] Rango personalizado de fechas en el Resumen (date picker de inicio/fin)
- [ ] Reservas online con la mesa reservada reflejada en el plano
- [ ] Modo "pizarra" para cocina en pantallas grandes (fuente aún mayor)
- [ ] Integración con impresoras térmicas de comandas
- [x] ~~Panel de métricas para el admin (ticket medio, platos más vendidos)~~ — hecho (sección "Resumen")
- [x] ~~Tiempos de cocina~~ — hecho (temporizador en vivo en Cocina + KPI de tiempo medio)
- [x] ~~Filtros por fecha en el Resumen~~ — hecho (Hoy/7 días/30 días/Todo)
