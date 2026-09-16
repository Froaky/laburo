/**
 * yaml.mjs — lector y escritor de YAML, del subconjunto que usa este repo.
 *
 * Por qué propio y no una librería: para que clonar y usar no requiera
 * `npm install`. Alguien buscando trabajo no debería tropezarse con npm, un
 * proxy corporativo o una versión de Node antes de anotar su primer contacto.
 * El núcleo ahora no depende de nada; sólo mandar mails y armar el PDF piden
 * instalar algo, y sólo cuando se usan.
 *
 * Soporta lo que los archivos de config necesitan:
 *
 *   clave: valor            strings, números, true/false, null
 *   clave:                  mapas anidados (2 espacios de indentación)
 *     otra: cosa
 *   lista:                  listas de valores
 *     - uno
 *   lista:                  listas de mapas
 *     - clave: valor
 *       otra: cosa
 *   texto: |                bloques literales (respeta saltos de línea)
 *   texto: >                bloques plegados (junta las líneas)
 *   inline: [a, b]          listas en una línea
 *   vacio: {}
 *
 * NO soporta anclas, referencias, documentos múltiples ni tipos raros. Si
 * escribís algo que no entiende, te dice la línea exacta en vez de fallar en
 * silencio o devolver algo a medias.
 */

const desescapar = (s) => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

function valorEscalar(crudo) {
  const v = crudo.trim();
  if (v === '' || v === '~' || v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === '{}') return {};
  if (v === '[]') return [];
  if (v.startsWith('[') && v.endsWith(']')) {
    const dentro = v.slice(1, -1).trim();
    if (!dentro) return [];
    return dentro.split(',').map((x) => valorEscalar(x));
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    const sin = v.slice(1, -1);
    return v[0] === '"' ? desescapar(sin) : sin.replace(/''/g, "'");
  }
  // Un número sólo si TODO el valor es un número: "2026-09-16" o "+54 9 387"
  // no lo son, y convertirlos rompería fechas y teléfonos.
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  return v;
}

const sangria = (l) => l.length - l.trimStart().length;

