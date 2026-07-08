#!/usr/bin/env node
/**
 * Genera public/setup/schema.sql concatenando todas las migraciones
 * de supabase/migrations en orden alfabético.
 *
 * El seed de demo (supabase/seed.sql) se inserta ANTES de la migración 9
 * (multi_restaurante): los inserts no llevan restaurant_id y la migración 9
 * los adopta al restaurante por defecto en su backfill.
 *
 * Regenerar tras añadir una migración nueva:
 *   node scripts/build-schema.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const SEED_FILE      = join(ROOT, 'supabase', 'seed.sql');
const OUT_FILE       = join(ROOT, 'public', 'setup', 'schema.sql');

/** Migración a partir de la cual existe restaurant_id en las tablas de negocio. */
const MULTI_TENANT_MIGRATION = '20260704000009_multi_restaurante.sql';

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const parts = [
  '-- ============================================================================',
  '-- Restaurante Staff · Esquema completo',
  '-- Generado por scripts/build-schema.mjs — no editar a mano.',
  `-- Migraciones incluidas: ${migrations.length} (seed demo antes de multi-tenant).`,
  '-- Aplicar en el SQL Editor de tu proyecto Supabase (o con `supabase db push`).',
  '-- ============================================================================',
  '',
];

let seedInserted = false;

for (const file of migrations) {
  // Seed demo: debe ir ANTES de multi_restaurante (sin restaurant_id en inserts).
  if (!seedInserted && file === MULTI_TENANT_MIGRATION) {
    try {
      const seed = readFileSync(SEED_FILE, 'utf8').trimEnd();
      parts.push(
        '-- ────────────────────────────────────────────────────────────────────────',
        '-- Datos de ejemplo (seed) — la migración 9 los adopta al restaurante default',
        '-- ────────────────────────────────────────────────────────────────────────',
        seed,
        '',
      );
      seedInserted = true;
    } catch { /* seed opcional */ }
  }

  const content = readFileSync(join(MIGRATIONS_DIR, file), 'utf8').trimEnd();
  parts.push(
    '-- ────────────────────────────────────────────────────────────────────────',
    `-- Migración: ${file}`,
    '-- ────────────────────────────────────────────────────────────────────────',
    content,
    '',
  );
}

writeFileSync(OUT_FILE, parts.join('\n'));
console.log(`✔ schema.sql generado con ${migrations.length} migraciones${seedInserted ? ' + seed' : ''} → ${OUT_FILE}`);
