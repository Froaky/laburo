/**
 * doctor — chequeo de salud, con foco en no filtrar datos.
 *
 * Si publicás este repo con los archivos personales adentro, estás publicando
 * los mails de tus contactos, tus tarifas y, en el peor caso, la clave de tu
 * casilla. Eso no se arregla borrando el commit: una vez que está en un
 * remoto público, está.
 *
 * Correr antes del primer push, y cada vez que agregues algo nuevo a data/.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { ruta, titulo } from '../lib/base.mjs';

const SENSIBLES = [
  ['.env.local', 'la clave de tu casilla'],
  ['config/me.yml', 'tu teléfono y direcciones'],
  ['config/rates.yml', 'tus tarifas'],
  ['data/contactos.tsv', 'los mails de tus contactos'],
  ['data/enviados.tsv', 'qué le mandaste a cada uno'],
  ['data/aprendido.md', 'todo lo que el sistema sabe de vos'],
  ['data/agenda.tsv', 'tus compromisos'],
  ['data/postulaciones.tsv', 'a qué avisos te postulaste'],
  ['data/historias.md', 'tus historias personales'],
  ['data/entrevistas', 'tus fichas de entrevista'],
  ['cv.md', 'tu CV'],
];

let errores = 0, avisos = 0;
const mal = (m, d) => { errores++; console.log(`  FALLA   ${m}`); if (d) console.log(`          ${d}`); };
const ojo = (m, d) => { avisos++; console.log(`  aviso   ${m}`); if (d) console.log(`          ${d}`); };
const ok = (m) => console.log(`  ok      ${m}`);

function trackeado(rel) {
  try { execSync(`git ls-files --error-unmatch "${rel}"`, { cwd: ruta('.'), stdio: 'pipe' }); return true; }
  catch { return false; }
}

export default async function doctor() {
  const hayGit = existsSync(ruta('.git'));

  titulo('FUGAS DE DATOS');
  if (!hayGit) {
    ojo('todavía no es un repo git', 'cuando lo publiques, volvé a correr esto');
  }
  let algunoPresente = false;
  for (const [rel, que] of SENSIBLES) {
    if (!existsSync(ruta(rel))) continue;
    algunoPresente = true;
    if (hayGit && trackeado(rel)) {
      mal(`${rel} ESTÁ TRACKEADO EN GIT`,
        `contiene ${que}. Sacalo ya:  git rm --cached "${rel}"`);
    } else ok(`${rel} fuera de git`);
  }
  if (!algunoPresente) ok('todavía no hay archivos personales');

  const gi = existsSync(ruta('.gitignore')) ? readFileSync(ruta('.gitignore'), 'utf8') : '';
  for (const [rel] of SENSIBLES) {
    if (!existsSync(ruta(rel))) continue;
    const cubierto = gi.includes(rel) ||
      (rel.startsWith('config/') && gi.includes('config/*')) ||
      (rel.startsWith('data/') && gi.includes('data/*'));
    if (!cubierto) ojo(`${rel} no está cubierto por .gitignore`);
  }

  titulo('CONFIGURACIÓN');
  for (const [rel, obligatorio] of [['config/me.yml', true], ['config/cv-rules.yml', false],
                                    ['config/rates.yml', false], ['cv.md', false]]) {
    if (existsSync(ruta(rel))) ok(rel);
    else if (obligatorio) mal(`falta ${rel}`, 'corré:  node laburo.mjs setup');
    else ojo(`falta ${rel}`, 'opcional, pero conviene tenerlo');
  }

  titulo('DEPENDENCIAS');
  const tiene = (d) => existsSync(ruta('node_modules', d));
  ok('el núcleo no necesita ninguna dependencia');
  for (const [d, para] of [['nodemailer', 'mandar mails'], ['imapflow', 'leer respuestas'],
                           ['playwright', 'generar PDF']]) {
    if (tiene(d)) ok(`${d}`);
    else ojo(`falta ${d}`, `sólo hace falta para ${para}:  npm install ${d}`);
  }

  titulo('DATOS');
  const cont = ruta('data/contactos.tsv');
  if (existsSync(cont)) {
    const n = readFileSync(cont, 'utf8').split('\n').filter((l) => l.trim()).length - 1;
    ok(`${n} contacto(s) cargados`);
  } else ojo('todavía no hay contactos', 'node laburo.mjs contactos agregar --ayuda');

  console.log(`\n  ${errores} falla(s), ${avisos} aviso(s).\n`);
  if (errores) console.log('  Arreglá las FALLAS antes de publicar el repo.\n');
  process.exit(errores > 0 ? 1 : 0);
}
