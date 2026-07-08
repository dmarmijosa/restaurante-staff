# Manual de instalación — Restaurante Staff

Guía pensada para una **persona no técnica** que quiere poner en marcha su propio
restaurante con esta plataforma libre. Está escrita paso a paso. Si te atascas en
algún punto, cada sección indica qué hacer.

> Este manual se irá ampliando conforme el proyecto crece. Última actualización: 2026-07-02 (v0.5).

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

> **Atajo:** en la pantalla de acceso, en modo demo, hay **botones de entrada rápida**
> (Administrador, Mesero, Cocina, Cajero): un clic y entras con ese rol, sin escribir nada.
> Y desde el panel de administración, el botón **«Salir del modo demo»** te pide la URL y la
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

1. Entra en **https://supabase.com** y crea una cuenta (con tu correo o con Google).
2. Pulsa **New project** (Nuevo proyecto).
   - Ponle un nombre, por ejemplo `mi-restaurante`.
   - Elige una contraseña para la base de datos y **guárdala** en un lugar seguro.
   - Elige la región más cercana a tu país.
3. Espera 1–2 minutos a que el proyecto se cree.

### 3.1. Cargar la estructura (tablas)

1. En el menú lateral de Supabase entra en **SQL Editor**.
2. Abre, uno por uno y **en orden**, los archivos de la carpeta `supabase/migrations/`
   del proyecto, copia su contenido, pégalo en el editor y pulsa **Run**:
   1. `..._init.sql`
   2. `..._rls.sql`
   3. `..._bootstrap_admin_and_storage.sql`
   4. `..._add_logo_url.sql`
   5. `..._cajero_role_and_payments.sql`
3. (Opcional) Si quieres empezar con datos de ejemplo (mesas y platillos), pega
   también `supabase/seed.sql` y pulsa **Run**.

Con esto tu base ya tiene las tablas, la seguridad y los métodos de pago iniciales
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

En la carpeta del proyecto hay un archivo `.env.example`. La persona que ejecute
la app debe:

1. Hacer una copia llamada `.env`.
2. Rellenarla con tus dos claves:

   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
   ```

3. Arrancar la app (`npm install` y luego `npm start`).

> El archivo `.env` no se sube a internet ni al repositorio: tus claves quedan solo en tu ordenador/servidor.

---

## 5. Crear tu cuenta de administrador (¡solo la primera vez!)

1. Abre la app en el navegador.
2. Como todavía no existe ninguna cuenta, la app te llevará **automáticamente** a
   la pantalla **"Crea tu cuenta de administrador"**.
3. Escribe tu nombre, tu correo y una contraseña (mínimo 8 caracteres) y pulsa
   **Crear administrador**.
4. Según la configuración de Supabase, puede que recibas un **correo para
   confirmar** tu cuenta: ábrelo y pulsa el enlace.
5. Vuelve a la app e inicia sesión. ¡Listo! Esa primera cuenta es la **propietaria**
   y no se puede borrar.

> A partir de aquí, esa pantalla de registro desaparece: las demás cuentas las creas tú desde el panel.

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
- **Ajustes**: nombre y logo del restaurante y cuentas de administración.

---

## 7. El día a día

- **Cliente**: pega el QR de cada mesa. Al escanearlo, el cliente ve el menú, pide y sigue su pedido.
- **Cocina**: abre la pantalla de Cocina; toca "Empezar a preparar" y "Platillo listo".
- **Mesero**: abre la tablet de Mesero; atiende llamadas y avanza los pedidos.
- **Cajero**: abre la pantalla de Cajero; elige el método de pago de cada pedido y registra el cobro.

Cada empleado inicia sesión con su correo y contraseña, y solo ve la pantalla de su rol
(tú, como administrador, ves todas).

---

## 8. Problemas frecuentes

- **"No aparece la pantalla de registro"**: ya existe un administrador. Usa **Iniciar sesión**. Si olvidaste la contraseña, restablécela desde Supabase → Authentication → Users.
- **"El menú sale vacío"**: revisa que cargaste las migraciones (paso 3.1) y, si quieres datos de ejemplo, el `seed.sql`.
- **"No puedo cobrar / no hay métodos de pago"**: ve a **Métodos de pago** en el panel y añade al menos uno activo.
- **"Las fotos no se ven"**: comprueba que ejecutaste la migración que crea el almacén de imágenes (paso 3.1, archivo de *storage*).

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
