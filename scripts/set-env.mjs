/**
 * Genera `src/environments/env.generated.ts` a partir de variables de entorno
 * o de un archivo `.env` local.
 *
 * ¿Por qué existe? Angular compila las variables en el bundle, así que no puede
 * leer `process.env` en tiempo de ejecución. Este script es el puente: mantiene
 * las claves fuera del repositorio (solo `.env`, que está en .gitignore) y las
 * inyecta en el build. Si no hay claves, la app arranca en "modo demo" con
 * datos de ejemplo, para que cualquiera pueda probar el proyecto open source
 * sin una cuenta de Supabase.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Lee pares CLAVE=valor de `.env` sin dependencias externas. */
function loadDotEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

const dotEnv = loadDotEnv();

// RS_FORCE_DEMO fuerza el modo demo (ignora cualquier clave). Lo usan las
// pruebas E2E para ser herméticas: corren en memoria, sin tocar Supabase.
const forceDemo = ['1', 'true', 'yes'].includes(String(process.env.RS_FORCE_DEMO ?? '').toLowerCase());

const supabaseUrl = forceDemo ? '' : (process.env.SUPABASE_URL ?? dotEnv.SUPABASE_URL ?? '');
const supabaseAnonKey = forceDemo ? '' : (process.env.SUPABASE_ANON_KEY ?? dotEnv.SUPABASE_ANON_KEY ?? '');

const out = `// Archivo generado por scripts/set-env.mjs — NO editar ni subir al repo.
export const generatedEnv = {
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
} as const;
`;

const target = join(root, 'src', 'environments');
mkdirSync(target, { recursive: true });
writeFileSync(join(target, 'env.generated.ts'), out);
console.log(
  `[set-env] env.generated.ts escrito (${supabaseUrl ? 'Supabase configurado' : 'sin claves → modo demo'})`,
);
