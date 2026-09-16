/**
 * base.mjs — lo que comparten todos los comandos: rutas, config, TSV, fechas.
 *
 * Nada de esto sabe quién sos. Todo lo personal sale de config/, que está
 * gitignoreado. Por eso el repo se puede publicar y clonar sin tocar código.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ruta = (...p) => join(RAIZ, ...p);

// ── Fechas ────────────────────────────────────────────────────────────────

export const hoy = () => new Date().toISOString().slice(0, 10);

/** Días entre una fecha ISO y hoy. Negativo = en el futuro. */
export function dias(iso) {
  if (!iso) return null;
  const t = Date.parse(iso + 'T00:00:00Z');
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.parse(hoy() + 'T00:00:00Z') - t) / 86400000);
}

export function masDias(n, desde = hoy()) {
  const d = new Date(Date.parse(desde + 'T00:00:00Z') + n * 86400000);
  return d.toISOString().slice(0, 10);
}

// ── Consola ───────────────────────────────────────────────────────────────

export const titulo = (t) => console.log(`\n${t}\n${'─'.repeat(t.length)}`);
export const corto = (s, n) => {
  const x = String(s ?? '');
  return (x.length > n ? x.slice(0, n - 1) + '…' : x).padEnd(n);
};

// ── Config ────────────────────────────────────────────────────────────────

import { cargar, volcar } from './yaml.mjs';

// El import de yaml.mjs es propio: ver el comentario de ese archivo sobre
// por qué el núcleo no depende de nada.
export async function cargarYml(rel, obligatorio = true) {
  const p = ruta(rel);
  if (!existsSync(p)) {
    if (!obligatorio) return null;
    console.error(`\nFalta ${rel}.\n\nCorré esto una vez y te lo arma:\n\n  node laburo.mjs setup\n`);
    process.exit(2);
  }
  try {
    return cargar(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`\nNo pude leer ${rel}\n`);
    console.error(e.message);
    console.error('\nRevisá la indentación (2 espacios) y las comillas: si un valor');
    console.error("tiene dos puntos seguidos de espacio, va entre comillas simples.\n");
    process.exit(2);
  }
}

export const guardarYml = async (rel, obj) => {
  mkdirSync(dirname(ruta(rel)), { recursive: true });
  writeFileSync(ruta(rel), volcar(obj) + '\n');
};

export const yo = () => cargarYml('config/me.yml');
export const tarifas = () => cargarYml('config/rates.yml', false);

// ── TSV ───────────────────────────────────────────────────────────────────

/**
 * Los datos se guardan en TSV y no en JSON o SQLite a propósito: se abren en
 * cualquier planilla, se editan a mano cuando algo sale mal, y `git diff` los
 * muestra línea por línea. Una persona buscando trabajo no debería necesitar
 * una herramienta para arreglar sus propios datos.
 */
export function leerTsv(rel, columnas) {
  const p = ruta(rel);
  if (!existsSync(p)) return [];
  const lineas = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim());
  if (lineas.length <= 1) return [];
  return lineas.slice(1).map((l) => {
    const c = l.split('\t');
    return Object.fromEntries(columnas.map((k, i) => [k, (c[i] ?? '').trim()]));
  });
}

export function escribirTsv(rel, columnas, filas) {
  mkdirSync(dirname(ruta(rel)), { recursive: true });
  const cuerpo = filas.map((f) => columnas.map((k) => String(f[k] ?? '').replace(/[\t\n]/g, ' ')).join('\t'));
  writeFileSync(ruta(rel), [columnas.join('\t'), ...cuerpo].join('\n') + '\n');
}

export function agregarTsv(rel, columnas, fila) {
  const p = ruta(rel);
  mkdirSync(dirname(p), { recursive: true });
  if (!existsSync(p)) writeFileSync(p, columnas.join('\t') + '\n');
  appendFileSync(p, columnas.map((k) => String(fila[k] ?? '').replace(/[\t\n]/g, ' ')).join('\t') + '\n');
}

// ── Dependencias opcionales ───────────────────────────────────────────────

/**
 * nodemailer, imapflow y playwright son pesados y no todos los usan: quien
 * sólo quiere llevar registro de a quién le escribió no necesita instalarlos.
 * Por eso van como optionalDependencies y se importan recién cuando hacen falta.
 */
export async function opcional(nombre, paraQue) {
  try { return await import(nombre); } catch {
    console.error(`\nEsto necesita "${nombre}" (${paraQue}) y no está instalado.\n`);
    console.error(`  npm install ${nombre}\n`);
    process.exit(2);
  }
}

// ── Argumentos ────────────────────────────────────────────────────────────

/** `--flag valor` y `--flag` suelto. Devuelve {flags, sueltos}. */
export function parsearArgs(argv) {
  const flags = {};
  const sueltos = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { sueltos.push(argv[i]); continue; }
    const k = argv[i].slice(2);
    if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
    else flags[k] = true;
  }
  return { flags, sueltos };
}
