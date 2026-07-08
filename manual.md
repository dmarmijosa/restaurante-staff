# Manual de instalación — Restaurante Staff

Guía pensada para una **persona no técnica** que quiere poner en marcha su propio
restaurante con esta plataforma libre. Está escrita paso a paso. Si te atascas en
algún punto, cada sección indica qué hacer.

> Este manual se irá ampliando conforme el proyecto crece. Última actualización: 2026-07-08 (v0.10).

---

## 1. ¿Qué es esto y qué necesito?

**Restaurante Staff** es un sistema para tu restaurante con cuatro "pantallas":

- **Cliente**: tus comensales escanean un código QR en la mesa y piden desde su móvil.
- **Cocina**: una pantalla muestra las comandas que van llegando.
- **Mesero**: una tablet con las llamadas de mesa y los pedidos.
- **Cajero**: registra los cobros (efectivo, tarjeta, transferencia…).
- **Administración**: tú, para configurar el menú, las mesas, el personal y los pagos.

Necesitas:

1. Un ordenador con conexión a internet.
2. Una cuenta gratuita en **Supabase** (la "base de datos" en la nube). Es gratis para empezar.
3. Unos 20 minutos.

No necesitas saber programar: solo copiar y pegar en los sitios que te indico.

---

## 2. Probar la app sin instalar nada (modo demostración)

> **Atajo:** en la pantalla de acceso (`/login`), en modo demo, hay **botones de entrada rápida**
> (Administrador, Mesero, Cocina, Cajero): un clic y entras con ese rol, sin escribir nada.
> Si la app está conectada a Supabase (`.env` o wizard), verás el enlace
> **«Probar modo demo (sin Supabase)»** para volver al mock en memoria.
> Desde el panel de administración, el botón **«Salir del modo demo»** te pide la URL y la
> clave publishable de tu Supabase para pasar a trabajar con tu propia base (ver §4).


Si solo quieres **verla funcionando**, alguien con conocimientos técnicos puede
ejecutarla en "modo demo" (con datos de ejemplo, sin base de datos). Las cuentas
de prueba son:

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Administrador | `admin@demo.dev` | `admin123` |
| Mesero | `mesero@demo.dev` | `mesero123` |
| Cocina | `cocina@demo.dev` | `cocina123` |
| Cajero | `cajero@demo.dev` | `cajero123` |

En modo demo los cambios no se guardan (al recargar vuelve al ejemplo). Para uso
real sigue el resto del manual.

---

## 3. Crear tu base de datos en Supabase

> **Atajo recomendado:** abre <http://localhost:4200/instalacion> — el **wizard** te lleva
> de la mano paso a paso (6 pantallas). Descargas **un solo archivo** (`schema.sql`) y lo
> pegas de una vez en Supabase. **Importante:** pegar las claves en el wizard (paso 3) solo
> conecta **este navegador de forma temporal**; para una instalación completa y permanente
> sigue **todo** este manual (§3–§5), sobre todo §4.b (`.env` + build). Si prefieres
> el método manual sin wizard, sigue leyendo.

1. Entra en **https://supabase.com** y crea una cuenta (con tu correo o con Google).
2. Pulsa **New project** (Nuevo proyecto).
   - Ponle un nombre, por ejemplo `mi-restaurante`.
   - Elige una contraseña para la base de datos y **guárdala** en un lugar seguro.
   - Elige la región más cercana a tu país.
3. Espera 1–2 minutos a que el proyecto se cree.

### 3.0. Desactivar la confirmación de correo (recomendado)

Antes de crear tu cuenta de administrador:

1. En Supabase → **Authentication** → **Providers** → **Email**.
2. **Desactiva «Confirm email»** (confirmación de correo).

Así el primer administrador entra al panel de inmediato, sin revisar el buzón.

### 3.1. Cargar la estructura (tablas)

