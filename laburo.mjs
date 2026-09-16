#!/usr/bin/env node
/**
 * laburo — buscar trabajo con método.
 *
 * Un solo comando, varios subcomandos. Todo lo personal vive en config/ y
 * data/, gitignoreados. El repo se puede publicar sin exponer nada.
 */

import { parsearArgs } from './lib/base.mjs';

const COMANDOS = {
  setup: ['configurar por primera vez', './cmd/setup.mjs'],
  hoy: ['qué hay que hacer hoy (empezá por acá)', './cmd/hoy.mjs'],
  contactos: ['a quién le escribiste en frío y quién contestó', './cmd/contactos.mjs'],
  postulaciones: ['los avisos a los que te postulaste', './cmd/postulaciones.mjs'],
  mail: ['mandar mails y detectar respuestas', './cmd/mail.mjs'],
  cv: ['armar, revisar y generar tu CV', './cmd/cv.mjs'],
  entrevista: ['prepararte, y el banco de historias', './cmd/entrevista.mjs'],
  aprender: ['lo que el sistema sabe de vos y de lo que funciona', './cmd/aprender.mjs'],
  doctor: ['chequear que no estés por filtrar datos', './cmd/doctor.mjs'],
};

function ayuda() {
  console.log(`
laburo — buscar trabajo con método

  node laburo.mjs <comando>

`);
  for (const [nombre, [desc]] of Object.entries(COMANDOS)) {
    console.log(`  ${nombre.padEnd(14)} ${desc}`);
  }
  console.log(`
Si es tu primera vez:

  npm install
  node laburo.mjs setup

Cada comando sin argumentos explica lo suyo:

  node laburo.mjs contactos
`);
}

const [cmd, ...resto] = process.argv.slice(2);

if (!cmd || cmd === 'ayuda' || cmd === '--help' || cmd === '-h') {
  ayuda();
  process.exit(0);
}

if (!COMANDOS[cmd]) {
  console.error(`\nNo conozco el comando "${cmd}".`);
  const parecido = Object.keys(COMANDOS).find((c) => c.startsWith(cmd.slice(0, 3)));
  if (parecido) console.error(`¿Quisiste decir "${parecido}"?`);
  console.error('\nVer todos:  node laburo.mjs ayuda\n');
  process.exit(1);
}

const { flags, sueltos } = parsearArgs(resto);
const modulo = await import(COMANDOS[cmd][1]);
await modulo.default({ flags, sueltos, argv: resto });
