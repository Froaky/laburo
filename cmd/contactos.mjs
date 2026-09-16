/**
 * contactos — a quién le escribiste, quién contestó, a quién le debés algo.
 *
 * Esto es el corazón del sistema. La mayoría de las oportunidades no se
 * pierden por no escribir: se pierden porque alguien contestó, pasaron cinco
 * días, y nadie volvió sobre eso.
 */

import { leerTsv, escribirTsv, hoy, dias, titulo, corto, yo, masDias } from '../lib/base.mjs';

const ARCHIVO = 'data/contactos.tsv';

export const COLS = ['fecha', 'empresa', 'persona', 'email', 'canal', 'grupo',
  'zona', 'estado', 'ultimo_contacto', 'proxima_accion', 'fecha_accion', 'notas', 'plantilla'];

export const ESTADOS = {
  Pendiente: 'en la lista, todavía no le escribiste',
  Enviado: 'le escribiste, sin respuesta',
  Rebotado: 'la dirección no existe',
  Respondio: 'contestó algo',
  Cotizado: 'le pasaste precio, esperando',
  Negociando: 'hay ida y vuelta sobre plata o alcance',
  Reunion: 'hay una llamada o entrevista agendada',
  Frio: 'pasaron los días, no contestó',
  Cerrado: 'terminó: saliste, o no salió',
};

const VIVOS = ['Respondio', 'Cotizado', 'Negociando', 'Reunion'];
const TERMINADOS = ['Frio', 'Cerrado', 'Rebotado'];
export const esVivo = (f) => VIVOS.includes(f.estado) || f.estado === 'Cerrado';

// Con pocos casos un porcentaje no dice nada: 2 de 6 parece 33% y sale por
// azar bastante seguido. Debajo de esto se muestra el número pero se avisa.
const MUESTRA_MINIMA = 15;

export const leer = () => leerTsv(ARCHIVO, COLS);
export const guardar = (filas) => {
  filas.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') ||
                       (a.empresa || '').localeCompare(b.empresa || ''));
  escribirTsv(ARCHIVO, COLS, filas);
};

// ── pendientes ────────────────────────────────────────────────────────────

async function pendientes() {
  const cfg = await yo();
  const silencio = cfg?.mail?.dias_silencio ?? 7;
  const filas = leer();

  if (filas.length === 0) {
    console.log(`
Todavía no hay contactos.

Agregá uno:
  node laburo.mjs contactos agregar --email hola@empresa.com --empresa "Empresa"

O importá una lista (un mail por línea, o "mail<TAB>empresa"):
  node laburo.mjs contactos importar --archivo mi-lista.txt
`);
    return;
  }

  const vencidas = filas.filter((f) => f.fecha_accion && f.fecha_accion <= hoy() && !TERMINADOS.includes(f.estado));
  const calientes = filas.filter((f) => VIVOS.includes(f.estado));
  const callados = filas.filter((f) => f.estado === 'Enviado' && (dias(f.ultimo_contacto || f.fecha) ?? 0) >= silencio);
  const rebotes = filas.filter((f) => f.estado === 'Rebotado');
  const sinEscribir = filas.filter((f) => f.estado === 'Pendiente');

  const bloque = (t, items, fmt) => {
    if (!items.length) return;
    titulo(`${t} (${items.length})`);
    for (const f of items) console.log('  ' + fmt(f));
  };

  bloque('VENCIDO — te comprometiste a esto y ya pasó la fecha', vencidas,
    (f) => `${f.fecha_accion}  ${corto(f.empresa, 24)} ${f.proxima_accion || '(sin acción escrita)'}`);

  bloque('ABIERTAS — contestaron, la pelota es tuya', calientes, (f) => {
    const d = dias(f.ultimo_contacto);
    const alerta = d !== null && d >= 5 ? '  ← enfriándose' : '';
    return `${corto(f.estado, 11)} ${corto(f.empresa, 24)} ${corto(f.persona || f.email, 26)}` +
           `${(d === null ? '' : `hace ${d}d`).padStart(8)}${alerta}`;
  });

  bloque(`SIN RESPUESTA hace ${silencio}+ días — insistir una vez o marcar Frio`, callados,
    (f) => `${String(dias(f.fecha)).padStart(3)}d  ${corto(f.empresa, 24)} ${f.email}`);

  bloque('REBOTARON — buscar otra dirección en el sitio de la empresa', rebotes,
    (f) => `${corto(f.empresa, 24)} ${f.email}`);

  if (sinEscribir.length) {
    titulo(`EN LA LISTA, SIN ESCRIBIR (${sinEscribir.length})`);
    console.log(`  node laburo.mjs mail probar --plantilla plantillas/primer-contacto.md`);
  }

  if (!vencidas.length && !calientes.length && !callados.length && !rebotes.length && !sinEscribir.length) {
    console.log('\nNada pendiente hoy.\n');
  }
  console.log('');
}

