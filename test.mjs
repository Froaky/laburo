#!/usr/bin/env node
/**
 * test.mjs — prueba de humo.
 *
 * No busca cobertura: busca que nadie publique una versión donde un comando
 * explota. Arma una config de mentira en una carpeta aparte, corre todos los
 * comandos y limpia.
 *
 *   node test.mjs
 */

import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, cpSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const BOX = join(RAIZ, '.prueba');

let ok = 0, fallos = 0;

function correr(desc, args, opciones = {}) {
  try {
    const salida = execFileSync(process.execPath, [join(BOX, 'laburo.mjs'), ...args],
      { cwd: BOX, encoding: 'utf8', stdio: 'pipe' });
    if (opciones.contiene && !salida.includes(opciones.contiene)) {
      throw new Error(`no encontré "${opciones.contiene}" en la salida`);
    }
    console.log(`  ok    ${desc}`);
    ok++;
    return salida;
  } catch (e) {
    // Algunos comandos salen con código != 0 a propósito (doctor con fallas,
    // cv revisar con desvíos graves). Eso no es un error del test.
    const salida = (e.stdout || '') + (e.stderr || '');
    if (opciones.puedeFallar && (!opciones.contiene || salida.includes(opciones.contiene))) {
      console.log(`  ok    ${desc} (salió con código ${e.status}, esperado)`);
      ok++;
      return salida;
    }
    console.log(`  FALLA ${desc}`);
    console.log('        ' + (e.message || '').split('\n')[0]);
    if (salida.trim()) console.log('        ' + salida.trim().split('\n').slice(-3).join('\n        '));
    fallos++;
    return '';
  }
}

// ── armar la caja ─────────────────────────────────────────────────────────
rmSync(BOX, { recursive: true, force: true });
mkdirSync(BOX, { recursive: true });
for (const d of ['lib', 'cmd', 'perfiles', 'plantillas', 'node_modules']) {
  // node_modules puede no existir: el núcleo no lo necesita.
  if (existsSync(join(RAIZ, d))) cpSync(join(RAIZ, d), join(BOX, d), { recursive: true });
}
cpSync(join(RAIZ, 'laburo.mjs'), join(BOX, 'laburo.mjs'));
cpSync(join(RAIZ, '.gitignore'), join(BOX, '.gitignore'));
mkdirSync(join(BOX, 'config'), { recursive: true });
mkdirSync(join(BOX, 'data'), { recursive: true });
mkdirSync(join(BOX, 'salida'), { recursive: true });

writeFileSync(join(BOX, 'config/me.yml'), `perfil: generico
identidad:
  nombre: Ana Prueba Gutierrez
  firma: Ana Gutierrez
  titulo: Lic. en Comunicacion
  email: ana@ejemplo.test
  telefono: "+54 9 11 0000-0000"
  ubicacion: Argentina (GMT-3)
  links:
    - ejemplo.test/portfolio
entrega:
  carpeta: ${join(BOX, 'entrega').replace(/\\/g, '/')}
  nombre_archivo: CV ANA GUTIERREZ.pdf
  max_paginas: 2
mail:
  usuario: ana@ejemplo.test
  pausa_segundos: 0
  dias_silencio: 7
  evitar_recontacto: true
  verificar_dns: false
  personalizacion: medio
`);

writeFileSync(join(BOX, 'config/rates.yml'), `moneda: USD
por_cuenta_propia:
  tarifa_hora: 22
  piso_hora: 16
  modalidades: [Por hora, Por proyecto]
cotizados: []
`);

writeFileSync(join(BOX, 'config/cv-rules.yml'), `reglas:
  - id: guion-largo
    grave: false
    arreglable: true
    prohibido: '[–—]'
    porque: usar guion simple
  - id: cargo-viejo
    grave: true
    prohibido: 'Analista Junior'
    porque: desde 2025 el cargo es Semi Senior
canonicos: {}
`);

