/**
 * aprender — la memoria del sistema.
 *
 * Acá está la diferencia entre una herramienta y algo que mejora con el uso.
 *
 * No es magia ni entrenamiento de modelos: es que TODO lo que se descubre
 * queda escrito en un solo archivo (data/aprendido.md) que se lee antes de
 * cualquier cosa. Tres fuentes lo alimentan:
 *
 *   1. Correcciones. Cada vez que le corregís algo a quien te ayuda —una
 *      persona o una IA— eso se anota. Si no, se lo vas a tener que corregir
 *      la semana que viene otra vez.
 *   2. Hechos. Los datos tuyos que ya verificaste una vez y no querés volver
 *      a chequear ni a equivocar.
 *   3. Resultados medidos. `aprender revisar` mira tus contactos reales y
 *      propone conclusiones, con una advertencia cuando la muestra es chica.
 *
 * Una IA que trabaje con este repo tiene que leer data/aprendido.md primero
 * y escribir acá después de cada corrección. Está en AGENTS.md.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { ruta, hoy, dias, titulo, corto } from '../lib/base.mjs';
import { leer as leerContactos, esVivo } from './contactos.mjs';

const ARCHIVO = ruta('data/aprendido.md');

const TIPOS = {
  correccion: 'algo que estaba mal y hubo que corregir',
  preferencia: 'cómo querés que se hagan las cosas',
  hecho: 'un dato tuyo verificado, para no volver a chequearlo',
  leccion: 'algo que se aprendió de los resultados',
  perfil: 'quién sos y qué buscás',
};

function asegurar() {
  if (existsSync(ARCHIVO)) return;
  mkdirSync(ruta('data'), { recursive: true });
  writeFileSync(ARCHIVO, `# Lo que sabemos

Este archivo crece solo. Es lo primero que debería leer cualquiera —persona
o IA— antes de ayudarte a buscar trabajo.

Agregá cosas con:  node laburo.mjs aprender "lo que sea"

---
`);
}

function anotar(texto, tipo = 'hecho', fuente = '') {
  asegurar();
  const entrada = `\n## ${hoy()} · ${tipo}\n\n${texto.trim()}\n` +
    (fuente ? `\n_Fuente: ${fuente}_\n` : '');
  appendFileSync(ARCHIVO, entrada);
  return entrada;
}

// ── ver ───────────────────────────────────────────────────────────────────

function ver({ flags }) {
  asegurar();
  const texto = readFileSync(ARCHIVO, 'utf8');
  if (flags.tipo) {
    const bloques = texto.split(/\n(?=## )/).filter((b) => b.includes(`· ${flags.tipo}`));
    console.log(bloques.length ? '\n' + bloques.join('\n') : `\nNada de tipo "${flags.tipo}".\n`);
    return;
  }
  console.log('\n' + texto);
}

// ── revisar: aprender de los resultados ───────────────────────────────────

/**
 * Mira los contactos reales y saca conclusiones. Cada una viene con su
 * evidencia y con una advertencia si la muestra no alcanza.
 *
 * El objetivo NO es que el sistema decida por vos: es que no tengas que
 * acordarte de mirar, y que cuando mires no leas ruido como si fuera señal.
 */