// ── agregar / importar ────────────────────────────────────────────────────

async function agregar({ flags }) {
  if (flags.ayuda || !flags.email) {
    console.log(`
Agregar un contacto:

  node laburo.mjs contactos agregar --email hola@empresa.com \\
      --empresa "Empresa SRL" --persona "Nombre" --grupo A --zona "Buenos Aires"

  --grupo  sirve para medir qué tipo de destinatario responde mejor
           (por ejemplo: A/B/C, o "agencia"/"pyme"/"estudio")
`);
    return;
  }
  const filas = leer();
  const email = String(flags.email).toLowerCase();
  if (filas.some((f) => f.email.toLowerCase() === email)) {
    console.error(`\nYa existe ${email}. Modificalo con "contactos marcar".\n`);
    process.exit(1);
  }
  filas.push({
    fecha: '', empresa: flags.empresa || email.split('@')[1], persona: flags.persona || '',
    email, canal: flags.canal || 'mail', grupo: flags.grupo || '', zona: flags.zona || '',
    estado: 'Pendiente', ultimo_contacto: '', proxima_accion: '', fecha_accion: '',
    notas: flags.notas || '', plantilla: '',
  });
  guardar(filas);
  console.log(`\nAgregado: ${flags.empresa || email} (${email}) — estado Pendiente\n`);
}

async function importar({ flags }) {
  if (!flags.archivo) {
    console.log(`
Importar una lista:

  node laburo.mjs contactos importar --archivo lista.txt [--grupo A]

Formato del archivo, una línea por contacto:
  hola@empresa.com
  hola@empresa.com<TAB>Empresa SRL
  hola@empresa.com<TAB>Empresa SRL<TAB>Nombre de la persona
`);
    return;
  }
  const { readFileSync } = await import('fs');
  const filas = leer();
  const existentes = new Set(filas.map((f) => f.email.toLowerCase()));
  let nuevos = 0, repetidos = 0;

  for (const linea of readFileSync(flags.archivo, 'utf8').split('\n')) {
    if (!linea.trim()) continue;
    const [e, empresa, persona] = linea.split('\t').map((s) => (s || '').trim());
    const email = (e.match(/[^\s,;<>]+@[^\s,;<>]+\.\w+/) || [])[0];
    if (!email) continue;
    if (existentes.has(email.toLowerCase())) { repetidos++; continue; }
    existentes.add(email.toLowerCase());
    filas.push({
      fecha: '', empresa: empresa || email.split('@')[1], persona: persona || '', email: email.toLowerCase(),
      canal: 'mail', grupo: flags.grupo || '', zona: '', estado: 'Pendiente',
      ultimo_contacto: '', proxima_accion: '', fecha_accion: '', notas: '', plantilla: '',
    });
    nuevos++;
  }
  guardar(filas);
  console.log(`\nImportados ${nuevos}. Salteados por repetidos: ${repetidos}. Total: ${filas.length}.\n`);
}

// ── marcar ────────────────────────────────────────────────────────────────