writeFileSync(join(BOX, 'salida/bien.html'), '<html><body><p>Analista Semi Senior</p></body></html>');
writeFileSync(join(BOX, 'salida/mal.html'), '<html><body><p>Analista Junior — 2024</p></body></html>');
writeFileSync(join(BOX, 'lista.txt'),
  'uno@ejemplo.test\tEstudio Uno\ndos@ejemplo.test\tAgencia Dos\n');

console.log('\nlaburo — prueba de humo\n');

// ── ayuda de cada comando ─────────────────────────────────────────────────
correr('ayuda general', [], { contiene: 'buscar trabajo con método' });
correr('ayuda de contactos', ['contactos', '--ayuda'], { contiene: 'numeros' });
correr('ayuda de mail', ['mail'], { contiene: '--confirmar' });
correr('ayuda de cv', ['cv'], { contiene: 'cv revisar' });
correr('ayuda de aprender', ['aprender'], { contiene: 'correccion' });

// ── contactos ─────────────────────────────────────────────────────────────
correr('importar lista', ['contactos', 'importar', '--archivo', 'lista.txt', '--grupo', 'agencias'],
  { contiene: 'Importados 2' });
correr('no duplica al reimportar', ['contactos', 'importar', '--archivo', 'lista.txt'],
  { contiene: 'repetidos: 2' });
correr('agregar uno', ['contactos', 'agregar', '--email', 'tres@ejemplo.test', '--empresa', 'Editorial Tres'],
  { contiene: 'Pendiente' });
correr('rechaza duplicado', ['contactos', 'agregar', '--email', 'tres@ejemplo.test'],
  { puedeFallar: true, contiene: 'Ya existe' });
correr('marcar respondió', ['contactos', 'marcar', 'uno@ejemplo.test', '--estado', 'Respondio',
  '--persona', 'Juan', '--accion', 'mandar presupuesto', '--en', '3'], { contiene: 'Respondio' });
correr('rechaza estado inválido', ['contactos', 'marcar', 'uno@ejemplo.test', '--estado', 'Cualquiera'],
  { puedeFallar: true, contiene: 'inválido' });
correr('pendientes', ['contactos'], { contiene: 'ABIERTAS' });
correr('listar', ['contactos', 'listar'], { contiene: 'contacto(s)' });
correr('numeros', ['contactos', 'numeros'], { contiene: 'Contactados' });

// ── aprender ──────────────────────────────────────────────────────────────
correr('anotar', ['aprender', 'Mi tarifa es 22 la hora', '--tipo', 'preferencia'],
  { contiene: 'preferencia' });
correr('ver memoria', ['aprender', 'ver'], { contiene: '22 la hora' });
correr('revisar con pocos datos', ['aprender', 'revisar'], { contiene: 'poco para mirar' });

// ── cv ────────────────────────────────────────────────────────────────────
correr('cv revisar detecta el grave', ['cv', 'revisar'],
  { puedeFallar: true, contiene: 'cargo-viejo' });
correr('cv revisar --arreglar', ['cv', 'revisar', '--arreglar'],
  { puedeFallar: true, contiene: 'Normalizados' });

// ── mail ──────────────────────────────────────────────────────────────────
const prueba = correr('mail probar no manda', ['mail', 'probar', '--plantilla',
  'plantillas/primer-contacto.md', '--lista', 'lista.txt'], { contiene: 'No se mandó nada' });
if (prueba.includes('Ana Gutierrez')) { console.log('  ok    interpola {{firma}}'); ok++; }
else { console.log('  FALLA no interpoló {{firma}}'); fallos++; }

correr('mail mandar sin --confirmar tampoco manda', ['mail', 'mandar', '--plantilla',
  'plantillas/primer-contacto.md', '--para', 'nuevo@ejemplo.test'], { contiene: 'No se mandó nada' });

correr('no recontacta a los ya enviados', ['mail', 'probar', '--plantilla',
  'plantillas/primer-contacto.md', '--para', 'uno@ejemplo.test'], { contiene: 'ya los contactaste' });

// ── hoy y doctor ──────────────────────────────────────────────────────────
correr('hoy', ['hoy'], { contiene: 'CONTACTOS' });
correr('doctor', ['doctor'], { puedeFallar: true, contiene: 'FUGAS DE DATOS' });