export function cargar(texto) {
  // Las líneas vacías y los comentarios NO se filtran acá: adentro de un
  // bloque `|` una línea vacía es contenido, y sacarla junta párrafos que
  // tenían que quedar separados. Se saltean en los bordes de cada bucle.
  const lineas = texto.replace(/\r\n/g, '\n').split('\n')
    .map((cruda, idx) => ({ cruda, n: idx + 1 }));

  let i = 0;
  const vacia = (l) => l === undefined || l.cruda.trim() === '' || /^\s*#/.test(l.cruda);
  const saltar = () => { while (i < lineas.length && vacia(lineas[i])) i++; return false; };

  function error(msg, linea) {
    const e = new Error(`YAML línea ${linea?.n ?? '?'}: ${msg}\n  ${linea?.cruda ?? ''}`);
    e.yaml = true;
    throw e;
  }

  /**
   * Lee un bloque `|` (literal) o `>` (plegado) que empieza en la línea
   * actual. Las líneas vacías de adentro son contenido, no separadores.
   */
  function bloque(estilo, sangriaPadre) {
    const partes = [];
    while (i < lineas.length &&
           (lineas[i].cruda.trim() === '' || sangria(lineas[i].cruda) > sangriaPadre)) {
      partes.push(lineas[i].cruda.trim() === '' ? '' : lineas[i].cruda.slice(sangriaPadre + 2));
      i++;
    }
    while (partes.length && partes[partes.length - 1] === '') partes.pop();

    if (estilo === '|') return partes.join('\n') + '\n';

    // Plegado: los saltos simples se vuelven espacios; una línea en blanco
    // sigue siendo un corte de párrafo. Es como se comporta el estándar.
    let salida = '';
    for (const l of partes) {
      if (l === '') { salida = salida.replace(/ $/, '') + '\n'; continue; }
      salida += (salida === '' || salida.endsWith('\n') ? '' : ' ') + l.trim();
    }
    return salida + '\n';
  }

  function valorDe(resto, nivel) {
    if (resto === '|' || resto === '>' || resto === '|-' || resto === '>-') {
      i++;
      return bloque(resto[0], nivel);
    }
    if (resto !== '') { i++; return valorEscalar(resto); }
    i++;
    // Sin valor en la línea: o viene un mapa/lista anidado, o es null.
    saltar();
    if (i >= lineas.length || sangria(lineas[i].cruda) <= nivel) return null;
    return estructura(sangria(lineas[i].cruda));
  }

  function estructura(nivel) {
    saltar();
    const primera = lineas[i];
    if (primera.cruda.trimStart().startsWith('- ') || primera.cruda.trim() === '-') {
      const lista = [];
      while (saltar() || (i < lineas.length && sangria(lineas[i].cruda) === nivel &&
             (lineas[i].cruda.trimStart().startsWith('- ') || lineas[i].cruda.trim() === '-'))) {
        const resto = lineas[i].cruda.trimStart().slice(2);
        // "- clave: valor" arranca un mapa cuyas demás claves vienen
        // indentadas al ancho del guión más dos.
        const comoClave = resto.match(/^([\w.-]+):(?:\s+(.*))?$/);
        if (comoClave) {
          const obj = {};
          const nivelMapa = nivel + 2;
          const clave = comoClave[1];
          const valorInline = (comoClave[2] ?? '').trim();
          if (valorInline === '|' || valorInline === '>') { i++; obj[clave] = bloque(valorInline, nivelMapa); }
          else if (valorInline !== '') { obj[clave] = valorEscalar(valorInline); i++; }
          else {
            i++;
            saltar();
            obj[clave] = (i < lineas.length && sangria(lineas[i].cruda) > nivelMapa)
              ? estructura(sangria(lineas[i].cruda)) : null;
          }
          while (saltar() || (i < lineas.length && sangria(lineas[i].cruda) === nivelMapa &&
                 !lineas[i].cruda.trimStart().startsWith('- '))) {
            const m = lineas[i].cruda.trim().match(/^([\w.-]+):(?:\s*(.*))?$/);
            if (!m) error('esperaba "clave: valor" dentro de un ítem de lista', lineas[i]);
            obj[m[1]] = valorDe((m[2] ?? '').trim(), nivelMapa);
          }
          lista.push(obj);
        } else {
          lista.push(valorEscalar(resto));
          i++;
        }
      }
      return lista;
    }

    const obj = {};
    while (saltar() || (i < lineas.length && sangria(lineas[i].cruda) === nivel)) {
      const linea = lineas[i];
      const m = linea.cruda.trim().match(/^([\w.-]+):(?:\s*([\s\S]*))?$/);
      if (!m) error('esperaba "clave: valor"', linea);
      obj[m[1]] = valorDe((m[2] ?? '').trim(), nivel);
    }
    return obj;
  }

  saltar();
  if (i >= lineas.length) return {};
  return estructura(sangria(lineas[i].cruda));
}

// ── Escritura ─────────────────────────────────────────────────────────────

/** Cita sólo cuando hace falta, para que los archivos sigan siendo legibles. */
function escalarAYaml(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  const necesitaComillas =
    s === '' ||
    /^[\s]|[\s]$/.test(s) ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(s) ||
    /:\s/.test(s) ||
    /\s#/.test(s) ||
    ['true', 'false', 'null', '~'].includes(s) ||
    (/^-?\d/.test(s) && /^-?[\d.]+$/.test(s));
  if (!necesitaComillas) return s;
  return `'${s.replace(/'/g, "''")}'`;
}

export function volcar(valor, nivel = 0) {
  const pad = ' '.repeat(nivel);

  if (Array.isArray(valor)) {
    if (valor.length === 0) return '[]';
    return valor.map((v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const cuerpo = volcar(v, nivel + 2);
        return `${pad}- ${cuerpo.slice(nivel + 2)}`;
      }
      return `${pad}- ${escalarAYaml(v)}`;
    }).join('\n');
  }

  if (valor && typeof valor === 'object') {
    const claves = Object.keys(valor);
    if (claves.length === 0) return '{}';
    return claves.map((k) => {
      const v = valor[k];
      if (Array.isArray(v)) {
        return v.length === 0 ? `${pad}${k}: []` : `${pad}${k}:\n${volcar(v, nivel + 2)}`;
      }
      if (v && typeof v === 'object') {
        return Object.keys(v).length === 0 ? `${pad}${k}: {}` : `${pad}${k}:\n${volcar(v, nivel + 2)}`;
      }
      if (typeof v === 'string' && v.includes('\n')) {
        const cuerpo = v.replace(/\n$/, '').split('\n').map((l) => `${pad}  ${l}`).join('\n');
        return `${pad}${k}: |\n${cuerpo}`;
      }
      return `${pad}${k}: ${escalarAYaml(v)}`;
    }).join('\n');
  }

  return escalarAYaml(valor);
}
