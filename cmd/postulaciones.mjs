/**
 * postulaciones — los avisos a los que te postulaste.
 *
 * Es un flujo distinto del de `contactos` y por eso vive aparte:
 *
 *   contactos      vos escribís primero, en frío, sin que haya un puesto abierto
 *   postulaciones  hay un aviso publicado y competís con otra gente
 *
 * Mezclarlos arruina los números: la tasa de respuesta de un mail en frío y
 * la de una postulación a un aviso no se comparan, y promediarlas no dice nada.
 *
 * Lo que este comando agrega sobre anotar en una planilla:
 *
 *   - Te avisa cuándo toca seguir, con una cadencia razonable en vez de
 *     que te acuerdes vos.
 *   - Te frena si te estás postulando dos veces a lo mismo.
 *   - Guarda POR QUÉ te postulaste, que a los dos meses no te acordás.
 */

import { leerTsv, escribirTsv, hoy, dias, masDias, titulo, corto } from '../lib/base.mjs';

const ARCHIVO = 'data/postulaciones.tsv';

const COLS = ['fecha', 'empresa', 'puesto', 'donde', 'link', 'estado',
  'ultimo_movimiento', 'proxima_accion', 'fecha_accion', 'porque', 'notas'];

export const ESTADOS = {
  Mirando: 'la viste, todavía no te postulaste',
  Postulado: 'mandaste la postulación',
  Respondieron: 'contestaron algo',
  Entrevista: 'hay entrevista agendada o en curso',
  Prueba: 'te pidieron un ejercicio o examen',
  Oferta: 'te hicieron una oferta',
  Rechazado: 'te dijeron que no',
  Abandonado: 'la dejaste vos',
};

const VIVOS = ['Respondieron', 'Entrevista', 'Prueba', 'Oferta'];
const CERRADOS = ['Rechazado', 'Abandonado'];

/**
 * Cuándo conviene volver a tocar, según en qué etapa está.
 *
 * Los plazos no son antojo: insistir antes de tiempo resta, y dejar pasar
 * dos semanas después de una entrevista te borra de la lista. El número
 * grande en "Postulado" es porque los procesos por aviso son lentos y
 * escribir a los tres días te hace ver ansioso.
 */
const CADENCIA = { Postulado: 10, Respondieron: 4, Entrevista: 6, Prueba: 5, Oferta: 2 };

const leer = () => leerTsv(ARCHIVO, COLS);
const guardar = (f) => {
  f.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  escribirTsv(ARCHIVO, COLS, f);
};

/** Sugiere la fecha del próximo movimiento si la persona no puso una. */
const sugerirFecha = (estado, desde) => {
  const d = CADENCIA[estado];
  return d ? masDias(d, desde || hoy()) : '';
};

function estado({ flags }) {
  const filas = leer();
  if (!filas.length) {
    console.log(`
Todavía no anotaste ninguna postulación.

  node laburo.mjs postulaciones agregar --empresa "Empresa" --puesto "Puesto" \\
      --donde LinkedIn --porque "por qué te interesa"
`);
    return;
  }

  const vivas = filas.filter((f) => VIVOS.includes(f.estado));
  const esperando = filas.filter((f) => f.estado === 'Postulado');
  const vencidas = filas.filter((f) => f.fecha_accion && f.fecha_accion <= hoy() && !CERRADOS.includes(f.estado));
  const mirando = filas.filter((f) => f.estado === 'Mirando');

  const bloque = (t, items, fmt) => {
    if (!items.length) return;
    titulo(`${t} (${items.length})`);
    for (const f of items) console.log('  ' + fmt(f));
  };

  bloque('TOCA MOVER', vencidas, (f) =>
    `${f.fecha_accion}  ${corto(f.empresa, 22)} ${corto(f.puesto, 26)} ${f.proxima_accion || '(sin acción escrita)'}`);

  bloque('EN PROCESO', vivas, (f) =>
    `${corto(f.estado, 13)} ${corto(f.empresa, 22)} ${corto(f.puesto, 28)} hace ${dias(f.ultimo_movimiento)}d`);

  bloque('POSTULADO, SIN NOTICIAS', esperando, (f) => {
    const d = dias(f.fecha);
    return `${String(d).padStart(3)}d  ${corto(f.empresa, 22)} ${corto(f.puesto, 30)}` +
           (d >= 21 ? '  ← a esta altura ya es un no' : '');
  });

  bloque('MIRANDO, SIN POSTULARTE', mirando, (f) =>
    `${corto(f.empresa, 22)} ${corto(f.puesto, 30)} ${f.porque}`);

  if (!vencidas.length && !vivas.length && !esperando.length && !mirando.length) {
    console.log('\nNada pendiente en postulaciones.\n');
  }
  console.log('');
}