// ── personalización alta ──────────────────────────────────────────────────
const me = readFileSync(join(BOX, 'config/me.yml'), 'utf8');
writeFileSync(join(BOX, 'config/me.yml'), me.replace('personalizacion: medio', 'personalizacion: alto'));
writeFileSync(join(BOX, 'plantillas/molde.md'), 'Asunto: Hola\n---\nMismo texto para todos.\n{{firma}}\n');
correr('avisa si el perfil pide personalización alta', ['mail', 'probar',
  '--plantilla', 'plantillas/molde.md', '--para', 'cuatro@ejemplo.test'],
  { contiene: 'personalización ALTA' });

// ── postulaciones ─────────────────────────────────────────────────────────
correr('agregar postulación', ['postulaciones', 'agregar', '--empresa', 'Agencia Vera',
  '--puesto', 'Redactora', '--donde', 'LinkedIn', '--estado', 'Postulado'],
  { contiene: 'Te aviso el' });
correr('frena la postulación duplicada', ['postulaciones', 'agregar', '--empresa', 'agencia vera',
  '--puesto', 'REDACTORA'], { puedeFallar: true, contiene: 'se nota y resta' });
correr('cambiar de etapa recalcula el seguimiento', ['postulaciones', 'marcar', 'Agencia Vera',
  '--estado', 'Entrevista'], { contiene: 'seguir el' });
correr('estado de postulaciones', ['postulaciones'], { contiene: 'EN PROCESO' });
correr('números de postulaciones', ['postulaciones', 'numeros'], { contiene: 'Entrevistas' });

// ── entrevista ────────────────────────────────────────────────────────────
correr('ficha de entrevista', ['entrevista', 'ficha', 'Agencia Vera'], { contiene: 'Creada' });
correr('no pisa una ficha existente', ['entrevista', 'ficha', 'Agencia Vera'], { contiene: 'Ya existe' });
correr('agregar historia', ['entrevista', 'historias', 'La vez que rehice algo a último momento'],
  { contiene: 'Completala' });
correr('avisa si hay pocas historias', ['entrevista', 'historias'], { contiene: 'Con menos de 5' });

// ── cv: de markdown a HTML ────────────────────────────────────────────────
writeFileSync(join(BOX, 'cv.md'), `# Ana Prueba Gutierrez

## Perfil

Lic. en Comunicacion con experiencia en prensa. Portfolio en ejemplo.test/ana

## Experiencia

### Agencia Norte — Redactora
#### 2022 - actualidad

- Contenidos para **6 marcas**, con calendario propio.
`);
const nuevoCv = correr('cv nuevo desde markdown', ['cv', 'nuevo', 'mi-cv'], { contiene: 'escrito: salida' });
if (existsSync(join(BOX, 'salida/mi-cv.html'))) {
  const generado = readFileSync(join(BOX, 'salida/mi-cv.html'), 'utf8');
  const chequeos = [
    ['convierte títulos', generado.includes('<h2>Perfil</h2>')],
    ['convierte negrita', generado.includes('<strong>6 marcas</strong>')],
    ['convierte listas', generado.includes('<li>')],
    ['mete el nombre en el encabezado', generado.includes('<h1>Ana Prueba Gutierrez</h1>')],
    ['no repite el nombre en el cuerpo', (generado.match(/Ana Prueba Gutierrez/g) || []).length <= 2],
    ['no deja marcadores sin llenar', !/\{\{\w+\}\}/.test(generado)],
    ['no deja spans vacíos', !generado.includes('<span></span>')],
  ];
  for (const [desc, pasa] of chequeos) {
    if (pasa) { console.log(`  ok    ${desc}`); ok++; }
    else { console.log(`  FALLA ${desc}`); fallos++; }
  }
} else { console.log('  FALLA no generó el HTML'); fallos++; }

// ── cierre ────────────────────────────────────────────────────────────────
rmSync(BOX, { recursive: true, force: true });
console.log(`\n  ${ok} pasaron, ${fallos} fallaron\n`);
process.exit(fallos > 0 ? 1 : 0);
