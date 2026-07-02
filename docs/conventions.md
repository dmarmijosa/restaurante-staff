# Convenciones de código

## Tecnologías y estado actual

- **Angular 22** standalone (sin NgModules), **signals** para estado, control flow nativo (`@if/@for/@switch`).
- **Tailwind v4** con design tokens del mockup en `src/styles.css` (`@theme`).
- **Supabase** para datos/auth/realtime; **modo demo** en memoria sin credenciales.
- **Vitest** (unit) y **Playwright** (E2E). Todo el código nuevo llega con pruebas.
- Estado de lo construido: ver [README](../README.md#estado-de-la-aplicación) y [tasks/current.md](../tasks/current.md).

## Nombres

- Archivos: `kebab-case` con sufijo de tipo — `restaurant.store.ts`, `role.guard.ts`, `floor-plan.component.ts`, `*.spec.ts`.
- Clases: `PascalCase` (`RestaurantStore`); funciones/miembros: `camelCase`.
- Base de datos: `snake_case`; entidades del dominio: `camelCase` (los repos traducen).
- Dominio en español (es el idioma del producto): `mesero`, `recibido`, `temporada`. Tipos y APIs técnicas en inglés (`OrderStatus`, `placeOrder`).

## Organización

- `core/domain` no importa Angular ni Supabase; `core/data` nunca es importado por `features/`.
- Un componente por vista; los pequeños usan **template inline**.
- Estado compartido en el store; estado puramente local (carrito del cliente, formularios abiertos) en signals del componente.
- Rutas lazy por feature; guards con factory `roleGuard(rol)`.

## Estilo de componentes

- `ChangeDetectionStrategy.OnPush` siempre.
- `inject()` en lugar de inyección por constructor; `input()`/`computed()` en lugar de decoradores.
- Clases de Tailwind con los tokens del tema (`bg-cacao`, `text-tinta-media`); colores del diseño que solo se usan una vez pueden ir como arbitrarios (`bg-[#1E150D]`).
- Accesibilidad: roles ARIA (`role="switch"`, `role="alert"`), `aria-label` en botones de icono, labels asociados a inputs.

## Accesibilidad y microinteracciones (guía ui-ux-pro-max)

Se aplican los principios de la skill **ui-ux-pro-max** sin cambiar la identidad visual:

- **Foco visible**: `:focus-visible` global con anillo terracota (nunca se elimina el outline).
- **Movimiento reducido**: `@media (prefers-reduced-motion: reduce)` desactiva animaciones/transiciones.
- **Transiciones** de 150–300 ms en controles; `touch-action: manipulation` para quitar el retardo de 300 ms.
- **Touch targets** ≥44px (`min-h-11` en inputs, botones con área suficiente).
- **Responsive**: `min-h-dvh` (no `100vh`) en las raíces; la home del cliente es mobile-first.
- **Formularios**: validación *inline* tras `touched` (no al cargar), error bajo el campo, `aria-invalid`/`aria-describedby`, foco al primer campo inválido, `aria-live` en errores, toggle mostrar/ocultar contraseña.
- **Sin emojis como iconos**; el color nunca es el único indicador (siempre hay texto/etiqueta).

## Documentación

- **JSDoc en cada servicio, repositorio y método no trivial explicando el *porqué*** (la decisión), no el *qué* (que ya lo dice el código).
- `docs/` se actualiza cuando cambia la arquitectura; `tasks/current.md` y `tasks/backlog.md` al terminar cada tarea importante.

## Pruebas

- Unit: reglas de dominio y store con los **repositorios demo reales** (no mocks frágiles). Geometría del plano fijada con los valores exactos del diseño.
- E2E: flujos por rol (cliente sin login, guards, kanban, protección de datos) + verificación de diseño (colores del mockup). Selectores por rol/label; `data-testid` solo cuando el texto es ambiguo.
- Antes de dar por terminado: `npm run build` + `npm test` + `npm run e2e` en verde.

## Git

- Commits en español, imperativos y pequeños: `agrega guard de roles`, `corrige fusión de mesas`.
- Nunca subir `.env` ni `env.generated.ts` (ya están en `.gitignore`).
