/**
 * Wizard de instalación guiada para restaurantes sin equipo técnico.
 *
 * Guía al propietario paso a paso:
 *   1. Bienvenida
 *   2. Crear proyecto en Supabase (externo)
 *   3. Copiar claves y conectar la app
 *   4. Aplicar el esquema SQL
 *   5. Crear cuenta de administrador
 *   6. ¡Todo listo! — primeros pasos en el panel
 *
 * El progreso se guarda en localStorage para que el usuario pueda continuar
 * si cierra el navegador a mitad del proceso.
 * La detección automática (Supabase configurado, admin creado) permite
 * saltar pasos ya completados.
 */
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  isSupabaseConfigured,
  saveSupabaseConfig,
} from '../../core/data/supabase/runtime-config';
import { AuthService } from '../../core/auth/auth.service';

const PROGRESS_KEY = 'rs_setup_step';
const TOTAL_STEPS = 6;

@Component({
  selector: 'app-setup-wizard',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-dvh bg-crema px-4 py-10 md:px-6">
      <!-- Logo -->
      <div class="mx-auto mb-8 flex max-w-2xl items-center gap-3">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-[10px] bg-terracota font-serif text-lg font-bold text-lino-calido"
        >R</div>
        <div>
          <div class="font-serif text-xl font-semibold leading-tight text-tinta">Restaurante Staff</div>
          <div class="text-[11px] text-tinta-media">Guía de instalación</div>
        </div>
        <div class="flex-1"></div>
        <a routerLink="/" class="text-[12px] font-semibold text-terracota-profundo hover:underline">
          Ver la demo
        </a>
      </div>

      <!-- Barra de progreso -->
      @if (step() > 1 && step() < TOTAL_STEPS) {
        <div class="mx-auto mb-8 max-w-2xl">
          <div class="mb-1.5 flex justify-between text-[11px] font-semibold text-tinta-media">
            <span>Paso {{ step() - 1 }} de {{ TOTAL_STEPS - 2 }}</span>
            <span>{{ Math.round(((step() - 1) / (TOTAL_STEPS - 2)) * 100) }}%</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-panal">
            <div
              class="h-full rounded-full bg-terracota transition-all duration-500"
              [style.width.%]="((step() - 1) / (TOTAL_STEPS - 2)) * 100"
            ></div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PASO 1 — Bienvenida                                                -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (step() === 1) {
        <div class="mx-auto max-w-2xl">
          <div class="rounded-2xl border border-borde bg-papel p-8 shadow-sm">
            <!-- Hero -->
            <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-duna">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c1683c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>

            <span class="mb-3 inline-block rounded-full bg-duna px-2.5 py-1 text-[10.5px] font-bold text-terracota-profundo">
              GUÍA DE INSTALACIÓN
            </span>
            <h1 class="m-0 font-serif text-3xl font-semibold text-tinta">
              Configura tu restaurante<br/>en 5 minutos
            </h1>
            <p class="mt-3 mb-6 text-[14px] leading-relaxed text-tinta-media">
              Vamos a conectar la app con tu propia base de datos gratuita, crear las tablas
              necesarias y registrar tu cuenta de administrador. No necesitas saber programar.
            </p>

            <!-- Qué necesitas -->
            <div class="mb-6 rounded-xl border border-borde-suave bg-crema p-5">
              <div class="mb-3 text-[11.5px] font-bold tracking-[.05em] text-tinta-media">QUÉ NECESITAS</div>
              <div class="flex flex-col gap-3">
                @for (item of requirements; track item.label) {
                  <div class="flex items-start gap-3">
                    <div class="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-oliva-bg text-oliva-texto">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div class="text-[13px] font-semibold text-tinta">{{ item.label }}</div>
                      <div class="text-[11.5px] text-tinta-media">{{ item.desc }}</div>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Lo que tendrás -->
            <div class="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              @for (feature of features; track feature.title) {
                <div class="rounded-xl border border-borde-suave bg-crema p-3.5 text-center">
                  <div class="mb-1.5 text-2xl">{{ feature.icon }}</div>
                  <div class="text-[12px] font-bold text-tinta">{{ feature.title }}</div>
                  <div class="text-[11px] text-tinta-media">{{ feature.desc }}</div>
                </div>
              }
            </div>

            <div class="flex gap-3">
              <button
                type="button"
                (click)="goTo(2)"
                class="flex-1 cursor-pointer rounded-[10px] border-none bg-terracota py-3 text-[14px] font-bold text-lino-calido hover:bg-terracota-hover"
              >
                Comenzar la instalación →
              </button>
            </div>

            @if (supabaseConfigured()) {
              <p class="mt-3 text-center text-[12px] text-tinta-media">
                Ya tienes Supabase configurado —
                <button type="button" (click)="goTo(4)" class="cursor-pointer border-none bg-transparent font-semibold text-terracota hover:underline">
                  saltar al paso 3
                </button>
              </p>
            }
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PASO 2 — Crea tu proyecto en Supabase                             -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (step() === 2) {
        <div class="mx-auto max-w-2xl">
          <div class="rounded-2xl border border-borde bg-papel p-8 shadow-sm">
            <div class="mb-2 flex items-center gap-3">
              <div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-terracota text-sm font-bold text-lino-calido">1</div>
              <h2 class="m-0 font-serif text-2xl font-semibold text-tinta">Crea tu proyecto en Supabase</h2>
            </div>
            <p class="mb-6 text-[13.5px] leading-relaxed text-tinta-media">
              Supabase es la base de datos que usaremos. Es <strong class="text-tinta">gratuita para restaurantes pequeños</strong>
              (hasta 500 MB, suficiente para años de pedidos). No necesitas tarjeta de crédito.
            </p>

            <div class="mb-6 flex flex-col gap-4">
              @for (substep of supabaseSteps; track substep.n) {
                <div class="flex gap-4 rounded-xl border border-borde-suave bg-crema p-4">
                  <div class="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-terracota text-xs font-bold text-lino-calido">
                    {{ substep.n }}
                  </div>
                  <div>
                    <div class="text-[13.5px] font-bold text-tinta">{{ substep.title }}</div>
                    <div class="mt-0.5 text-[12.5px] leading-relaxed text-tinta-media" [innerHTML]="substep.desc"></div>
                    @if (substep.link) {
                      <a
                        [href]="substep.link"
                        target="_blank"
                        rel="noopener"
                        class="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-terracota px-3 py-1.5 text-[12px] font-bold text-terracota hover:bg-duna"
                      >
                        {{ substep.linkLabel }}
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <path d="M5 2H2v8h8V7M7 2h3m0 0v3M7 5l3-3"/>
                        </svg>
                      </a>
                    }
                    @if (substep.code) {
                      <code class="mt-2 block rounded-[7px] bg-cacao px-3 py-1.5 font-mono text-[12px] text-lino-suave">
                        {{ substep.code }}
                      </code>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Tip -->
            <div class="mb-6 rounded-xl border border-ocre-bg bg-ocre-bg px-4 py-3 text-[12.5px] leading-relaxed text-ocre-texto">
              <strong>Consejo:</strong> al crear el proyecto, elige la región más cercana a tu restaurante
              (por ejemplo <em>South America (São Paulo)</em> si estás en Latinoamérica, o
              <em>EU (Frankfurt)</em> si estás en Europa). Afecta la velocidad de respuesta.
            </div>

            <div class="flex gap-3">
              <button type="button" (click)="goTo(1)" class="cursor-pointer rounded-[10px] border border-borde bg-transparent px-5 py-3 text-[13px] font-semibold text-tinta-suave hover:bg-crema">
                ← Atrás
              </button>
              <button type="button" (click)="goTo(3)" class="flex-1 cursor-pointer rounded-[10px] border-none bg-terracota py-3 text-[14px] font-bold text-lino-calido hover:bg-terracota-hover">
                Ya tengo mi proyecto →
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PASO 3 — Copia tus claves y conecta                               -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (step() === 3) {
        <div class="mx-auto max-w-2xl">
          <div class="rounded-2xl border border-borde bg-papel p-8 shadow-sm">
            <div class="mb-2 flex items-center gap-3">
              <div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-terracota text-sm font-bold text-lino-calido">2</div>
              <h2 class="m-0 font-serif text-2xl font-semibold text-tinta">Conecta tu base de datos</h2>
            </div>
            <p class="mb-6 text-[13.5px] leading-relaxed text-tinta-media">
              Ahora copiaremos las dos claves de acceso de Supabase y las pegaremos aquí.
              Esto conecta la app con TU base de datos — nadie más tendrá acceso.
            </p>

            <!-- Instrucciones para encontrar las claves -->
            <div class="mb-5 rounded-xl border border-borde-suave bg-crema p-4">
              <div class="mb-2 text-[11.5px] font-bold tracking-[.05em] text-tinta-media">CÓMO ENCONTRAR TUS CLAVES</div>
              <ol class="m-0 flex list-none flex-col gap-2 p-0">
                @for (item of keySteps; track item.n) {
                  <li class="flex items-start gap-3 text-[13px] text-tinta-suave">
                    <span class="mt-px flex h-5 w-5 flex-none items-center justify-center rounded-full bg-terracota text-[10px] font-bold text-lino-calido">{{ item.n }}</span>
                    <span [innerHTML]="item.text"></span>
                  </li>
                }
              </ol>
            </div>

            <!-- Formulario -->
            <div class="mb-4">
              <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="wiz-url">
                PROJECT URL
              </label>
              <input
                id="wiz-url"
                type="url"
                [(ngModel)]="supabaseUrl"
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                autocomplete="off"
                class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel px-3 py-[9px] text-[13px] font-mono text-tinta outline-none focus:border-terracota"
                [class.border-borde]="!connectError()"
                [class.border-rojizo]="connectError()"
              />
            </div>
            <div class="mb-4">
              <label class="mb-1.5 block text-[11.5px] font-semibold text-tinta-media" for="wiz-key">
                ANON / PUBLIC KEY
              </label>
              <input
                id="wiz-key"
                type="text"
                [(ngModel)]="supabaseKey"
                placeholder="eyJhbGc…"
                autocomplete="off"
                class="min-h-11 w-full rounded-[9px] border-[1.5px] bg-papel px-3 py-[9px] text-[12.5px] font-mono text-tinta outline-none focus:border-terracota"
                [class.border-borde]="!connectError()"
                [class.border-rojizo]="connectError()"
              />
            </div>

            @if (connectError()) {
              <div class="mb-4 rounded-[9px] border border-rojizo-borde bg-rojizo-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-rojizo" role="alert">
                {{ connectError() }}
              </div>
            }

            <div class="mb-5 rounded-xl border border-borde-suave bg-crema px-4 py-3 text-[12.5px] leading-relaxed text-tinta-media">
              <strong class="text-tinta">¿Se guarda en un archivo .env?</strong> No.
              Las claves quedan en <strong>este navegador</strong> (almacenamiento local) y la app
              se recargará conectada a tu proyecto. Si eres desarrollador y tienes un
              <code class="rounded bg-panal px-1 py-px font-mono text-[11px]">.env</code>
              local con otras credenciales, no se modifica: las del wizard tienen prioridad aquí.
            </div>

            <div class="mb-5 rounded-xl border-[1.5px] border-dashed border-borde-punteado p-3.5 text-[12px] leading-relaxed text-tinta-media">
              <strong class="text-tinta">¿Dónde están?</strong> En tu proyecto de Supabase →
              <em>Project Settings → API</em>. La URL termina en <code class="rounded bg-panal px-1 py-px font-mono">.supabase.co</code>
              y la clave empieza con <code class="rounded bg-panal px-1 py-px font-mono">eyJ</code>.
            </div>

            <div class="flex gap-3">
              <button type="button" (click)="goTo(2)" class="cursor-pointer rounded-[10px] border border-borde bg-transparent px-5 py-3 text-[13px] font-semibold text-tinta-suave hover:bg-crema">
                ← Atrás
              </button>
              <button
                type="button"
                (click)="connectSupabase()"
                class="flex-1 cursor-pointer rounded-[10px] border-none bg-terracota py-3 text-[14px] font-bold text-lino-calido hover:bg-terracota-hover"
              >
                Conectar y continuar →
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PASO 4 — Aplica el esquema SQL                                    -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (step() === 4) {
        <div class="mx-auto max-w-2xl">
          <div class="rounded-2xl border border-borde bg-papel p-8 shadow-sm">
            <div class="mb-2 flex items-center gap-3">
              <div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-terracota text-sm font-bold text-lino-calido">3</div>
              <h2 class="m-0 font-serif text-2xl font-semibold text-tinta">Crea las tablas del restaurante</h2>
            </div>
            <p class="mb-6 text-[13.5px] leading-relaxed text-tinta-media">
              Ahora crearemos todas las tablas de tu base de datos: mesas, productos, pedidos,
              categorías, personal y más. <strong class="text-tinta">Es obligatorio</strong> copiar
              y ejecutar el archivo <code class="rounded bg-panal px-1 py-px font-mono text-[12px]">schema.sql</code>
              en el SQL Editor de Supabase antes de continuar.
            </p>

            <div class="mb-5 rounded-xl border border-rojizo-borde bg-rojizo-bg px-4 py-3 text-[12.5px] leading-relaxed text-rojizo">
              <strong>Paso obligatorio:</strong> sin ejecutar <code class="rounded bg-rojizo-borde px-1 font-mono">schema.sql</code>
              el registro del administrador fallará. Debes ver
              <em>Success. No rows returned.</em> (o similar) en el SQL Editor.
            </div>

            <div class="mb-5 flex flex-col gap-3">
              @for (substep of sqlSteps; track substep.n) {
                <div class="flex gap-4 rounded-xl border border-borde-suave bg-crema p-4">
                  <div class="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-terracota text-xs font-bold text-lino-calido">
                    {{ substep.n }}
                  </div>
                  <div class="flex-1">
                    <div class="text-[13.5px] font-bold text-tinta">{{ substep.title }}</div>
                    <div class="mt-0.5 text-[12.5px] leading-relaxed text-tinta-media" [innerHTML]="substep.desc"></div>
                    @if (substep.action === 'download') {
                      <a
                        href="/setup/schema.sql"
                        download="schema.sql"
                        class="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border-none bg-terracota px-3.5 py-2 text-[12px] font-bold text-lino-calido hover:bg-terracota-hover"
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <path d="M7 1v8M4 6l3 3 3-3M2 11h10"/>
                        </svg>
                        Descargar schema.sql
                      </a>
                    }
                    @if (substep.action === 'link-sql') {
                      <a
                        [href]="supabaseUrlForSqlEditor()"
                        target="_blank"
                        rel="noopener"
                        class="mt-2 inline-flex items-center gap-1.5 rounded-[8px] border border-terracota px-3 py-1.5 text-[12px] font-bold text-terracota hover:bg-duna"
                      >
                        Abrir SQL Editor en Supabase
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                          <path d="M5 2H2v8h8V7M7 2h3m0 0v3M7 5l3-3"/>
                        </svg>
                      </a>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Advertencia sobre seed -->
            <div class="mb-6 rounded-xl border border-ocre-bg bg-ocre-bg px-4 py-3 text-[12.5px] leading-relaxed text-ocre-texto">
              <strong>¿También quiero datos de ejemplo?</strong> El archivo ya incluye datos de prueba
              (categorías, productos y mesas de ejemplo) para que veas la app en funcionamiento.
              Puedes borrarlos después desde el panel.
            </div>

            <div class="flex gap-3">
              <button type="button" (click)="goTo(3)" class="cursor-pointer rounded-[10px] border border-borde bg-transparent px-5 py-3 text-[13px] font-semibold text-tinta-suave hover:bg-crema">
                ← Atrás
              </button>
              <button
                type="button"
                (click)="markSqlDone()"
                class="flex-1 cursor-pointer rounded-[10px] border-none bg-terracota py-3 text-[14px] font-bold text-lino-calido hover:bg-terracota-hover"
              >
                Ya ejecuté el SQL →
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PASO 5 — Crear cuenta de administrador                            -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (step() === 5) {
        <div class="mx-auto max-w-2xl">
          <div class="rounded-2xl border border-borde bg-papel p-8 shadow-sm">
            <div class="mb-2 flex items-center gap-3">
              <div class="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-terracota text-sm font-bold text-lino-calido">4</div>
              <h2 class="m-0 font-serif text-2xl font-semibold text-tinta">Crea tu cuenta de administrador</h2>
            </div>
            <p class="mb-6 text-[13.5px] leading-relaxed text-tinta-media">
              El primer usuario que se registra se convierte automáticamente en el
              <strong class="text-tinta">propietario administrador</strong> del restaurante.
              Después de esto, nadie más podrá registrarse solo: el acceso del equipo
              lo gestionarás tú desde el panel.
            </p>

            <div class="mb-6 rounded-xl border border-ocre-bg bg-ocre-bg px-4 py-3 text-[12.5px] leading-relaxed text-ocre-texto">
              <strong>Antes de crear la cuenta:</strong> en Supabase ve a
              <em>Authentication → Providers → Email</em> y
              <strong>desactiva «Confirm email»</strong>. Si está activada, el registro
              quedará pendiente de confirmación y no podrás entrar al panel de inmediato.
            </div>

            <div class="mb-6 rounded-xl border border-borde-suave bg-crema p-5">
              <div class="mb-3 text-[11.5px] font-bold tracking-[.05em] text-tinta-media">QUÉ PASARÁ AL HACER CLIC</div>
              <div class="flex flex-col gap-2.5">
                @for (item of adminSteps; track item) {
                  <div class="flex items-start gap-2.5 text-[13px] text-tinta-suave">
                    <div class="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-terracota text-[9px] font-bold text-lino-calido">✓</div>
                    {{ item }}
                  </div>
                }
              </div>
            </div>

            @if (adminAlreadyExists()) {
              <div class="mb-4 rounded-xl border border-oliva-bg bg-oliva-bg px-4 py-3 text-[13px] font-semibold text-oliva-texto">
                Ya existe una cuenta de administrador en este proyecto. Puedes iniciar sesión directamente.
              </div>
              <div class="flex gap-3">
                <button type="button" (click)="goTo(4)" class="cursor-pointer rounded-[10px] border border-borde bg-transparent px-5 py-3 text-[13px] font-semibold text-tinta-suave hover:bg-crema">
                  ← Atrás
                </button>
                <button type="button" (click)="goTo(6)" class="flex-1 cursor-pointer rounded-[10px] border-none bg-terracota py-3 text-[14px] font-bold text-lino-calido hover:bg-terracota-hover">
                  Continuar →
                </button>
              </div>
            } @else {
              <div class="flex gap-3">
                <button type="button" (click)="goTo(4)" class="cursor-pointer rounded-[10px] border border-borde bg-transparent px-5 py-3 text-[13px] font-semibold text-tinta-suave hover:bg-crema">
                  ← Atrás
                </button>
                <a
                  routerLink="/nuevo-restaurante"
                  (click)="saveStep(6)"
                  class="flex-1 cursor-pointer rounded-[10px] border-none bg-terracota py-3 text-center text-[14px] font-bold text-lino-calido hover:bg-terracota-hover"
                >
                  Crear mi restaurante y cuenta →
                </a>
              </div>
            }
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- PASO 6 — ¡Todo listo!                                             -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      @if (step() === 6) {
        <div class="mx-auto max-w-2xl">
          <div class="rounded-2xl border border-borde bg-papel p-8 text-center shadow-sm">
            <!-- Icono de éxito -->
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-oliva-bg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4e6337" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h1 class="m-0 font-serif text-3xl font-semibold text-tinta">¡Tu restaurante está listo!</h1>
            <p class="mt-2 mb-8 text-[14px] leading-relaxed text-tinta-media">
              La plataforma está conectada a tu base de datos. Ahora configura los detalles
              de tu local desde el panel de administración.
            </p>

            <!-- Checklist de próximos pasos -->
            <div class="mb-8 rounded-xl border border-borde-suave bg-crema p-5 text-left">
              <div class="mb-4 text-[11.5px] font-bold tracking-[.05em] text-tinta-media">PRÓXIMOS PASOS RECOMENDADOS</div>
              <div class="flex flex-col gap-3">
                @for (item of nextSteps; track item.title) {
                  <a
                    [routerLink]="item.route"
                    class="flex items-center gap-3 rounded-xl border border-borde bg-papel px-4 py-3 no-underline hover:border-terracota hover:bg-duna/30 transition-colors"
                  >
                    <div class="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-duna text-lg">
                      {{ item.icon }}
                    </div>
                    <div class="flex-1">
                      <div class="text-[13.5px] font-bold text-tinta">{{ item.title }}</div>
                      <div class="text-[12px] text-tinta-media">{{ item.desc }}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#8b7a69" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 7h8M7 3l4 4-4 4"/>
                    </svg>
                  </a>
                }
              </div>
            </div>

            <!-- Consejo sobre el equipo -->
            <div class="mb-6 rounded-xl border border-ocre-bg bg-ocre-bg px-4 py-3 text-left text-[12.5px] leading-relaxed text-ocre-texto">
              <strong>Para dar de alta al equipo</strong> (meseros, cocineros, cajeros):
              ve a tu proyecto en Supabase → Authentication → Users → <em>Invite user</em>.
              Después, asigna el rol y el turno desde el panel en <strong>Personal</strong>.
            </div>

            <a
              routerLink="/admin"
              (click)="clearProgress()"
              class="inline-block w-full cursor-pointer rounded-[10px] border-none bg-terracota py-3.5 text-[15px] font-bold text-lino-calido hover:bg-terracota-hover"
            >
              Ir al panel de administración →
            </a>

            <button
              type="button"
              (click)="clearProgress()"
              class="mt-3 cursor-pointer border-none bg-transparent text-[12px] font-semibold text-tinta-media hover:text-tinta"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class SetupWizardComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  protected readonly TOTAL_STEPS = TOTAL_STEPS;
  protected readonly Math = Math;

  protected readonly step = signal(1);
  protected readonly supabaseConfigured = signal(false);
  protected readonly adminAlreadyExists = signal(false);
  protected readonly connectError = signal<string | null>(null);
  protected readonly checkingAdmin = signal(false);

  protected supabaseUrl = '';
  protected supabaseKey = '';

  // ── Datos estáticos ────────────────────────────────────────────────────

  protected readonly requirements = [
    { label: 'Una cuenta de correo electrónico', desc: 'Para registrarte en Supabase y en la app.' },
    { label: 'Conexión a Internet', desc: 'Para crear la base de datos en la nube.' },
    { label: '15 minutos', desc: 'El proceso completo, sin prisa.' },
  ];

  protected readonly features = [
    { icon: '📋', title: 'Menú QR', desc: 'Tus clientes piden desde el móvil' },
    { icon: '🍳', title: 'Cocina', desc: 'Comandas en tiempo real' },
    { icon: '🧾', title: 'Caja', desc: 'Cobro por método de pago' },
    { icon: '📊', title: 'Informes', desc: 'Ventas y ticket medio' },
  ];

  protected readonly supabaseSteps = [
    {
      n: 1,
      title: 'Ve a supabase.com y crea tu cuenta',
      desc: 'Haz clic en "Start your project" e inicia sesión con Google o con tu correo electrónico. Es completamente gratuito.',
      link: 'https://supabase.com',
      linkLabel: 'Abrir supabase.com',
      code: null,
    },
    {
      n: 2,
      title: 'Crea un nuevo proyecto',
      desc: 'Una vez dentro del dashboard, haz clic en <strong>New project</strong>. Ponle el nombre de tu restaurante y crea una contraseña segura (guárdala).',
      link: null,
      linkLabel: null,
      code: null,
    },
    {
      n: 3,
      title: 'Espera 2 minutos mientras se provisiona',
      desc: 'Supabase tardará 1–2 minutos en preparar tu proyecto. Verás una barra de progreso. Cuando termine, continúa al siguiente paso.',
      link: null,
      linkLabel: null,
      code: null,
    },
    {
      n: 4,
      title: 'Desactiva la confirmación de correo',
      desc: 'En el menú lateral → <strong>Authentication</strong> → <strong>Providers</strong> → <strong>Email</strong> → desmarca <strong>Confirm email</strong>. Así el primer administrador entra al panel sin revisar el buzón.',
      link: null,
      linkLabel: null,
      code: null,
    },
  ];

  protected readonly keySteps = [
    { n: 1, text: 'Abre tu proyecto en <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" class="text-terracota font-semibold hover:underline">supabase.com/dashboard</a>' },
    { n: 2, text: 'En el menú lateral izquierdo, haz clic en <strong>Project Settings</strong> (el ícono de engranaje)' },
    { n: 3, text: 'Ve a la pestaña <strong>API</strong>' },
    { n: 4, text: 'Copia la <strong>Project URL</strong> (empieza con <code class="rounded bg-panal px-1 font-mono text-[11px]">https://</code>)' },
    { n: 5, text: 'Copia la clave <strong>anon public</strong> (empieza con <code class="rounded bg-panal px-1 font-mono text-[11px]">eyJ</code>)' },
  ];

  protected readonly sqlSteps = [
    {
      n: 1,
      title: 'Descarga el archivo de esquema',
      desc: 'Contiene todas las tablas, reglas de seguridad y datos de ejemplo de tu restaurante.',
      action: 'download',
    },
    {
      n: 2,
      title: 'Abre el SQL Editor de Supabase',
      desc: 'En tu proyecto → menú lateral → <strong>SQL Editor</strong>.',
      action: 'link-sql',
    },
    {
      n: 3,
      title: 'Pega el contenido del archivo y haz clic en "Run"',
      desc: 'Abre el archivo descargado con un editor de texto (Bloc de notas, TextEdit), selecciona todo (Ctrl+A), cópialo y pégalo en el editor de Supabase. Después pulsa <strong>Run ▶</strong>.',
      action: null,
    },
  ];

  protected readonly adminSteps = [
    'Se creará el restaurante en la base de datos con el nombre que elijas',
    'Tu correo quedará registrado como administrador propietario',
    'Serás redirigido automáticamente al panel de administración',
    'El registro público se bloqueará para que solo tú puedas invitar al equipo',
  ];

  protected readonly nextSteps = [
    { route: '/admin/ajustes', icon: '🏠', title: 'Configura tu restaurante', desc: 'Nombre, logo, horario de apertura y temporada' },
    { route: '/admin/categorias', icon: '📂', title: 'Crea las categorías del menú', desc: 'Entrantes, principales, postres, bebidas…' },
    { route: '/admin/menu', icon: '🍽️', title: 'Añade tus platos', desc: 'Nombre, descripción, precio y foto de cada producto' },
    { route: '/admin/plano', icon: '🗺️', title: 'Diseña el plano del salón', desc: 'Arrastra y coloca las mesas; genera los QR para imprimir' },
    { route: '/admin/meseros', icon: '👥', title: 'Gestiona el personal', desc: 'Asigna roles y turnos al equipo' },
  ];

  // ── Helpers ────────────────────────────────────────────────────────────

  protected supabaseUrlForSqlEditor = computed(() => {
    const url = this.supabaseUrl.trim() || '';
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    const ref = match?.[1] ?? '';
    return ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : 'https://supabase.com/dashboard';
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const configured = isSupabaseConfigured();
    this.supabaseConfigured.set(configured);

    // Reanudar desde donde se dejó
    const saved = this.loadStep();
    if (saved > 1) {
      this.step.set(saved);
    } else if (configured) {
      // Si ya tiene Supabase configurado, arrancar en paso 4 (esquema)
      this.step.set(4);
    }

    // Detectar si ya hay admin creado (solo si Supabase está configurado)
    if (configured) {
      this.checkingAdmin.set(true);
      try {
        const exists = await this.auth.adminExists();
        this.adminAlreadyExists.set(exists);
        if (exists && this.step() <= 5) {
          this.step.set(6);
        }
      } catch {
        // Sin acceso aún — ignorar, el usuario avanzará manualmente.
      } finally {
        this.checkingAdmin.set(false);
      }
    }
  }

  protected goTo(n: number): void {
    this.step.set(n);
    this.saveStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected connectSupabase(): void {
    const url = this.supabaseUrl.trim();
    const key = this.supabaseKey.trim();

    if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
      this.connectError.set('La URL debe tener el formato https://xxxxxxxx.supabase.co');
      return;
    }
    if (key.length < 20) {
      this.connectError.set('La clave anon/public parece incorrecta. Cópiala desde Project Settings → API.');
      return;
    }

    this.connectError.set(null);
    saveSupabaseConfig(url, key);
    // Guardamos el paso ANTES de recargar para que el wizard reanude en el 4.
    // El reload es imprescindible: los repositorios se registran una sola vez
    // al arrancar la app en función de `isSupabaseConfigured()`. Sin reload,
    // aunque las credenciales queden en localStorage, la app sigue con los
    // repositorios en memoria del modo demo y `/nuevo-restaurante` haría el
    // signUp contra el mock.
    this.saveStep(4);
    window.location.reload();
  }

  protected markSqlDone(): void {
    this.goTo(5);
  }

  protected saveStep(n: number): void {
    try {
      localStorage.setItem(PROGRESS_KEY, String(n));
    } catch { /* noop */ }
  }

  protected clearProgress(): void {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch { /* noop */ }
  }

  private loadStep(): number {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const n = raw ? parseInt(raw, 10) : 1;
      return isNaN(n) || n < 1 || n > TOTAL_STEPS ? 1 : n;
    } catch {
      return 1;
    }
  }
}
