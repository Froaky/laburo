/**
 * markdown.mjs — markdown a HTML, lo mínimo para un CV.
 *
 * Sin dependencias a propósito. Un conversor completo pesa más que todo este
 * repo, y un CV usa seis cosas: títulos, listas, negrita, cursiva, links y
 * párrafos. Si necesitás tablas o imágenes, escribí HTML directo: el
 * template lo respeta.
 *
 * La idea es que puedas mantener tu CV en un .md legible y que el diseño
 * salga solo. Editás texto, no etiquetas.
 */

const escapar = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Negrita, cursiva, código, links. Se aplica dentro de cada línea. */
function enLinea(t) {
  return t
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function markdownAHtml(md) {
  const lineas = md.replace(/\r\n/g, '\n').split('\n');
  const salida = [];
  let enLista = false;
  let enHtml = false;

  const cerrarLista = () => { if (enLista) { salida.push('</ul>'); enLista = false; } };

  for (let i = 0; i < lineas.length; i++) {
    const cruda = lineas[i];
    const l = cruda.trim();

    // Bloques de HTML crudo: se pasan tal cual. Es la válvula de escape para
    // quien quiera meter algo que el markdown no cubre.
    if (l.startsWith('<') && !l.startsWith('<a ')) enHtml = true;
    if (enHtml) {
      cerrarLista();
      salida.push(cruda);
      if (l.endsWith('>') && /<\/\w+>$/.test(l)) enHtml = false;
      continue;
    }

    if (!l) { cerrarLista(); continue; }

    // Separador
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) { cerrarLista(); salida.push('<hr>'); continue; }

    // Títulos
    const h = l.match(/^(#{1,5})\s+(.*)$/);
    if (h) {
      cerrarLista();
      // El h1 está reservado para el nombre, que va en el encabezado de la
      // plantilla. Un "# Sección" suelto en el cuerpo baja a h2 para que
      // agarre el estilo de sección; el resto conserva su nivel.
      const n = Math.min(Math.max(h[1].length, 2), 4);
      salida.push(`<h${n}>${enLinea(escapar(h[2]))}</h${n}>`);
      continue;
    }

    // Listas
    const li = l.match(/^[-*+]\s+(.*)$/);
    if (li) {
      if (!enLista) { salida.push('<ul>'); enLista = true; }
      salida.push(`<li>${enLinea(escapar(li[1]))}</li>`);
      continue;
    }

    cerrarLista();
    salida.push(`<p>${enLinea(escapar(l))}</p>`);
  }
  cerrarLista();
  return salida.join('\n');
}