**Opción rápida (recomendada):** descarga `schema.sql` desde el wizard `/instalacion`
(paso 4) o desde `public/setup/schema.sql` del repositorio (19 migraciones + seed unificados).
Pégalo entero en el **SQL Editor** de Supabase y pulsa **Run**. Debes ver
`Success. No rows returned.` (o similar).

**¿Base de prueba ya usada y quieres empezar de cero?** Usa `public/setup/reset-and-schema.sql`
(generado con `node scripts/build-reset-schema.mjs`): borra el esquema `public`, limpia usuarios
de Auth y vuelve a aplicar el esquema completo.

**Opción manual (avanzada):** aplica los archivos de `supabase/migrations/` **en orden
alfabético** (19 archivos) y al final `supabase/seed.sql` si quieres datos de ejemplo
de la demo «Casa Nogal». El wizard y `schema.sql` ya incluyen todo esto en un solo paso.

Con esto tu base ya tiene las tablas, la seguridad (RLS), multi-restaurante, moneda,
`create_restaurant()` con catálogo sembrado automáticamente y métodos de pago por defecto
(Efectivo, Tarjeta, Transferencia).

### 3.2. Copiar tus claves

1. En Supabase entra en **Project Settings → API**.
2. Apunta dos datos:
   - **Project URL** (algo como `https://xxxx.supabase.co`).
   - La clave **`anon` / publishable** (empieza por `sb_publishable_...`).

Estas dos claves son públicas y seguras para la app; **nunca compartas** la
contraseña de la base de datos ni la clave `service_role`.

---

## 4. Conectar la app con tu base de datos

Dos formas. El wizard sirve para **probar rápido**; el `.env` + build es para **dejarlo fijo**.

### 4.a · Desde el wizard (prueba en este navegador)

1. Arranca la app en modo demo (`npm install` y luego `npm start`).
2. Abre <http://localhost:4200/instalacion>.
3. En el paso 3 pega la **Project URL** y la clave **anon/publishable**. La app las guarda en
   el navegador (`localStorage`) y se recarga sola contra tu Supabase.

**Limitaciones del wizard:**

- Las claves **no** se escriben en `.env`.
- La conexión es **solo en este navegador**: si cierras el navegador, borras datos del sitio
  o abres la app en otro dispositivo, tendrás que volver a pegar las claves o seguir §4.b.
- Para publicar en un servidor, tablets del personal o uso diario estable, **no basta el wizard**:
  completa §3 (schema + confirmación de correo) y §4.b.

Alternativa: desde el panel de administración (sidebar) hay un botón
**«Salir del modo demo»** con el mismo formulario de conexión.

### 4.b · Vía archivo `.env` (instalación completa, recomendada para producción)

En la carpeta del proyecto hay un archivo `.env.example`:

