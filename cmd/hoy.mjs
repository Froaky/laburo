/**
 * hoy — lo primero que hay que correr al abrir esto.
 *
 * Existe porque la búsqueda de trabajo se hace en ratos sueltos, con días
 * de por medio, y cada vez arrancás sin acordarte de qué habías quedado.
 * Eso es lo que hace que se pierdan las conversaciones que ya estaban
 * andando, que son las más caras de conseguir.
 */

import { existsSync, readFileSync } from 'fs';
import { ruta, yo, tarifas, leerTsv, hoy as fHoy, dias, titulo, corto } from '../lib/base.mjs';
import { leer as leerContactos } from './contactos.mjs';

const COLS_AGENDA = ['fecha', 'quien', 'que'];

export default async function hoyCmd() {
  const cfg = await yo();

  console.log(`\n  ${cfg.identidad.nombre} — ${fHoy()}`);

  // ── Agenda: compromisos con fecha ──────────────────────────────────────
  const agenda = leerTsv('data/agenda.tsv', COLS_AGENDA)
    .filter((f) => f.fecha && (f.fecha >= fHoy() || dias(f.fecha) <= 3))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (agenda.length) {
    titulo('AGENDA');
    for (const f of agenda) {
      const d = -dias(f.fecha);
      const cuando = d < 0 ? `VENCIDO hace ${-d}d` : d === 0 ? 'HOY' : d === 1 ? 'mañana' : `en ${d}d`;
      console.log(`  ${f.fecha}  ${corto(cuando, 16)} ${corto(f.quien, 14)} ${f.que}`);
    }
  }

  // ── Contactos ──────────────────────────────────────────────────────────
  const contactos = leerContactos();
  if (contactos.length) {
    const abiertas = contactos.filter((f) => ['Respondio', 'Cotizado', 'Negociando', 'Reunion'].includes(f.estado));
    const vencidas = contactos.filter((f) => f.fecha_accion && f.fecha_accion <= fHoy() &&
                                             !['Frio', 'Cerrado', 'Rebotado'].includes(f.estado));
    const pendientes = contactos.filter((f) => f.estado === 'Pendiente');

    titulo('CONTACTOS');
    console.log(`  ${contactos.length} en total · ${abiertas.length} conversación(es) abierta(s) · ${pendientes.length} sin escribir`);

    for (const f of abiertas) {
      const d = dias(f.ultimo_contacto);
      const alerta = d !== null && d >= 5 ? '  ← enfriándose' : '';
      console.log(`  ${corto(f.estado, 11)} ${corto(f.empresa, 26)} ${(d === null ? '' : `hace ${d}d`).padStart(8)}${alerta}`);
    }
    if (vencidas.length) {
      console.log(`\n  ${vencidas.length} acción(es) vencida(s):  node laburo.mjs contactos`);
    }
  }

  // ── Plata ──────────────────────────────────────────────────────────────
  const t = await tarifas();
  if (t) {
    titulo('PLATA (no improvisar)');
    const m = t.moneda || '';
    if (t.por_cuenta_propia?.tarifa_hora) {
      console.log(`  Por tu cuenta:  ${m} ${t.por_cuenta_propia.tarifa_hora}/hora` +
        (t.por_cuenta_propia.piso_hora ? `   (piso: ${m} ${t.por_cuenta_propia.piso_hora})` : ''));
    }
    if (t.relacion_dependencia?.piso_mensual) {
      console.log(`  En relación:    piso ${m} ${t.relacion_dependencia.piso_mensual}/mes`);
    }
    if (t.cotizados?.length) {
      console.log(`  Ya cotizaste a: ${t.cotizados.map((c) => c.empresa).join(', ')}`);
    }
    console.log('  Detalle: config/rates.yml');
  }

  // ── Memoria ────────────────────────────────────────────────────────────
  const mem = ruta('data/aprendido.md');
  if (existsSync(mem)) {
    const entradas = readFileSync(mem, 'utf8').split(/\n(?=## )/).length - 1;
    titulo('MEMORIA');
    console.log(`  ${entradas} cosa(s) anotadas.  node laburo.mjs aprender ver`);
    if (contactos.filter((f) => f.estado !== 'Pendiente').length >= 20) {
      console.log('  Ya tenés datos suficientes:  node laburo.mjs aprender revisar');
    }
  }

  console.log('');
}