async function marcar({ flags, sueltos }) {
  const email = (sueltos[0] || flags.email || '').toLowerCase();
  if (!email) {
    console.log(`
Actualizar un contacto:

  node laburo.mjs contactos marcar hola@empresa.com --estado Respondio --persona "Nombre"
  node laburo.mjs contactos marcar hola@empresa.com --accion "mandar presupuesto" --en 3

Estados posibles:`);
    for (const [e, d] of Object.entries(ESTADOS)) console.log(`  ${e.padEnd(11)} ${d}`);
    console.log('');
    return;
  }
  const filas = leer();
  const f = filas.find((x) => x.email.toLowerCase() === email);
  if (!f) { console.error(`\nNo existe ${email}.\n`); process.exit(1); }

  if (flags.estado) {
    if (!ESTADOS[flags.estado]) {
      console.error(`\nEstado inválido: ${flags.estado}\nVálidos: ${Object.keys(ESTADOS).join(', ')}\n`);
      process.exit(1);
    }
    f.estado = flags.estado;
  }
  for (const k of ['persona', 'empresa', 'grupo', 'zona', 'notas']) if (flags[k]) f[k] = flags[k];
  if (flags.accion) f.proxima_accion = flags.accion;
  // `--en 3` es más cómodo que calcular la fecha a mano, que es justamente
  // la fricción por la que la gente no anota el seguimiento.
  if (flags.en) f.fecha_accion = masDias(Number(flags.en));
  if (flags.fecha) f.fecha_accion = flags.fecha;
  f.ultimo_contacto = flags.ultimo || hoy();

  guardar(filas);
  console.log(`\n${f.empresa} → ${f.estado}` +
    (f.proxima_accion ? ` | ${f.proxima_accion} el ${f.fecha_accion || 'sin fecha'}` : '') + '\n');
}

// ── números ───────────────────────────────────────────────────────────────

function numeros() {
  const filas = leer().filter((f) => f.estado !== 'Pendiente');
  if (!filas.length) { console.log('\nTodavía no mandaste nada.\n'); return; }

  const resp = filas.filter(esVivo).length;
  titulo('NÚMEROS');
  console.log(`  Contactados:  ${filas.length}`);
  console.log(`  Contestaron:  ${resp}  (${(resp / filas.length * 100).toFixed(1)}%)`);
  console.log(`  Rebotaron:    ${filas.filter((f) => f.estado === 'Rebotado').length}`);

  let hayChica = false;
  for (const [etiqueta, clave] of [['POR GRUPO', 'grupo'], ['POR ZONA', 'zona'],
                                   ['POR TANDA', 'fecha'], ['POR PLANTILLA', 'plantilla']]) {
    const g = new Map();
    for (const f of filas) {
      const k = f[clave] || '(sin dato)';
      if (!g.has(k)) g.set(k, { t: 0, r: 0 });
      g.get(k).t++;
      if (esVivo(f)) g.get(k).r++;
    }
    if (g.size <= 1 && g.has('(sin dato)')) continue;
    titulo(etiqueta);
    for (const [k, v] of [...g].sort((a, b) => b[1].t - a[1].t)) {
      const chica = v.t < MUESTRA_MINIMA;
      if (chica) hayChica = true;
      console.log(`  ${corto(k, 22)} ${String(v.r).padStart(3)}/${String(v.t).padStart(3)}` +
                  ` ${(v.r / v.t * 100).toFixed(0).padStart(4)}%${chica ? '   (muestra chica)' : ''}`);
    }
  }
  if (hayChica) {
    console.log(`\n  Las filas marcadas tienen menos de ${MUESTRA_MINIMA} casos: ese porcentaje es ruido.`);
    console.log('  Sirve para decidir a quién escribirle primero, no para descartar un grupo.');
  }
  console.log('');
}

function listar({ sueltos }) {
  const filtro = sueltos[0];
  const filas = leer().filter((f) => !filtro || f.estado.toLowerCase() === filtro.toLowerCase());
  if (!filas.length) { console.log('\nSin resultados.\n'); return; }
  console.log('');
  for (const f of filas) {
    console.log(`${(f.fecha || '          ')}  ${corto(f.estado, 11)} ${corto(f.empresa, 26)} ${corto(f.email, 32)} ${f.notas}`);
  }
  console.log(`\n${filas.length} contacto(s).\n`);
}

// ── dispatcher ────────────────────────────────────────────────────────────

const SUB = {
  pendientes, agregar, importar, marcar, numeros, listar,
  '': pendientes,
};

export default async function contactos(ctx) {
  const sub = ctx.sueltos[0] && SUB[ctx.sueltos[0]] ? ctx.sueltos.shift() : '';
  if (ctx.flags.ayuda && !sub) {
    console.log(`
  contactos                  lo pendiente (por defecto)
  contactos agregar          sumar uno
  contactos importar         sumar una lista
  contactos marcar <email>   cambiar estado, anotar próxima acción
  contactos listar [estado]  ver todos
  contactos numeros          tasa de respuesta por grupo, zona, tanda, plantilla
`);
    return;
  }
  await SUB[sub](ctx);
}
