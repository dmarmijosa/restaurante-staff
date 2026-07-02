# API y acceso a datos

No hay un backend propio: la app habla con **Supabase** (PostgREST + Auth + Realtime). Esta página documenta las tablas (que PostgREST expone como endpoints), los contratos de repositorio que consumen los servicios y ejemplos de petición/respuesta.

## Endpoints (PostgREST)

Base: `https://<project>.supabase.co/rest/v1`

| Recurso | Métodos usados | Quién | Notas |
|---|---|---|---|
| `/restaurant_settings` | GET, PATCH | todos / admin | Fila única (id=1) |
| `/categories` | GET, POST, DELETE | todos / admin | |
| `/products` | GET, POST, PATCH | todos / admin | `PATCH { available }` para agotado |
| `/tables` | GET, POST, PATCH, DELETE | todos / staff / admin | posición, forma, estado, fusión |
| `/orders` | GET, POST, PATCH | todos / anónimo crea / staff avanza | `source='qr'` para pedidos del cliente |
| `/order_items` | GET, POST | todos / anónimo | snapshot de nombre y precio |
| `/waiter_calls` | GET, POST, PATCH | todos / anónimo crea / staff atiende | |
| `/restaurant_settings.logo_url` | PATCH | admin | URL del logo en Storage |
| `/auth/v1/token` | POST | personal | login email + password |
| `/auth/v1/signup` | POST | público (1ª vez) | registro inicial del admin propietario |
| `/rest/v1/rpc/admin_exists` | POST | anon | ¿ya hay admin? (gobierna el registro inicial) |
| `storage/v1/object/imagenes/**` | POST/GET | admin sube / público lee | fotos de producto y logo |

## Autenticación

- **Cliente**: clave `anon` sin sesión. Las políticas RLS le permiten leer el menú y crear pedidos/llamadas.
- **Personal**: `signInWithPassword`. El rol vive en `profiles.role` y lo asigna el admin.
- Funciones helper en SQL: `current_role()`, `is_staff()`, `is_admin()` (SECURITY DEFINER, sin recursión RLS).

## DTOs (entidades del dominio)

```ts
type StaffRole = 'admin' | 'mesero' | 'cocina';
type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'entregado';
type TableStatus = 'libre' | 'ocupada' | 'reservada';
type Season = 'alta' | 'baja' | 'cerrado';

interface Product { id; name; description; price; categoryId; categoryName; available; imageUrl }
interface RestaurantTable { id; number; x; y; seats; shape: 'sq'|'rd'; status; mergedNumbers }
interface Order { id; tableNumber; waiterName; status; createdAt; items: OrderItem[] }
interface OrderItem { productId; productName; unitPrice; quantity }   // snapshot
interface StaffMember { id; fullName; email; role; shift; status; isOwner; tables }
interface RestaurantSettings { name; isOpen; season; seasonStart; seasonEnd }
interface WaiterCall { id; tableNumber; attended; createdAt }
```

## Servicios y dependencias

| Servicio | Depende de | Responsabilidad |
|---|---|---|
| `RestaurantStore` | 6 repositorios + `ToastService` | Estado global (signals) y reglas de negocio |
| `AuthService` | `AuthRepository` | Sesión, rol, matriz de permisos |
| `SupabaseClientService` | `environment` | Instancia única de supabase-js |
| `ToastService` | — | Mensajes flotantes |

Contratos: `MenuRepository`, `TablesRepository`, `OrdersRepository`, `CallsRepository`, `StaffRepository`, `SettingsRepository`, `AuthRepository` — cada uno con implementación **Supabase** y **Demo** (elegida en `core.providers.ts`).

## Ejemplos

**Crear pedido desde el QR (cliente anónimo):**

```http
POST /rest/v1/orders
apikey: <SUPABASE_ANON_KEY>
Content-Type: application/json

{ "table_number": 4, "source": "qr" }
```

Respuesta:

```json
{ "id": 1044, "table_number": 4, "status": "recibido", "source": "qr", "created_at": "2026-07-02T19:31:00Z" }
```

**Avanzar comanda (staff autenticado):**

```http
PATCH /rest/v1/orders?id=eq.1044
Authorization: Bearer <access_token>

{ "status": "preparando" }
```

**Login del personal:**

```http
POST /auth/v1/token?grant_type=password

{ "email": "ana@casanogal.mx", "password": "···" }
```

**Registro inicial del administrador (una sola vez):**

```ts
// Solo si admin_exists() === false. El trigger handle_new_user hace admin+owner
// al PRIMER perfil; los siguientes registros toman rol 'mesero'.
await client.rpc('admin_exists');            // → false la primera vez
await client.auth.signUp({ email, password, options: { data: { full_name, role: 'admin' } } });
```

**Subir una imagen a Storage:**

```ts
const path = `productos/${crypto.randomUUID()}.jpg`;
await client.storage.from('imagenes').upload(path, file, { contentType: file.type });
const { data } = client.storage.from('imagenes').getPublicUrl(path); // → data.publicUrl
```

**Realtime (supabase-js):**

```ts
client.channel('orders-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refetch)
  .subscribe();
```
