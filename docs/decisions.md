# Decisiones de arquitectura

## ADR-1 · Clean architecture con clases abstractas como puertos
Los contratos de repositorio son **clases abstractas** (no interfaces) porque sirven a la vez de contrato de tipos y de token de inyección de Angular. La presentación depende solo del dominio; la implementación se decide en `core.providers.ts`.

## ADR-2 · Modo demo en memoria como fallback
Si no hay `SUPABASE_URL`/`SUPABASE_ANON_KEY`, la app arranca con repositorios en memoria y los **datos exactos del diseño original**. Motivos: (1) un proyecto open source debe probarse con `npm start` sin registrarse en nada; (2) las pruebas unitarias y E2E corren sin credenciales en CI; (3) obliga a mantener los contratos honestos.

## ADR-3 · Signals + store único en la capa de aplicación
El diseño original comparte un estado entre las 4 vistas (el pedido del cliente aparece en cocina y en la tablet). Un `RestaurantStore` con signals replica ese modelo con actualización optimista y refresco por Realtime. No se usa NgRx: el tamaño del dominio no justifica la ceremonia.

## ADR-4 · El cliente no se autentica
La home (`/`) es la vista del cliente y el login del personal vive en el **footer**, como pide el producto. El QR de cada mesa codifica `/mesa/:numero`. La seguridad no depende del cliente: las políticas **RLS** limitan qué puede hacer el rol `anon` (leer menú, crear pedidos `source='qr'`, llamar al mesero).

## ADR-5 · Roles en `profiles.role`, decididos por el admin
Cada cuenta de Auth tiene un perfil con rol `admin | mesero | cocina`. Un trigger (`handle_new_user`) crea el perfil al registrarse y el admin lo cambia desde el panel. El guard del router es UX; la autoridad es RLS (`is_admin()`, `is_staff()`).

## ADR-6 · Eliminación permanente (protección de datos)
La baja de personal es un **DELETE físico**, no un soft-delete: derecho de supresión. Doble confirmación en la UI, y una política RLS *restrictive* impide borrar la cuenta propietaria.

## ADR-7 · Snapshot de precio y nombre en `order_items`
Un pedido conserva lo que el cliente pidió aunque el producto cambie de precio o se elimine después (integridad histórica de la comanda).

## ADR-8 · Variables de entorno vía `scripts/set-env.mjs`
Angular compila las variables en el bundle; el script genera `env.generated.ts` (gitignorado) desde `.env` o del entorno del CI. Ninguna clave se versiona. `RS_FORCE_DEMO=1` fuerza el modo demo (lo usan Playwright y el preview para no tocar la base real).

**Runtime (wizard / diálogo admin):** `runtime-config.ts` guarda URL y clave en `localStorage` (`rs-supabase-url`, `rs-supabase-anon-key`) con prioridad sobre `.env`. La bandera `rs-force-demo` (activada desde «Probar modo demo» en `/login`) ignora cualquier credencial hasta que se borre; `saveSupabaseConfig()` la elimina al conectar desde el wizard o el diálogo «Salir del modo demo».

## ADR-9 · Registro inicial del admin, garantizado "una sola vez" en la base
El primer administrador se crea con un formulario público (`/registro-inicial`), pero el "una sola vez" no depende del front: el trigger `handle_new_user` marca **admin + propietario** solo al primer perfil (los siguientes son `mesero`), y `admin_exists()` (RPC pública que solo devuelve un booleano) cierra la ruta vía `bootstrapGuard` en cuanto existe un admin. Recomendado: desactivar el registro público en Supabase Auth tras el bootstrap.

## ADR-10 · Imágenes en Supabase Storage (bucket público `imagenes`)
Bucket público para que el menú del cliente muestre fotos sin login; escritura restringida al admin por políticas RLS sobre `storage.objects`. Las URLs públicas se guardan en `products.image_url` y `restaurant_settings.logo_url`. En modo demo, el `StorageRepository` devuelve un data URL local (previsualización sin backend).

## Patrones utilizados
- **Repository** (puertos/adaptadores), **Facade** (`RestaurantStore`), **Factory** (`provideRepositories`, `roleGuard`), actualización **optimista** + sincronización Realtime, **standalone components** con lazy loading por feature.

## Convenciones clave
Ver [conventions.md](./conventions.md).

## Mejoras futuras
Registradas y priorizadas en [tasks/backlog.md](../tasks/backlog.md).
