/**
 * mail — mandar por SMTP y detectar respuestas por IMAP.
 *
 * Por qué no con el navegador: manejar Gmail a mano para una tanda grande
 * falla de maneras que no se ven. El atajo de enviar deja borradores mudos
 * que parecen enviados, y una ventana vieja duplica el adjunto. Acá cada
 * envío devuelve el identificador real del servidor: o salió, o no salió.
 *
 * Tres guardas, todas por daño concreto:
 *
 *   --confirmar    Sin esto NO manda nada, sólo muestra. La regla "mirá
 *                  antes de mandar" es código, no fuerza de voluntad.
 *   no recontactar Se niega a escribirle de nuevo a alguien que ya está en
 *                  la lista y no está Frio.
 *   DNS            Descarta dominios que probadamente no existen.
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { basename } from 'path';
import { createHash } from 'crypto';
import { resolveMx, resolve4 } from 'dns/promises';
import { ruta, yo, hoy, opcional, corto } from '../lib/base.mjs';
import { leer as leerContactos, guardar as guardarContactos } from './contactos.mjs';

const ENV = ruta('.env.local');
const LOG = ruta('data/enviados.tsv');

function credenciales(cfg) {
  if (!existsSync(ENV)) {
    console.error(`
Falta .env.local

Creá el archivo con estas dos líneas:

  CORREO_USUARIO=${cfg.mail.usuario}
  CORREO_CLAVE=xxxx xxxx xxxx xxxx

La clave NO es la de tu cuenta: es una "clave de aplicación", que se genera
aparte y se puede revocar cuando quieras. En Gmail sale de
myaccount.google.com/apppasswords y necesita verificación en dos pasos.

.env.local está en .gitignore: no se sube.
`);
    process.exit(2);
  }
  const env = Object.fromEntries(
    readFileSync(ENV, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  if (!env.CORREO_USUARIO || !env.CORREO_CLAVE) {
    console.error('\n.env.local existe pero le falta CORREO_USUARIO o CORREO_CLAVE.\n');
    process.exit(2);
  }
  return env;
}

/** Plantilla: "Asunto: ..." + "---" + cuerpo. {{campos}} salen de config/me.yml. */
function plantilla(rutaArchivo, cfg) {
  if (!rutaArchivo) { console.error('\nFalta --plantilla\n'); process.exit(2); }
  if (!existsSync(rutaArchivo)) { console.error(`\nNo existe ${rutaArchivo}\n`); process.exit(2); }
  // Parseo a mano y no con una regex: tolera CRLF, líneas en blanco entre el
  // asunto y el separador, y espacios sueltos. Una plantilla la escribe una
  // persona en su editor, no un generador; tiene que perdonar formato.
  const lineas = readFileSync(rutaArchivo, 'utf8').replace(/\r\n/g, '\n').split('\n');

  const iAsunto = lineas.findIndex((l) => l.trim());
  const asuntoCrudo = (lineas[iAsunto] || '').match(/^Asunto:\s*(.+)$/i);
  const iSep = lineas.findIndex((l, i) => i > iAsunto && l.trim() === '---');

  if (!asuntoCrudo || iSep === -1) {
    console.error(`
${rutaArchivo} no tiene el formato esperado.

Tiene que ser así:

  Asunto: lo que va en el asunto
  ---
  El cuerpo del mail.
`);
    process.exit(2);
  }

  const cuerpoCrudo = lineas.slice(iSep + 1).join('\n').trim();
  const campos = { ...cfg.identidad, links: (cfg.identidad.links || []).join(' · ') };
  // {{gancho}} se resuelve por destinatario, más abajo.
  const llenar = (t) => t.replace(/\{\{(\w+)\}\}/g, (m0, k) => (k === 'gancho' ? m0 : campos[k] ?? m0));
  return {
    asunto: llenar(asuntoCrudo[1].trim()),
    cuerpo: llenar(cuerpoCrudo),
    nombre: basename(rutaArchivo).replace(/\.md$/, ''),
    usaGancho: /\{\{gancho\}\}/.test(cuerpoCrudo),
  };
}

