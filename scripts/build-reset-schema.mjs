#!/usr/bin/env node
/**
 * Genera public/setup/reset-and-schema.sql
 *   = reset del esquema public + auth users + schema completo
 *
 *   node scripts/build-reset-schema.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCHEMA = join(ROOT, 'public', 'setup', 'schema.sql');
const OUT = join(ROOT, 'public', 'setup', 'reset-and-schema.sql');

const reset = `-- =============================================================================
-- RESET — borra todo el esquema public y usuarios de Auth
-- Pegar en SQL Editor de Supabase y ejecutar (una sola vez).
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;

-- Usuarios de prueba anteriores (admin, meseros, etc.)
DELETE FROM auth.users;

`;

const schema = readFileSync(SCHEMA, 'utf8');
writeFileSync(OUT, reset + '\n' + schema);
console.log(`✔ ${OUT} generado (${(reset.length + schema.length).toLocaleString()} bytes)`);
