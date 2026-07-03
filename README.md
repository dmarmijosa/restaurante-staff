# Restaurante Staff 🍽️

**Plataforma open source para restaurantes**: menú QR para clientes, comandas en tiempo real para cocina, tablet para meseros y panel de administración completo. Réplica funcional del diseño "Restaurante Staff" construida con Angular 22 + Supabase.

## Estado de la aplicación

**v0.4 · MVP funcional** — actualizado el 2026-07-02

| Módulo | Estado |
|---|---|
| Cliente (home pública, menú QR, carrito, seguimiento de pedido, llamar mesero) | ✅ Completo |
| Login del personal (email + contraseña, desde el footer de la home) | ✅ Completo |
| Admin · Plano del salón (drag & drop, sillas, fusión/separación de mesas) | ✅ Completo |
| Admin · Pedidos (kanban 4 estados), Menú, Categorías, Meseros y turnos, Temporada, Ajustes | ✅ Completo |
| Roles (admin/mesero/cocina) asignables por el admin + guards por área | ✅ Completo |
| Eliminación permanente de datos del personal (protección de datos) | ✅ Completo |
| Mesero (tablet: llamadas de mesa, mesas del salón, pedidos activos) | ✅ Completo |
| Cocina (pantalla de comandas: preparar → listo) | ✅ Completo |
| Esquema Supabase (migraciones + RLS + seed) | ✅ Aplicado al proyecto y verificado |
| QR real por mesa (generación local + impresión) | ✅ Completo |
| Accesibilidad y microinteracciones (focus-visible, reduced-motion, validación inline) | ✅ Completo |
| Licencia MIT + CI (GitHub Actions) | ✅ Completo |
| Registro inicial del administrador (una sola vez, con redirección automática) | ✅ Completo |
| Imágenes de productos y logo (Supabase Storage, con compresión) | ✅ Completo |
| Onboarding del panel con driver.js (guía interactiva) | ✅ Completo |
| Rol Cajero + cobro por método de pago configurable | ✅ Completo |
| Resumen/métricas del admin (ingresos, ticket medio, ventas por método, top productos) | ✅ Completo |
| Tiempo de cocina (temporizador en vivo + tiempo medio de preparación) | ✅ Completo |
| Filtros por fecha en el Resumen (Hoy / 7 días / 30 días / Todo) | ✅ Completo |
| Manual de instalación para persona natural ([manual.md](manual.md)) | ✅ Completo |

Pruebas: **19 unitarias** (Vitest) y **25 E2E** (Playwright, escritorio + móvil) en verde. Build de producción sin errores. CI en cada push/PR.

> Diseño mejorado con la skill **ui-ux-pro-max** aplicando sus principios (foco visible, `prefers-reduced-motion`, transiciones 150–300 ms, touch targets ≥44px, `min-h-dvh`, validación inline) **sin alterar la identidad visual** (paleta terracota/crema, Instrument Sans + Source Serif 4).

## Arranque rápido (modo demo, sin configurar nada)

```bash
npm install
npm start          # http://localhost:4200
```

Sin credenciales de Supabase la app usa **datos de ejemplo en memoria** (los del diseño). Cuentas demo:

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@demo.dev` | `admin123` |
| Mesero | `mesero@demo.dev` | `mesero123` |
| Cocina | `cocina@demo.dev` | `cocina123` |
| Cajero | `cajero@demo.dev` | `cajero123` |

> En modo demo el estado vive en memoria: al recargar, vuelve al ejemplo.

## Conectar con Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (o usa el tuyo).
2. Aplica `supabase/migrations/*.sql` y `supabase/seed.sql` (SQL Editor o `supabase db push`).
3. Copia las variables de entorno — **nunca se versionan claves**:

```bash
cp .env.example .env
# Edita .env:
# SUPABASE_URL=https://<tu-proyecto>.supabase.co
# SUPABASE_ANON_KEY=<tu clave publishable/anon>
```

4. `npm start`. El script `scripts/set-env.mjs` genera `src/environments/env.generated.ts` (gitignorado) antes de compilar.
5. **Registro inicial del administrador**: abre la app e ve a **`/registro-inicial`** (o pulsa el aviso que aparece en `/login` cuando aún no hay cuentas). El **primer** usuario registrado se convierte automáticamente en **administrador propietario**; a partir de ahí esa ruta se cierra sola y el resto del equipo se da de alta desde el panel.
   - Recomendado: en Supabase → Authentication → Providers, **desactiva el registro público** tras crear al propietario, para que solo el admin dé de alta cuentas.
6. El QR físico de cada mesa apunta a `https://tu-dominio/mesa/<numero>` (el panel del plano genera e imprime cada QR).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Dev server (genera env primero) |
| `npm run build` | Build de producción |
| `npm test` | Unitarias (Vitest) |
| `npm run e2e` | Playwright (levanta el server solo) |
| `npm run set-env` | Regenera `env.generated.ts` |

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