/**
 * Devuelve [email, gancho]. El gancho es una línea propia de cada
 * destinatario que se interpola como {{gancho}}.
 *
 * Un mail idéntico a cincuenta empresas funciona cuando lo que vendés es una
 * capacidad verificable. Cuando lo que se juzga es tu criterio o tu voz, ese
 * mail es evidencia en contra tuyo. Por eso los perfiles con
 * personalizacion: alto no dejan mandar sin esto.
 */
function destinatarios(flags) {
  if (flags.para) return [[String(flags.para).toLowerCase(), '']];
  if (flags.lista) {
    const vistos = new Set();
    return readFileSync(flags.lista, 'utf8').split('\n').flatMap((linea) => {
      const [crudo, ...resto] = linea.split('\t');
      const mails = (resto.length ? [crudo] : crudo.split(/[,;]/))
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^@\s]+@[^@\s]+\.\w+$/.test(s));
      return mails.map((m) => [m, resto.join(' ').trim()]);
    }).filter(([m]) => !vistos.has(m) && vistos.add(m));
  }
  // Sin lista: los que están en el tracker esperando el primer mail.
  return leerContactos().filter((f) => f.estado === 'Pendiente').map((f) => [f.email, '']);
}

/**
 * Descarta sólo lo que probadamente no existe.
 *
 * Dos errores fáciles de cometer acá:
 *   1. "Sin MX" no es "no recibe mail": el estándar usa el registro A como
 *      alternativa. Filtrar sólo por MX descarta dominios que funcionan.
 *   2. "El lookup falló" no es "no existe". Con el DNS caído o bloqueado,
 *      todos fallan —incluido gmail.com— y el filtro se come la lista entera
 *      en silencio.
 * Por eso: se descarta únicamente con NXDOMAIN confirmado en MX y en A.
 */
async function filtrarDns(lista, activo) {
  if (!activo) return { vivos: lista, muertos: [], incierto: false };
  const dominios = [...new Set(lista.map((e) => e.split('@')[1]))];
  const muerto = new Set();
  let incierto = false;

  await Promise.all(dominios.map(async (d) => {
    const probar = async (fn) => {
      try { return (await fn(d)).length > 0 ? 'si' : 'no'; }
      catch (e) { return (e.code === 'ENOTFOUND' || e.code === 'NXDOMAIN') ? 'no' : 'error'; }
    };
    const mx = await probar(resolveMx);
    if (mx === 'si') return;
    const a = await probar(resolve4);
    if (a === 'si') return;
    if (mx === 'error' || a === 'error') { incierto = true; return; }
    muerto.add(d);
  }));

  return {
    vivos: lista.filter((e) => !muerto.has(e.split('@')[1])),
    muertos: lista.filter((e) => muerto.has(e.split('@')[1])),
    incierto,
  };
}