function agregar({ flags }) {
  if (!flags.empresa || !flags.puesto) {
    console.log(`
  postulaciones agregar --empresa "X" --puesto "Y" [opciones]

  --donde     LinkedIn, Computrabajo, la web de la empresa, un contacto...
  --link      URL del aviso
  --porque    por qué te interesa (a los dos meses no te vas a acordar)
  --estado    Mirando (por defecto) o Postulado
`);
    return;
  }
  const filas = leer();
  const dup = filas.find((f) =>
    f.empresa.toLowerCase() === String(flags.empresa).toLowerCase() &&
    f.puesto.toLowerCase() === String(flags.puesto).toLowerCase());
  if (dup) {
    console.error(`\nYa lo tenés anotado: ${dup.empresa} — ${dup.puesto} (${dup.estado}, ${dup.fecha || 'sin fecha'})`);
    console.error('Postularse dos veces al mismo aviso se nota y resta.\n');
    process.exit(1);
  }

  const est = flags.estado && ESTADOS[flags.estado] ? flags.estado : 'Mirando';
  const fila = {
    fecha: est === 'Mirando' ? '' : hoy(),
    empresa: flags.empresa, puesto: flags.puesto, donde: flags.donde || '',
    link: flags.link || '', estado: est,
    ultimo_movimiento: est === 'Mirando' ? '' : hoy(),
    proxima_accion: '', fecha_accion: est === 'Mirando' ? '' : sugerirFecha(est),
    porque: flags.porque || '', notas: flags.notas || '',
  };
  filas.push(fila);
  guardar(filas);
  console.log(`\n${fila.empresa} — ${fila.puesto}  →  ${fila.estado}` +
    (fila.fecha_accion ? `\nTe aviso el ${fila.fecha_accion} si no hay novedades.` : '') + '\n');
}

function marcar({ flags, sueltos }) {
  const busca = sueltos.slice(1).join(' ').trim() || flags.empresa || '';
  if (!busca) {
    console.log(`
  postulaciones marcar "Empresa" --estado Entrevista [--accion "preparar casos"] [--en 3]

Estados:`);
    for (const [e, d] of Object.entries(ESTADOS)) console.log(`  ${e.padEnd(14)} ${d}`);
    console.log('');
    return;
  }
  const filas = leer();
  const coincidencias = filas.filter((f) =>
    f.empresa.toLowerCase().includes(busca.toLowerCase()) ||
    f.puesto.toLowerCase().includes(busca.toLowerCase()));

  if (!coincidencias.length) { console.error(`\nNo encontré "${busca}".\n`); process.exit(1); }
  if (coincidencias.length > 1) {
    console.error(`\n"${busca}" coincide con varias. Sé más específico:`);
    for (const f of coincidencias) console.error(`  ${f.empresa} — ${f.puesto}`);
    console.error('');
    process.exit(1);
  }

  const f = coincidencias[0];
  if (flags.estado) {
    if (!ESTADOS[flags.estado]) {
      console.error(`\nEstado inválido: ${flags.estado}\nVálidos: ${Object.keys(ESTADOS).join(', ')}\n`);
      process.exit(1);
    }
    f.estado = flags.estado;
    if (!f.fecha) f.fecha = hoy();
    // Al cambiar de etapa se recalcula cuándo toca seguir, salvo que se pise a mano.
    if (!flags.en && !flags.fecha) f.fecha_accion = sugerirFecha(f.estado);
  }
  for (const k of ['puesto', 'link', 'porque', 'notas', 'donde']) if (flags[k]) f[k] = flags[k];
  if (flags.accion) f.proxima_accion = flags.accion;
  if (flags.en) f.fecha_accion = masDias(Number(flags.en));
  if (flags.fecha) f.fecha_accion = flags.fecha;
  if (CERRADOS.includes(f.estado)) { f.fecha_accion = ''; f.proxima_accion = ''; }
  f.ultimo_movimiento = hoy();

  guardar(filas);
  console.log(`\n${f.empresa} — ${f.puesto}  →  ${f.estado}` +
    (f.fecha_accion ? `  |  seguir el ${f.fecha_accion}${f.proxima_accion ? `: ${f.proxima_accion}` : ''}` : '') + '\n');
}