function revisar({ flags }) {
  const filas = leerContactos().filter((f) => f.estado !== 'Pendiente');
  if (filas.length < 5) {
    console.log(`\nTodavía hay poco para mirar (${filas.length} contactados).`);
    console.log('Volvé a correr esto cuando lleves 20 o 30.\n');
    return;
  }

  const observaciones = [];
  const total = filas.length;
  const respondieron = filas.filter(esVivo);
  const tasa = respondieron.length / total;

  observaciones.push({
    texto: `Tasa de respuesta general: ${respondieron.length} de ${total} (${(tasa * 100).toFixed(1)}%).`,
    solido: total >= 30,
  });

  // ¿Cuánto tardan en contestar? Define cuántos días esperar antes de insistir.
  const demoras = respondieron
    .map((f) => (dias(f.fecha) ?? 0) - (dias(f.ultimo_contacto) ?? 0))
    .filter((d) => d >= 0);
  if (demoras.length >= 3) {
    const ordenadas = [...demoras].sort((a, b) => a - b);
    const mediana = ordenadas[Math.floor(ordenadas.length / 2)];
    const rapidas = demoras.filter((d) => d <= 1).length;
    observaciones.push({
      texto: `Los que contestan lo hacen rápido: mediana de ${mediana} día(s), ` +
             `y ${rapidas} de ${demoras.length} contestaron dentro de las 24 horas. ` +
             `Si pasaron más de ${Math.max(5, mediana * 4)} días, probablemente no conteste.`,
      solido: demoras.length >= 8,
    });
  }

  // Comparaciones por dimensión: sólo se reportan si hay diferencia real.
  for (const [etiqueta, clave] of [['grupo', 'grupo'], ['zona', 'zona'], ['plantilla', 'plantilla']]) {
    const g = new Map();
    for (const f of filas) {
      const k = f[clave];
      if (!k) continue;
      if (!g.has(k)) g.set(k, { t: 0, r: 0 });
      g.get(k).t++;
      if (esVivo(f)) g.get(k).r++;
    }
    const conDatos = [...g].filter(([, v]) => v.t >= 10);
    if (conDatos.length < 2) continue;

    conDatos.sort((a, b) => (b[1].r / b[1].t) - (a[1].r / a[1].t));
    const [mejorK, mejor] = conDatos[0];
    const [peorK, peor] = conDatos[conDatos.length - 1];
    const dif = (mejor.r / mejor.t) - (peor.r / peor.t);
    if (dif < 0.05) continue;

    observaciones.push({
      texto: `Por ${etiqueta}: "${mejorK}" responde ${(mejor.r / mejor.t * 100).toFixed(0)}% ` +
             `(${mejor.r}/${mejor.t}) contra ${(peor.r / peor.t * 100).toFixed(0)}% ` +
             `(${peor.r}/${peor.t}) de "${peorK}". Conviene priorizar "${mejorK}".`,
      solido: mejor.t >= 25 && peor.t >= 25,
    });
  }

  // Lo que más duele y nadie mira: conversaciones abiertas abandonadas.
  const abandonadas = filas.filter((f) =>
    ['Respondio', 'Cotizado', 'Negociando'].includes(f.estado) && (dias(f.ultimo_contacto) ?? 0) >= 7);
  if (abandonadas.length) {
    observaciones.push({
      texto: `Hay ${abandonadas.length} conversación(es) abiertas sin tocar hace más de una semana: ` +
             abandonadas.map((f) => f.empresa).join(', ') +
             '. Conseguir que alguien conteste cuesta mucho más que contestarle.',
      solido: true,
      urgente: true,
    });
  }

  const rebotes = filas.filter((f) => f.estado === 'Rebotado');
  if (rebotes.length / total > 0.05) {
    observaciones.push({
      texto: `Rebotó el ${(rebotes.length / total * 100).toFixed(0)}% de los envíos. ` +
             'Más del 5% empieza a ensuciar la reputación de tu casilla: conviene ' +
             'verificar las direcciones antes de mandar.',
      solido: total >= 30,
    });
  }

  titulo('LO QUE DICEN TUS DATOS');
  observaciones.forEach((o, i) => {
    console.log(`\n  ${i + 1}. ${o.urgente ? '⚠ ' : ''}${o.texto}`);
    if (!o.solido) console.log('     (muestra chica: tomalo como pista, no como conclusión)');
  });

  console.log('');
  if (flags.guardar) {
    for (const o of observaciones.filter((x) => x.solido)) {
      anotar(o.texto, 'leccion', `medido sobre ${total} contactos`);
    }
    console.log(`  Guardadas ${observaciones.filter((o) => o.solido).length} lección(es) en data/aprendido.md\n`);
  } else {
    console.log('  Para guardar las conclusiones sólidas:  node laburo.mjs aprender revisar --guardar\n');
  }
}

// ── dispatcher ────────────────────────────────────────────────────────────

export default async function aprender(ctx) {
  const { flags, sueltos } = ctx;

  if (sueltos[0] === 'ver') return ver(ctx);
  if (sueltos[0] === 'revisar') return revisar(ctx);

  const texto = sueltos.join(' ').trim();
  if (!texto) {
    console.log(`
  aprender "texto"              anotar algo
  aprender "texto" --tipo X     anotar con tipo
  aprender ver [--tipo X]       leer todo lo anotado
  aprender revisar [--guardar]  sacar conclusiones de tus resultados

Tipos:`);
    for (const [t, d] of Object.entries(TIPOS)) console.log(`  ${t.padEnd(12)} ${d}`);
    console.log(`
Ejemplos:

  node laburo.mjs aprender "Mi tarifa es 25 la hora, no la bajo por volumen chico" --tipo preferencia
  node laburo.mjs aprender "Terminé la carrera en 2027, no en 2026" --tipo correccion
  node laburo.mjs aprender revisar --guardar
`);
    return;
  }

  const tipo = flags.tipo && TIPOS[flags.tipo] ? flags.tipo : 'hecho';
  anotar(texto, tipo, flags.fuente || '');
  console.log(`\nAnotado como "${tipo}" en data/aprendido.md\n`);
}
