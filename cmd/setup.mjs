/**
 * setup — la entrevista inicial.
 *
 * Lo que hace útil a este sistema no son los scripts: es que config/ tenga
 * TU criterio adentro. Copiar el de otro y cambiarle el nombre no sirve.
 * Por eso esto pregunta en vez de asumir.
 */

import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';
import { RAIZ, ruta, cargarYml, guardarYml, hoy } from '../lib/base.mjs';

export default async function setup({ flags } = { flags: {} }) {
  // Sin terminal real, `question` nunca resuelve y el proceso muere con un
  // warning críptico. Mejor decirlo claro que dejar a alguien mirando un
  // cursor que no parpadea.
  if (!stdin.isTTY && !flags.perfil) {
    console.error(`
El setup necesita una terminal interactiva.

Si estás en un entorno sin terminal (un script, un contenedor), usá:

  node laburo.mjs setup --perfil generico --nombre "Tu Nombre" --email vos@mail.com

O copiá a mano config/me.yml desde el ejemplo del README.
`);
    process.exit(2);
  }

  const rl = stdin.isTTY ? createInterface({ input: stdin, output: stdout }) : null;
  let cerrada = false;
  rl?.on('close', () => { cerrada = true; });

  const preg = async (q, def = '') => {
    if (!rl || cerrada) return def;
    const r = (await rl.question(def ? `  ${q} [${def}]: ` : `  ${q}: `)).trim();
    return r || def;
  };

  console.log(`
┌─────────────────────────────────────────────────────────┐
│  laburo — configuración inicial                         │
│                                                         │
│  Unas preguntas y queda listo. Todo se guarda en        │
│  config/, que está gitignoreado: no se sube nunca.      │
└─────────────────────────────────────────────────────────┘
`);

  // ── Perfil de profesión ────────────────────────────────────────────────
  const archivos = readdirSync(ruta('perfiles')).filter((f) => f.endsWith('.yml'));
  const perfiles = [];
  for (const a of archivos) perfiles.push({ archivo: a, ...(await cargarYml(`perfiles/${a}`)) });
  perfiles.sort((a, b) => (a.archivo === 'generico.yml' ? 1 : b.archivo === 'generico.yml' ? -1 : 0));

  let perfil = flags.perfil
    ? perfiles.find((p) => p.archivo === `${flags.perfil}.yml`)
    : null;

  if (flags.perfil && !perfil) {
    console.error(`\nNo existe el perfil "${flags.perfil}".`);
    console.error(`Disponibles: ${perfiles.map((p) => p.archivo.replace('.yml', '')).join(', ')}\n`);
    process.exit(2);
  }

  if (!perfil) {
    console.log('¿A qué te dedicás?\n');
    perfiles.forEach((p, i) => console.log(`  ${i + 1}. ${p.nombre}`));
    console.log('');
    let intentos = 0;
    while (!perfil && intentos++ < 5) {
      const r = await preg(`Elegí 1-${perfiles.length}`, String(perfiles.length));
      perfil = perfiles[Number(r) - 1];
      if (!perfil) console.log('  Número inválido.');
    }
    if (!perfil) { console.error('\nNo entendí la elección. Probá de nuevo.\n'); process.exit(2); }
  }
  console.log(`\n  → ${perfil.nombre}\n`);

  // ── Identidad ──────────────────────────────────────────────────────────
  console.log('Quién sos\n');
  const nombre = flags.nombre || await preg('Nombre y apellido');
  if (!nombre) { console.log('\nSin nombre no puedo seguir.\n'); rl?.close(); process.exit(1); }

  const firma = await preg('Cómo firmás los mails', nombre.split(' ').slice(0, 2).join(' '));
  const titulo = flags.titulo || await preg('Tu título o rol');
  const email = flags.email || await preg('Mail desde el que escribís');
  const telefono = await preg('Teléfono');
  const ubicacion = await preg('Dónde estás', 'Argentina (GMT-3)');
  const linksRaw = await preg('Links separados por coma (portfolio, LinkedIn, GitHub)');
  const links = linksRaw.split(',').map((s) => s.trim()).filter(Boolean);

  // ── Entrega ────────────────────────────────────────────────────────────
  console.log('\nCómo entregás\n');
  const base = (process.env.USERPROFILE || process.env.HOME || '.').replace(/\\/g, '/');
  const carpeta = await preg('Carpeta donde dejar los archivos listos para adjuntar',
    `${base}/Desktop/postulaciones`);

  const partes = nombre.trim().split(/\s+/);
  const sugerido = `${perfil.adjunto === 'portfolio' ? 'PORTFOLIO' : 'CV'} ` +
    `${partes[0].toUpperCase()} ${(partes[partes.length - 1] || '').toUpperCase()}`.trim() + '.pdf';
  console.log('\n  El nombre del archivo es lo primero que ve quien lo recibe.');
  console.log('  Nunca debería tener el nombre interno de una herramienta.\n');
  const nombreArchivo = await preg('Nombre del archivo adjunto', sugerido);

  // ── Plata ──────────────────────────────────────────────────────────────
  console.log('\nPlata\n');
  console.log('  Esto existe para que nadie improvise un número: ni vos apurado,');
  console.log('  ni una IA ayudándote, ni vos mismo dentro de tres meses.');
  console.log(`\n  En tu rubro se suele cobrar así: ${perfil.modalidades.join(', ')}.\n`);

  const moneda = await preg('Moneda', 'USD');
  const tarifaHora = await preg('Tu tarifa por hora (vacío si no hacés trabajos por tu cuenta)', '');
  const pisoHora = tarifaHora
    ? await preg('Piso duro (por debajo no cotizás)', String(Math.round(Number(tarifaHora) * 0.7) || ''))
    : '';
  const pisoMensual = await preg('Piso mensual en relación de dependencia (vacío si no aplica)', '');

  rl?.close();

  // ── Escribir ───────────────────────────────────────────────────────────
  mkdirSync(ruta('config'), { recursive: true });
  mkdirSync(ruta('data'), { recursive: true });

  const yaExiste = (rel) => {
    if (existsSync(ruta(rel))) { console.log(`  ya existía, no lo toqué: ${rel}`); return true; }
    return false;
  };

  console.log('\n');

  if (!yaExiste('config/me.yml')) {
    await guardarYml('config/me.yml', {
      perfil: perfil.archivo.replace('.yml', ''),
      identidad: { nombre, firma, titulo, email, telefono, ubicacion, links },
      entrega: { carpeta, nombre_archivo: nombreArchivo, max_paginas: 2 },
      mail: {
        usuario: email,
        pausa_segundos: 4,
        dias_silencio: 7,
        evitar_recontacto: true,
        verificar_dns: true,
        personalizacion: perfil.personalizacion || 'medio',
      },
    });
    console.log('  escrito: config/me.yml');
  }

  if (!yaExiste('config/rates.yml')) {
    const t = { moneda, cotizados: [] };
    if (tarifaHora) {
      t.por_cuenta_propia = {
        tarifa_hora: Number(tarifaHora),
        piso_hora: Number(pisoHora) || null,
        modalidades: perfil.modalidades,
        descuentos_validos: [
          'volumen comprometido por escrito',
          'continuidad, no un trabajo suelto',
          'pago por adelantado',
        ],
        nunca_descontar_por: [
          '"experiencia" o "para aprender"',
          '"para arrancar la relación"',
          'que el cliente diga que es mucho, sin ofrecer nada a cambio',
        ],
      };
    }
    if (pisoMensual) {
      t.relacion_dependencia = { piso_mensual: Number(pisoMensual), no_negociable: [] };
    }
    await guardarYml('config/rates.yml', t);
    console.log('  escrito: config/rates.yml');
  }

  if (!yaExiste('config/cv-rules.yml')) {
    await guardarYml('config/cv-rules.yml', {
      reglas: [
        { id: 'guion-largo', grave: false, arreglable: true, prohibido: '[–—]',
          porque: 'guión largo: algunos lectores de CV lo rompen, usar guión simple' },
        { id: 'comillas-curvas', grave: false, arreglable: true, prohibido: '[‘’“”]',
          porque: 'comillas tipográficas: reemplazar por rectas' },
        ...(perfil.reglas_cv || []),
      ],
      canonicos: {},
    });
    console.log('  escrito: config/cv-rules.yml');
  }

  // El perfil de profesión arranca la memoria: son cosas que ya sabemos
  // del rubro antes de que la persona escriba el primer mail.
  const memoria = ruta('data/aprendido.md');
  if (!existsSync(memoria)) {
    writeFileSync(memoria, `# Lo que sabemos

Este archivo crece solo, a medida que usás el sistema. Es lo primero que
debería leer cualquiera (persona o IA) antes de ayudarte.

Agregá cosas con:  node laburo.mjs aprender "lo que sea"

---

## ${hoy()} · perfil · Rubro: ${perfil.nombre}

${perfil.nota.trim()}

**A quién escribirle:** ${perfil.destinatarios.trim()}

**Qué sirve como prueba:** ${perfil.evidencia.map((e) => `\n- ${e}`).join('')}

**Dónde buscar la lista:** ${perfil.fuentes.map((f) => `\n- ${f}`).join('')}
`);
    console.log('  escrito: data/aprendido.md');
  }

  console.log(`

Listo. Lo que sigue, en orden:

  1. Poné tu CV en cv.md (markdown, como quieras)
  2. Copiá plantillas/primer-contacto.md y reescribilo con tu experiencia
     Los {{campos}} se llenan solos desde config/me.yml
  3. Armá tu lista de contactos:  node laburo.mjs contactos agregar --ayuda
  4. Si vas a mandar mails, creá .env.local con:
       CORREO_USUARIO=${email}
       CORREO_CLAVE=...   (clave de aplicación, no la de tu cuenta)

Después, todos los días:

  node laburo.mjs hoy
`);
}