async function enviar(ctx, confirmar) {
  const { flags } = ctx;
  const cfg = await yo();
  const { asunto, cuerpo, nombre, usaGancho } = plantilla(flags.plantilla, cfg);
  const adjunto = flags.adjunto;

  let pares = destinatarios(flags);
  if (!pares.length) { console.error('\nNo hay destinatarios.\n'); process.exit(2); }
  if (adjunto && !existsSync(adjunto)) { console.error(`\nNo existe el adjunto: ${adjunto}\n`); process.exit(2); }

  const pedidos = pares.length;
  const gancho = new Map(pares);

  // Ya contactados y todavía vivos
  const contactos = leerContactos();
  const repetidos = new Map();
  if (cfg.mail.evitar_recontacto && !flags.reenviar) {
    for (const f of contactos) {
      const e = f.email.toLowerCase();
      if (gancho.has(e) && !['Frio', 'Pendiente'].includes(f.estado)) repetidos.set(e, f.estado);
    }
  }
  let lista = [...gancho.keys()].filter((e) => !repetidos.has(e));

  const { vivos, muertos, incierto } = await filtrarDns(lista, cfg.mail.verificar_dns !== false);
  lista = vivos;

  console.log(`\n  Plantilla: ${nombre}`);
  console.log(`  Asunto:    ${asunto}`);
  console.log(`  Adjunto:   ${adjunto ? basename(adjunto) : '(ninguno)'}`);
  console.log(`  Pedidos:   ${pedidos}  →  a enviar: ${lista.length}`);

  if (repetidos.size) {
    console.log(`\n  ${repetidos.size} salteado(s), ya los contactaste (--reenviar para forzar):`);
    for (const [e, st] of repetidos) console.log(`    ${corto(e, 34)} ${st}`);
  }
  if (muertos.length) {
    console.log(`\n  ${muertos.length} salteado(s), el dominio no existe:`);
    for (const e of muertos) console.log(`    ${e}`);
  }
  if (incierto) console.log('\n  (no pude resolver DNS de todos: ante la duda, van igual)');
  if (!lista.length) { console.log('\n  No queda nadie a quien escribirle.\n'); return; }

  const muestra = cuerpo.replace(/\{\{gancho\}\}/g, gancho.get(lista[0]) || '(SIN GANCHO)');
  console.log(`\n${'─'.repeat(64)}\n${muestra}\n${'─'.repeat(64)}`);

  const sinGancho = usaGancho ? lista.filter((e) => !gancho.get(e)) : [];
  const exigeGancho = (cfg.mail.personalizacion === 'alto');

  if (usaGancho && sinGancho.length) {
    console.log(`\n  ${sinGancho.length} de ${lista.length} sin línea propia.`);
    console.log('  En la lista poné:  mail<TAB>una línea sobre esa empresa');
  }
  if (exigeGancho && !usaGancho) {
    console.log(`
  ⚠ Tu perfil pide personalización ALTA y esta plantilla es igual para todos.

    En tu rubro te evalúan por cómo escribís. Un mail de molde, mandado a
    treinta lugares, ya contestó la pregunta que te iban a hacer.

    Agregá {{gancho}} a la plantilla y una línea por destinatario en la lista.
    Si igual querés mandarlo así: --igual-para-todos`);
    if (confirmar && !flags['igual-para-todos']) { console.log('\n  No mandé nada.\n'); return; }
  }

  console.log('');
  lista.forEach((e, i) => console.log(`   ${String(i + 1).padStart(3)}. ${e}`));

  if (!confirmar) {
    console.log('\n  Esto fue una PRUEBA. No se mandó nada.');
    console.log('  Para mandar de verdad, agregá --confirmar\n');
    return;
  }

  const env = credenciales(cfg);
  const { default: nodemailer } = await opcional('nodemailer', 'mandar mails');
  const t = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.CORREO_USUARIO, pass: env.CORREO_CLAVE.replace(/\s/g, '') },
  });

  console.log('\n  Verificando conexión...');
  await t.verify();
  console.log('  OK.\n');

  if (!existsSync(LOG)) appendFileSync(LOG, 'cuando\temail\tplantilla\tasunto\tcuerpo_sha\tid_mensaje\n');
  const pausa = (cfg.mail.pausa_segundos ?? 4) * 1000;
  const cuerpoPara = (to) => cuerpo.replace(/\{\{gancho\}\}/g, gancho.get(to) || '');

  let ok = 0;
  const fallos = [];
  for (const [i, to] of lista.entries()) {
    try {
      const info = await t.sendMail({
        from: env.CORREO_USUARIO, to, subject: asunto, text: cuerpoPara(to),
        attachments: adjunto ? [{ filename: basename(adjunto), path: adjunto }] : [],
      });
      ok++;
      console.log(`  ${String(i + 1).padStart(3)}/${lista.length}  ${corto(to, 34)} ${info.messageId}`);

      const sha = createHash('sha256').update(cuerpoPara(to)).digest('hex').slice(0, 12);
      appendFileSync(LOG, [new Date().toISOString(), to, nombre, asunto, sha, info.messageId].join('\t') + '\n');

      const f = contactos.find((x) => x.email.toLowerCase() === to);
      if (f) {
        f.estado = 'Enviado'; f.ultimo_contacto = hoy(); f.plantilla = nombre;
        if (!f.fecha) f.fecha = hoy();
      } else {
        contactos.push({ fecha: hoy(), empresa: to.split('@')[1], persona: '', email: to,
          canal: 'mail', grupo: '', zona: '', estado: 'Enviado', ultimo_contacto: hoy(),
          proxima_accion: '', fecha_accion: '', notas: '', plantilla: nombre });
      }
    } catch (err) {
      fallos.push({ to, err: err.message });
      console.error(`  ${String(i + 1).padStart(3)}/${lista.length}  ${corto(to, 34)} FALLÓ: ${err.message}`);
    }
    if (i < lista.length - 1) await new Promise((r) => setTimeout(r, pausa));
  }

  guardarContactos(contactos);
  console.log(`\n  ${ok} enviado(s), ${fallos.length} fallido(s).`);
  console.log('  Archivo de lo enviado: data/enviados.tsv\n');
}

