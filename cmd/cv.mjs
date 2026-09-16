/**
 * cv — revisar y generar el archivo que mandás.
 *
 * El error típico no es escribir un mal CV: es corregir un dato en uno y
 * olvidarse de los otros treinta. Después mandás el viejo sin darte cuenta.
 *
 * `cv revisar` abre TODOS los archivos de salida/ y falla si alguno se
 * desvía de las reglas que vos mismo escribiste en config/cv-rules.yml.
 * Las reglas son datos, no código: cada uno escribe las suyas.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { ruta, yo, cargarYml, opcional, corto } from '../lib/base.mjs';

const SALIDA = ruta('salida');
const ALTO_A4 = 1122.5;   // 297mm a 96dpi

const NAVEGADORES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/** Valores que se citan en las reglas, leídos del CV para no duplicarlos. */
function valores(cfg) {
  const p = ruta('cv.md');
  if (!existsSync(p) || !cfg.canonicos) return {};
  const cv = readFileSync(p, 'utf8');
  const out = {};
  for (const [k, patron] of Object.entries(cfg.canonicos)) {
    const m = cv.match(new RegExp(patron, 'i'));
    if (m) out[k] = m[1];
  }
  return out;
}

async function reglas() {
  const cfg = await cargarYml('config/cv-rules.yml');
  const vals = valores(cfg);
  const interp = (t) => String(t).replace(/\{\{(\w+)\}\}/g, (m, k) => vals[k] ?? m);
  return (cfg.reglas || []).map((r) => ({
    ...r,
    prohibido: r.prohibido ? new RegExp(interp(r.prohibido), 'i') : null,
    requerido: r.requerido ? new RegExp(interp(r.requerido), 'i') : null,
    soloSi: r.soloSi ? new RegExp(interp(r.soloSi), 'i') : null,
    porque: interp(r.porque || r.id),
  }));
}

export function normalizar(html) {
  return html
    .split('\u2014').join('-').split('\u2013').join('-')
    .split('\u2018').join("'").split('\u2019').join("'")
    .split('\u201C').join('"').split('\u201D').join('"');
}

const chequear = (html, rs) => rs.filter((r) => {
  if (r.soloSi && !r.soloSi.test(html)) return false;
  return r.prohibido ? r.prohibido.test(html) : r.requerido ? !r.requerido.test(html) : false;
});

function archivos() {
  if (!existsSync(SALIDA)) return [];
  return readdirSync(SALIDA).filter((f) => f.endsWith('.html')).sort();
}

async function revisar({ flags }) {
  const rs = await reglas();
  const lista = archivos();
  if (!lista.length) {
    console.log(`
No hay nada en salida/.

Poné ahí los HTML de tu CV (uno por versión) y volvé a correr esto.
El sistema no te arma el diseño: revisa que lo que mandás sea consistente.
`);
    return;
  }

  let graves = 0, leves = 0, arreglados = 0;
  const fallas = new Map();

  for (const a of lista) {
    const p = join(SALIDA, a);
    const html = readFileSync(p, 'utf8');
    const malas = chequear(html, rs);
    for (const r of malas) {
      if (r.grave) graves++; else leves++;
      if (!fallas.has(r.id)) fallas.set(r.id, { regla: r, archivos: [] });
      fallas.get(r.id).archivos.push(a);
    }
    if (flags.arreglar && malas.some((r) => r.arreglable)) {
      const nuevo = normalizar(html);
      if (nuevo !== html) { writeFileSync(p, nuevo); arreglados++; }
    }
  }

  console.log(`\nRevisados ${lista.length} archivo(s) en salida/\n`);
  if (!fallas.size) { console.log('Sin desvíos. Todo consistente.\n'); return; }

  for (const [id, { regla, archivos: af }] of fallas) {
    console.log(`${regla.grave ? 'GRAVE' : 'leve '}  ${id}  (${af.length})`);
    console.log(`        ${regla.porque}`);
    for (const a of af.slice(0, 8)) console.log(`        - ${a}`);
    if (af.length > 8) console.log(`        ... y ${af.length - 8} más`);
    console.log('');
  }
  if (flags.arreglar) console.log(`Normalizados ${arreglados}.`);
  else if ([...fallas.values()].some(({ regla }) => regla.arreglable)) {
    console.log('Parte se arregla solo:  node laburo.mjs cv revisar --arreglar');
  }
  console.log(`\n${graves} grave(s), ${leves} leve(s).\n`);
  process.exit(graves > 0 ? 1 : 0);
}

