# Backlog

## Mejoras futuras

- [x] ~~Supabase Storage para fotos de productos y logo~~ — hecho (bucket `imagenes`, subida en menú y ajustes)
- [x] ~~Generador/impresión de códigos QR por mesa~~ — hecho (`app-table-qr`, generación local + impresión)
- [x] ~~Registro inicial del administrador~~ — hecho (`/registro-inicial`, una sola vez)
- [ ] Recorte/compresión de imágenes antes de subir (hoy se sube el archivo tal cual)
- [ ] Fechas de temporada editables con date picker (hoy son informativas, como el mockup)
- [ ] Asignación de mesas a meseros desde el plano (hoy viene del seed)
- [ ] Multi-restaurante (multi-tenant): un despliegue, varios locales
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
- Panel de métricas para el admin (ticket medio, platos más vendidos, tiempos de cocina)
- Reservas online con la mesa reservada reflejada en el plano
- Modo "pizarra" para cocina en pantallas grandes (fuente aún mayor)
- Integración con impresoras térmicas de comandas