/**
 * Revisa la casilla y marca quién contestó.
 *
 * Sin esto, enterarse de una respuesta depende de que mires el mail en el
 * momento justo. Conseguir que alguien conteste cuesta mucho: perder esa
 * respuesta entre el resto del correo es la forma más tonta de desperdiciarla.
 */
async function respuestas() {
  const cfg = await yo();
  const env = credenciales(cfg);
  const contactos = leerContactos();
  if (!contactos.length) { console.error('\nNo hay contactos cargados.\n'); process.exit(2); }

  const porDominio = new Map();
  for (const f of contactos) {
    const d = (f.email || '').toLowerCase().split('@')[1];
    if (!d) continue;
    if (!porDominio.has(d)) porDominio.set(d, []);
    porDominio.get(d).push(f);
  }

  const { ImapFlow } = await opcional('imapflow', 'leer respuestas');
  const c = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true, logger: false,
    auth: { user: env.CORREO_USUARIO, pass: env.CORREO_CLAVE.replace(/\s/g, '') },
  });

  await c.connect();
  const lock = await c.getMailboxLock('INBOX');
  const nuevas = [];
  try {
    for await (const msg of c.fetch({ since: new Date(Date.now() - 60 * 86400000) }, { envelope: true })) {
      const from = msg.envelope?.from?.[0];
      if (!from?.address) continue;
      const dir = from.address.toLowerCase();
      const filas = porDominio.get(dir.split('@')[1]);
      if (!filas) continue;
      const fecha = (msg.envelope.date || new Date()).toISOString().slice(0, 10);
      for (const f of filas) {
        // No pisar estados que ya avanzaron más allá de "contestó".
        if (['Cotizado', 'Negociando', 'Reunion', 'Cerrado'].includes(f.estado)) continue;
        if (f.estado !== 'Respondio') nuevas.push({ empresa: f.empresa, dir, fecha, asunto: msg.envelope.subject || '' });
        f.estado = 'Respondio';
        if (!f.persona) f.persona = from.name ? `${from.name} (${dir})` : dir;
        if (!f.ultimo_contacto || f.ultimo_contacto < fecha) f.ultimo_contacto = fecha;
      }
    }
  } finally { lock.release(); await c.logout(); }

  guardarContactos(contactos);
  if (!nuevas.length) { console.log('\nSin respuestas nuevas.\n'); return; }
  console.log(`\n${nuevas.length} respuesta(s) nueva(s):\n`);
  for (const n of nuevas) console.log(`  ${n.fecha}  ${corto(n.empresa, 24)} ${corto(n.dir, 32)} ${n.asunto.slice(0, 46)}`);
  console.log('\n  Detalle:  node laburo.mjs contactos\n');
}

export default async function mail(ctx) {
  const sub = ctx.sueltos[0];
  if (sub === 'probar') return enviar(ctx, false);
  if (sub === 'mandar') return enviar(ctx, ctx.flags.confirmar === true);
  if (sub === 'respuestas') return respuestas();

  console.log(`
  mail probar      --plantilla <archivo> [--lista <archivo> | --para <mail>] [--adjunto <archivo>]
  mail mandar      ...lo mismo... --confirmar
  mail respuestas  revisar la casilla y marcar quién contestó

Sin --confirmar no se manda nada: "probar" y "mandar" muestran lo mismo.

Formato de la lista (una línea por destinatario):
  hola@empresa.com
  hola@empresa.com<TAB>Vi la campaña que hicieron para X y me gustó el enfoque.

Esa segunda parte se interpola como {{gancho}} en la plantilla.
`);
}