async function generar({ flags, sueltos }) {
  const base = sueltos[1];
  if (!base) {
    console.log(`
  cv generar <nombre> [--para "Empresa - Puesto"]

Toma salida/<nombre>.html y escribe el PDF.
Con --para, además deja una copia lista para adjuntar, con el nombre
que configuraste (y no el nombre interno del archivo).
`);
    return;
  }

  const cfg = await yo();
  const rs = await reglas();
  const p = join(SALIDA, base + '.html');
  if (!existsSync(p)) { console.error(`\nNo existe salida/${base}.html\n`); process.exit(2); }

  let html = readFileSync(p, 'utf8');
  const limpio = normalizar(html);
  if (limpio !== html) { writeFileSync(p, limpio); html = limpio; console.log('  normalizado'); }

  // Un archivo con un dato falso no debería poder llegar a PDF.
  const malas = chequear(html, rs).filter((r) => r.grave);
  if (malas.length) {
    console.error(`\nNo lo genero: ${malas.length} desvío(s) grave(s)`);
    for (const r of malas) console.error(`  - ${r.id}: ${r.porque}`);
    console.error('');
    process.exit(1);
  }

  const { chromium } = await opcional('playwright', 'generar PDF');
  const exe = NAVEGADORES.find((x) => existsSync(x));
  console.log(`\n  Usando ${exe ? basename(exe) : 'el navegador de Playwright'}`);

  // Sin Edge/Chrome del sistema, Playwright usa el suyo, que se baja aparte.
  // Es el tropiezo más probable en una máquina recién instalada (sobre todo
  // en Linux), y el error que tira solo es largo y poco claro.
  let browser;
  try {
    browser = await chromium.launch(exe ? { executablePath: exe } : {});
  } catch (e) {
    if (/Executable doesn't exist|playwright install/i.test(e.message)) {
      console.error(`
No encontré ningún navegador para armar el PDF.

Tenés dos opciones:

  1. Instalar Google Chrome o Microsoft Edge (lo más liviano si ya lo usás).
  2. Bajar el navegador de Playwright:

       npx playwright install chromium

El HTML ya está generado en salida/${base}.html: lo podés abrir en cualquier
navegador y usar "Imprimir → Guardar como PDF" mientras tanto.
`);
      process.exit(2);
    }
    throw e;
  }
  const page = await browser.newPage();
  await page.goto('file:///' + p.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });

  const alto = await page.evaluate(() => {
    const el = document.querySelector('.page') || document.body;
    return el.getBoundingClientRect().height;
  });
  const paginas = Math.ceil(alto / ALTO_A4);
  const max = cfg.entrega.max_paginas || 2;

  const destino = join(SALIDA, base + '.pdf');
  await page.pdf({ path: destino, format: 'A4', printBackground: true,
    margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' } });
  await browser.close();

  console.log(`  ${base}: ${paginas} página(s)${paginas > max ? '  ← DEMASIADO LARGO' : ''}`);
  if (paginas > max) {
    console.error(`\n  Recortá contenido: configuraste un máximo de ${max}.\n`);
    process.exit(1);
  }

  if (flags.para) {
    const carpeta = join(cfg.entrega.carpeta, flags.para);
    mkdirSync(carpeta, { recursive: true });
    const final = join(carpeta, cfg.entrega.nombre_archivo);
    writeFileSync(final, readFileSync(destino));
    console.log(`  para adjuntar: ${final}`);
  }
  console.log('');
}

/**
 * nuevo — de cv.md a un HTML con diseño.
 *
 * Sin esto, `cv revisar` y `cv generar` esperaban un HTML que nadie sabía de
 * dónde sacar. Para alguien que tiene su CV en Word era un callejón sin
 * salida. Ahora el camino es: escribís markdown, sale un PDF con diseño.
 */
async function nuevo({ flags, sueltos }) {
  const nombre = sueltos[1];
  if (!nombre) {
    console.log(`
  cv nuevo <nombre> [--plantilla <archivo>] [--desde <archivo.md>]

Toma tu cv.md, le aplica una plantilla y escribe salida/<nombre>.html.
Después lo revisás, lo ajustás a mano si querés, y lo pasás a PDF:

  node laburo.mjs cv nuevo mi-cv
  node laburo.mjs cv generar mi-cv --para "Empresa - Puesto"
`);
    return;
  }

  const { markdownAHtml } = await import('../lib/markdown.mjs');
  const cfg = await yo();
  const origen = flags.desde || ruta('cv.md');

  if (!existsSync(origen)) {
    console.error(`
No existe ${origen}

Escribí tu CV en cv.md, en markdown. Algo así:

  ## Perfil

  Dos o tres líneas sobre qué hacés y para quién.

  ## Experiencia

  ### Empresa — Puesto
  #### 2023 - actualidad

  - Algo que hiciste, con el resultado
  - Algo que hiciste, con la escala

  ## Formación

  ### Título — Institución (año)
`);
    process.exit(2);
  }

  const plantillaRuta = flags.plantilla || ruta('plantillas/cv/clasico.html');
  if (!existsSync(plantillaRuta)) { console.error(`\nNo existe ${plantillaRuta}\n`); process.exit(2); }

  let md = readFileSync(origen, 'utf8');
  // Si el markdown arranca con "# Nombre", eso ya va en el encabezado.
  md = md.replace(/^\s*#\s+.+\n/, '');

  const id = cfg.identidad;
  // Se arma acá y no en la plantilla para no dejar <span></span> de los
  // campos que la persona no cargó: en un flex con gap, cada vacío abre un
  // hueco visible en la línea de contacto.
  const datos = [id.ubicacion, id.email, id.telefono]
    .filter(Boolean)
    .map((x) => `<span>${x}</span>`)
    .concat((id.links || []).filter(Boolean).map((l) => {
      const url = /^https?:\/\//.test(l) ? l : `https://${l}`;
      return `<a href="${url}">${l}</a>`;
    }))
    .join('\n      ');

  const html = readFileSync(plantillaRuta, 'utf8')
    .replace(/\{\{contenido\}\}/g, markdownAHtml(md))
    .replace(/\{\{datos_html\}\}/g, '\n      ' + datos + '\n    ')
    .replace(/\{\{color\}\}/g, cfg.entrega?.color || '#1d4ed8')
    .replace(/\{\{(\w+)\}\}/g, (m, k) => id[k] ?? '');

  mkdirSync(SALIDA, { recursive: true });
  const destino = join(SALIDA, nombre + '.html');
  writeFileSync(destino, html);
  console.log(`\n  escrito: salida/${nombre}.html`);

  const rs = await reglas();
  const malas = chequear(html, rs);
  if (malas.length) {
    console.log(`\n  ${malas.length} cosa(s) para revisar:`);
    for (const r of malas) console.log(`    ${r.grave ? 'GRAVE' : 'leve '}  ${r.id}: ${r.porque}`);
  }
  console.log(`\n  Ahora:  node laburo.mjs cv generar ${nombre} --para "Empresa - Puesto"\n`);
}

export default async function cv(ctx) {
  const sub = ctx.sueltos[0];
  if (sub === 'nuevo') return nuevo(ctx);
  if (sub === 'revisar') return revisar(ctx);
  if (sub === 'generar') return generar(ctx);
  console.log(`
  cv nuevo <nombre>                de cv.md a un HTML con diseño
  cv revisar [--arreglar]          chequear TODOS los archivos de salida/
  cv generar <nombre> [--para X]   HTML a PDF, con la copia lista para adjuntar

Las reglas de revisión están en config/cv-rules.yml. Cada vez que corrijas un
dato en tu CV, agregá una regla para que no vuelva:

  - id: cargo-viejo
    grave: true
    prohibido: 'Analista Junior'
    porque: desde 2025 el cargo es Semi Senior
`);
}
