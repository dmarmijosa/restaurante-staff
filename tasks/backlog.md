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
- [ ] i18n (el dominio es en español; extraer textos para otros idiomas)
- [ ] PWA/offline para la tablet del mesero
- [ ] Notificación sonora en cocina al entrar comanda nueva
- [ ] Página de instalación guiada (wizard) para restaurantes sin equipo técnico

## Bugs conocidos

- [ ] En modo demo el estado vive en memoria: recargar la página lo restablece (esperado, pero puede confundir; documentado en README)
- [ ] El primer clic de "Iniciar sesión" tras autocompletar programáticamente puede requerir un segundo clic (visto solo con herramientas de automatización, no reproducible con teclado/ratón reales)

## Refactors pendientes

- [ ] Extraer un componente `chip-button` compartido (patrón repetido en 5 vistas)
- [ ] `orderView`-style helper para las tarjetas de comanda (admin/mesero repiten estructura)
- [ ] Mover `waiterName: 'Carlos M.'` hardcodeado del pedido demo a asignación real por mesa
- [ ] Revisar advisors de Supabase (seguridad/rendimiento) al aplicar migraciones

## Ideas para nuevas funcionalidades

- Propinas y división de cuenta desde el QR
- [x] ~~Panel de métricas para el admin (ticket medio, platos más vendidos)~~ — hecho (sección "Resumen")
- [x] ~~Tiempos de cocina~~ — hecho (temporizador en vivo en Cocina + KPI de tiempo medio)
- [x] ~~Filtros por fecha en el Resumen~~ — hecho (Hoy/7 días/30 días/Todo); pendiente: rango personalizado con date picker
- Reservas online con la mesa reservada reflejada en el plano
- Modo "pizarra" para cocina en pantallas grandes (fuente aún mayor)
- Integración con impresoras térmicas de comandas