function numeros() {
  const filas = leer().filter((f) => f.estado !== 'Mirando');
  if (!filas.length) { console.log('\nTodavía no te postulaste a nada.\n'); return; }

  const cuenta = (e) => filas.filter((f) => f.estado === e).length;
  const llegaron = filas.filter((f) => VIVOS.includes(f.estado) || f.estado === 'Rechazado' ||
    ['Entrevista', 'Prueba', 'Oferta'].includes(f.estado)).length;
  const entrevistas = filas.filter((f) => ['Entrevista', 'Prueba', 'Oferta'].includes(f.estado)).length;

  titulo('POSTULACIONES');
  console.log(`  Total:         ${filas.length}`);
  console.log(`  Contestaron:   ${llegaron}  (${(llegaron / filas.length * 100).toFixed(0)}%)`);
  console.log(`  Entrevistas:   ${entrevistas}  (${(entrevistas / filas.length * 100).toFixed(0)}%)`);
  console.log(`  Sin respuesta: ${cuenta('Postulado')}`);

  const porDonde = new Map();
  for (const f of filas) {
    const k = f.donde || '(sin dato)';
    if (!porDonde.has(k)) porDonde.set(k, { t: 0, r: 0 });
    porDonde.get(k).t++;
    if (VIVOS.includes(f.estado) || ['Entrevista', 'Prueba', 'Oferta'].includes(f.estado)) porDonde.get(k).r++;
  }
  if (porDonde.size > 1) {
    titulo('POR DÓNDE LA ENCONTRASTE');
    for (const [k, v] of [...porDonde].sort((a, b) => b[1].t - a[1].t)) {
      console.log(`  ${corto(k, 24)} ${String(v.r).padStart(3)}/${String(v.t).padStart(3)}` +
        ` ${(v.r / v.t * 100).toFixed(0).padStart(4)}%${v.t < 10 ? '   (muestra chica)' : ''}`);
    }
    console.log('\n  Sirve para dejar de gastar tiempo en la fuente que no rinde.');
  }
  console.log('');
}

function listar({ sueltos }) {
  const filtro = sueltos[1];
  const filas = leer().filter((f) => !filtro || f.estado.toLowerCase() === filtro.toLowerCase());
  if (!filas.length) { console.log('\nSin resultados.\n'); return; }
  console.log('');
  for (const f of filas) {
    console.log(`${f.fecha || '          '}  ${corto(f.estado, 14)} ${corto(f.empresa, 22)} ${corto(f.puesto, 30)} ${f.donde}`);
  }
  console.log(`\n${filas.length} postulación(es).\n`);
}

const SUB = { estado, agregar, marcar, numeros, listar, '': estado };

export default async function postulaciones(ctx) {
  const sub = ctx.sueltos[0] && SUB[ctx.sueltos[0]] ? ctx.sueltos[0] : '';
  if (ctx.flags.ayuda && !sub) {
    console.log(`
  postulaciones                   lo pendiente (por defecto)
  postulaciones agregar           anotar un aviso
  postulaciones marcar "Empresa"  cambiar etapa
  postulaciones listar [estado]   ver todas
  postulaciones numeros           cuántas contestan, y desde qué fuente
`);
    return;
  }
  await SUB[sub](ctx);
}

export { leer, VIVOS, CERRADOS };
