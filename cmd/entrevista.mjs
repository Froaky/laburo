/**
 * entrevista — preparación, y el banco de historias.
 *
 * Todo el resto del sistema existe para conseguir que alguien te conteste.
 * Cuando eso pasa, viene la parte donde la mayoría improvisa.
 *
 * Dos cosas concretas:
 *
 *   ficha      una hoja por empresa, con las preguntas que SÍ hay que hacer
 *              y el espacio para lo que averiguaste
 *   historias  un banco de situaciones tuyas, escritas una vez y reusadas
 *
 * Lo de las historias es lo que más rinde. En una entrevista te van a pedir
 * "contame una vez que..." cuatro o cinco veces. Tener seis historias
 * escritas —con el problema, lo que hiciste y cómo terminó— es la diferencia
 * entre contestar y acordarte a medias de algo.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { ruta, yo, hoy, titulo, corto, cargarYml } from '../lib/base.mjs';

const CARPETA = ruta('data/entrevistas');
const HISTORIAS = ruta('data/historias.md');

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Preguntas que le sirven a cualquiera, en cualquier rubro. */
const PREGUNTAS_BASE = [
  '¿Por qué está abierto el puesto? ¿Es nuevo o reemplaza a alguien?',
  '¿Cómo se ve el éxito en los primeros tres meses?',
  '¿Con quién voy a trabajar día a día, y quién decide?',
  '¿Cuál es el problema más molesto que tiene hoy el equipo?',
  '¿Cuáles son los pasos que siguen y en qué plazo?',
];

const PREGUNTAS_PLATA = [
  '¿Cuál es el rango previsto para el puesto?',
  '¿Cómo se ajusta, y cada cuánto?',
  '¿Qué forma de contratación es? (relación de dependencia, factura, otra)',
];

async function ficha({ flags, sueltos }) {
  const empresa = sueltos.slice(1).join(' ').trim() || flags.empresa;
  if (!empresa) {
    console.log(`
  entrevista ficha "Nombre de la empresa" [--puesto "Puesto"]

Crea data/entrevistas/<empresa>.md con la estructura para prepararte:
qué averiguaste, qué vas a contar, y qué preguntar vos.
`);
    return;
  }

  mkdirSync(CARPETA, { recursive: true });
  const archivo = join(CARPETA, slug(empresa) + '.md');
  if (existsSync(archivo)) {
    console.log(`\nYa existe: data/entrevistas/${slug(empresa)}.md\n`);
    console.log(readFileSync(archivo, 'utf8').split('\n').slice(0, 12).join('\n'));
    return;
  }

  const cfg = await yo();
  const perfilNombre = cfg.perfil || 'generico';
  const perfil = await cargarYml(`perfiles/${perfilNombre}.yml`, false);

  writeFileSync(archivo, `# ${empresa}${flags.puesto ? ` — ${flags.puesto}` : ''}

_Ficha creada el ${hoy()}_

## Qué hacen

[Dos o tres líneas, en tus palabras. Si no podés explicar a qué se dedican,
todavía no estás listo para la entrevista.]

- Sitio:
- Tamaño aproximado:
- Con quién hablo (nombre y rol):

## Por qué me interesa a mí

[Una razón honesta y concreta. "Es una gran empresa" no es una razón.
Si no encontrás ninguna, eso también es información.]

## Qué voy a contar

Elegí 3 historias del banco (\`node laburo.mjs entrevista historias\`) que
peguen con lo que pide este puesto:

1.
2.
3.

## Lo que me van a preguntar y no tengo resuelto

[Sé honesto acá. El hueco que estás evitando mirar es justo el que te van a
tocar. Escribí cómo lo vas a contestar, sin inventar.]

-

## Lo que pregunto yo

${PREGUNTAS_BASE.map((p) => `- [ ] ${p}`).join('\n')}

### Sobre plata (si llega el momento)

${PREGUNTAS_PLATA.map((p) => `- [ ] ${p}`).join('\n')}

Tu número está en \`config/rates.yml\`. **No lo improvises en la llamada.**
${perfil?.nota ? `\n## Del rubro\n\n${perfil.nota.trim()}\n` : ''}
## Después de la entrevista

[Anotalo el mismo día, mientras te acordás.]

- Qué salió bien:
- Qué me trabó:
- Qué quedó pendiente de mi lado:
- Qué dijeron sobre los próximos pasos:
`);

  console.log(`\nCreada: data/entrevistas/${slug(empresa)}.md`);
  console.log('\nCompletala ANTES de la entrevista. La parte de "lo que no tengo');
  console.log('resuelto" es la que más sirve y la que todos saltean.\n');
}

function historias({ flags, sueltos }) {
  const texto = sueltos.slice(1).join(' ').trim();

  if (!existsSync(HISTORIAS)) {
    mkdirSync(ruta('data'), { recursive: true });
    writeFileSync(HISTORIAS, `# Banco de historias

En una entrevista te van a decir "contame una vez que..." varias veces.
Tener seis historias escritas es la diferencia entre contestar bien y
acordarte a medias de algo.

Cada una con cuatro partes:

- **Situación**: dónde estabas y qué pasaba
- **Qué hiciste vos** (vos, no "el equipo")
- **Cómo terminó**, con un número si lo hay
- **Qué aprendiste**

Tratá de cubrir: un problema difícil, un conflicto con alguien, un error
tuyo, algo que mejoraste por iniciativa propia, y algo de lo que estés
orgulloso.

---
`);
  }

  if (!texto) {
    const contenido = readFileSync(HISTORIAS, 'utf8');
    const cuantas = (contenido.match(/^## /gm) || []).length;
    console.log('\n' + contenido);
    if (cuantas < 5) {
      console.log(`\n  Tenés ${cuantas}. Con menos de 5 vas a repetir la misma en toda la entrevista.`);
      console.log('  Agregá una:  node laburo.mjs entrevista historias "Título de la historia"\n');
    }
    return;
  }

  const bloque = `\n## ${texto}\n
**Situación:**

**Qué hice:**

**Cómo terminó:**

**Qué aprendí:**

`;
  writeFileSync(HISTORIAS, readFileSync(HISTORIAS, 'utf8') + bloque);
  console.log(`\nAgregada "${texto}" a data/historias.md. Completala ahí.\n`);
}

function listar() {
  if (!existsSync(CARPETA)) { console.log('\nNo hay fichas todavía.\n'); return; }
  const fichas = readdirSync(CARPETA).filter((f) => f.endsWith('.md'));
  if (!fichas.length) { console.log('\nNo hay fichas todavía.\n'); return; }
  titulo('FICHAS DE ENTREVISTA');
  for (const f of fichas) {
    const contenido = readFileSync(join(CARPETA, f), 'utf8');
    const titulo1 = (contenido.match(/^# (.+)$/m) || [])[1] || f;
    const sinCompletar = (contenido.match(/^\[/gm) || []).length;
    console.log(`  ${corto(titulo1, 40)} ${sinCompletar ? `${sinCompletar} sección(es) sin completar` : 'completa'}`);
  }
  console.log('');
}

export default async function entrevista(ctx) {
  const sub = ctx.sueltos[0];
  if (sub === 'ficha') return ficha(ctx);
  if (sub === 'historias') return historias(ctx);
  if (sub === 'listar') return listar(ctx);
  console.log(`
  entrevista ficha "Empresa"     armar la hoja de preparación
  entrevista historias           ver el banco de historias
  entrevista historias "Título"  agregar una
  entrevista listar              qué fichas tenés y cuáles están a medias
`);
}