1. Cópialo como `.env`.
2. Rellénalo con tus dos claves:

   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
   ```

3. Arranca en desarrollo: `npm start` (el script `scripts/set-env.mjs` genera
   `src/environments/env.generated.ts`, gitignorado).
4. Para publicar: `npm run build` — las claves del `.env` quedan embebidas en `dist/`
   en el momento del build. Sube esa carpeta a tu hosting (Netlify, Vercel, servidor propio…).

> El archivo `.env` no se sube al repositorio: tus claves quedan solo en tu ordenador/servidor.
> El wizard **nunca** modifica `.env`; si usaste el wizard antes, las claves del navegador
> tienen prioridad hasta que borres el almacenamiento local o uses «Probar modo demo» en `/login`.

---

## 5. Crear tu cuenta de administrador (¡solo la primera vez!)

1. Asegúrate de haber ejecutado `schema.sql` (§3.1) y de haber desactivado la confirmación
   de correo (§3.0).
2. Abre la app en el navegador.
3. Ve a **`/nuevo-restaurante`** (el wizard del paso 5 te lleva allí) o sigue el enlace
   desde `/login` si aún no hay administrador.
4. Escribe el nombre del restaurante, tu nombre, correo y contraseña (mínimo 8 caracteres)
   y pulsa **Crear restaurante y cuenta**.
5. Si la confirmación de correo sigue activa en Supabase, revisa tu buzón antes de entrar.
6. Inicia sesión. ¡Listo! Esa primera cuenta es la **propietaria** de ese restaurante.

> Puedes crear **varios restaurantes** (tenants) en el mismo proyecto Supabase con
> `/nuevo-restaurante`. El wizard salta al paso final si ya existe algún admin global.

### 5.1. (Recomendado) Cerrar el registro público

Para que nadie más pueda registrarse por su cuenta, en Supabase entra en
**Authentication → Providers → Email** y **desactiva "Allow new users to sign up"**.
Desde ese momento, solo tú (el administrador) das de alta al personal.

---

## 6. Primeros pasos en el panel de administración

La primera vez que entres verás una **guía interactiva** que te explica cada
sección (puedes repetirla con el botón **"Ver guía del panel"**). Un recorrido rápido:

- **Plano del salón**: dibuja tus mesas, ajusta sillas, fusiónalas e **imprime el QR** de cada mesa para pegarlo en ella.
- **Pedidos**: ves las comandas en tiempo real.
- **Menú y productos**: crea tus platillos, súbeles una **foto** y actívalos/desactívalos.
- **Categorías**: agrupa el menú (Entradas, Postres…).
- **Meseros y turnos**: da de alta a tu equipo — **mesero, cocina o cajero** — con su turno; aquí también das de baja (borra sus datos de forma permanente).
- **Horarios**: define el horario semanal de cada empleado (día, franja y descansos). Cada trabajador ve su horario de hoy en la barra superior al iniciar sesión.
- **Métodos de pago**: define cómo cobra la caja (efectivo, tarjeta, transferencia o los que añadas).
- **Temporada y horario**: abre o cierra el restaurante y fija las fechas de temporada.
- **Ajustes**: nombre, logo, **moneda** del restaurante (12 símbolos: `$`, `€`, `£`, `¥`, `R$`, `S/`, `₹`, `₩`, `CHF`, `CLP$`, `COP$`, `ARS$`) y cuentas de administración. Al cambiar la moneda, todos los precios de la app (menú, caja, historial…) se actualizan al instante.

---

## 7. El día a día

- **Cliente**: pega el QR de cada mesa. Al escanearlo, el cliente ve el menú, pide y sigue su pedido.
- **Cocina**: abre la pantalla de Cocina; toca "Empezar a preparar" y "Platillo listo". Un **pitido** suena automáticamente al entrar una comanda nueva (silenciable desde el mismo botón).
- **Mesero**: abre la tablet de Mesero; atiende llamadas y avanza los pedidos. Si pierdes conexión, la tablet sigue mostrando los últimos datos (**modo offline** con caché de 4 h) y avisa cuando vuelve la red.
- **Cajero**: abre la pantalla de Cajero; elige el método de pago de cada pedido y registra el cobro.

Cada empleado inicia sesión con su correo y contraseña, y solo ve la pantalla de su rol
(tú, como administrador, ves todas).

### Instalar la tablet del mesero como aplicación (PWA)

En **Chrome/Edge/Safari** abre la app en la tablet, ve al menú del navegador y
selecciona **"Instalar aplicación"** (o "Añadir a pantalla de inicio"). Se creará
un icono en el escritorio con nombre **"Staff"** que abre la vista del mesero
en pantalla completa, sin barra de dirección, e incluso funciona si el WiFi
falla un rato.

---

## 8. Problemas frecuentes

- **"No aparece la pantalla de registro"**: ya existe un administrador. Usa **Iniciar sesión** o `/nuevo-restaurante` para otro tenant. Si olvidaste la contraseña, restablécela desde Supabase → Authentication → Users.
- **"No veo los botones de demo en /login"**: la app detecta credenciales (`.env` o wizard en el navegador). Pulsa **«Probar modo demo (sin Supabase)»** o vacía `.env`, reinicia `npm start` y borra `rs-supabase-url` / `rs-supabase-anon-key` del almacenamiento local.
- **"Conecté Supabase en el wizard pero al cerrar el navegador ya no funciona"**: el wizard es temporal en ese navegador; para fijarlo usa §4.b (`.env` + `npm run build`).
- **"El menú sale vacío"**: revisa que cargaste `schema.sql` (§3.1). Los tenants nuevos reciben catálogo mínimo automáticamente vía `create_restaurant()`.
- **"No puedo cobrar / no hay métodos de pago"**: ve a **Métodos de pago** en el panel; los tenants nuevos ya traen Efectivo, Tarjeta y Transferencia por defecto.
- **"Error al ejecutar schema.sql: column restaurant_id does not exist"**: descarga de nuevo `public/setup/schema.sql` (regenerado con `node scripts/build-schema.mjs`) o usa `reset-and-schema.sql` en una base limpia.
- **"Las fotos no se ven"**: comprueba que ejecutaste `schema.sql` completo (incluye el bucket de Storage).

---

## 9. Modo demostración con reinicio diario (opcional)

Para demos, el proyecto incluye una función de Supabase que **restablece cada
madrugada** los datos operativos (pedidos, cobros, mesas, menú y métodos de
pago) a su estado inicial, **sin borrar las cuentas** de usuario. Así puedes
usar la app con normalidad durante el día y al día siguiente vuelve a empezar
limpia.

- Se instala con la migración `..._daily_demo_reset.sql` (crea `reset_demo_data()`
  y la programa con **pg_cron** a las 08:00 UTC).
- **Ejecutarla manualmente** (SQL Editor): `select public.reset_demo_data();`
- **Cambiar la hora**: `select cron.alter_job((select jobid from cron.job where jobname='reset-demo-diario'), schedule => '0 6 * * *');`
- **Desactivarla en producción**: `select cron.unschedule('reset-demo-diario');`

> En un restaurante real **no** querrás este reinicio: desactívalo tras la demo.

## 10. ¿Dónde pedir ayuda?

Este es un proyecto **open source** (licencia MIT). Puedes abrir una incidencia en
el repositorio de GitHub del proyecto describiendo tu problema.

---

## Novedades de v0.10

- **Wizard `/instalacion` mejorado** — avisos obligatorios de `schema.sql` y desactivar confirmación de correo; aclara que pegar claves es **temporal en el navegador** y remite al manual para instalación completa (`.env` + build).
- **`schema.sql` unificado** — 19 migraciones + seed; generado con `scripts/build-schema.mjs`. `reset-and-schema.sql` para reiniciar una base de prueba.
- **Seed automático en `create_restaurant()`** — cada tenant nuevo trae menú, mesas y métodos de pago listos.
- **Modo demo recuperable** — enlace «Probar modo demo» en `/login` aunque exista `.env`.
- **Moneda configurable**, **PWA mesero**, **beep automático en cocina**, **6 idiomas**, panel responsivo.

## Novedades de v0.9

- **Wizard `/instalacion`** — asistente de 6 pantallas que te guía desde cero. Descarga `schema.sql` para pegarlo de una vez y conecta tus claves sin editar archivos.
- **Modo demo por defecto** — la app arranca sin credenciales; los datos son de ejemplo y el estado vive en memoria (recargar = restaurar). Ideal para probar antes de configurar tu Supabase.
- **Moneda configurable** — selector visual con 12 símbolos ($, €, £, ¥, R$, S/, ₹, ₩, CHF, CLP$, COP$, ARS$) en Ajustes; todos los precios se actualizan al instante.
- **PWA para la tablet del mesero** — instalable, funciona sin conexión gracias a la caché local.
- **Notificación sonora en cocina** — beep automático al entrar una comanda, con indicador visual si el navegador aún no permitió reproducir sonido (basta tocar la pantalla una vez).
- **Panel 100 % responsivo** e **internacionalización en 6 idiomas** (español, inglés, catalán, portugués, francés, italiano).
