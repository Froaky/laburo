# Instrucciones para la IA que trabaje en este repo

Este archivo es para vos, asistente. Quien lo usa está buscando trabajo, que
es una situación con plata y ansiedad de por medio. Leelo entero antes de
hacer nada.

> Si tu herramienta usa `CLAUDE.md`, `GEMINI.md` u otro nombre, es el mismo
> contenido. Mantenelos iguales.

---

## Lo primero, siempre

```bash
node laburo.mjs hoy
cat data/aprendido.md
```

`data/aprendido.md` es la memoria del sistema: quién es esta persona, qué
correcciones ya te hizo, qué aprendió de sus propios resultados.

**No le preguntes cosas que esos dos comandos ya contestan.** Que le hagas
repetir lo que ya dijo la semana pasada es exactamente lo que este repo
existe para evitar.

## Lo segundo: escribí lo que aprendas

Cada vez que la persona te corrija algo, te diga una preferencia, o te aclare
un dato suyo, **anotalo antes de seguir**:

```bash
node laburo.mjs aprender "lo que sea" --tipo correccion
```

Tipos: `correccion`, `preferencia`, `hecho`, `leccion`, `perfil`.

Esto no es opcional ni es burocracia. Es lo único que hace que la sesión que
viene arranque mejor que esta. Si no lo anotás, se lo vas a volver a
preguntar, y la persona va a sentir con razón que no le estás prestando
atención.

Cada 20 o 30 contactos:

```bash
node laburo.mjs aprender revisar --guardar
```

Eso mira los resultados reales y saca conclusiones medidas.

---

## Reglas duras

### Nunca mandes nada sin mostrarlo primero

Mostrale el destinatario y el texto completo, y esperá que diga que sí.
`mail mandar` sin `--confirmar` no manda nada, pero eso es una red de
seguridad, no un permiso: **mostrale igual**.

### Nunca improvises un número

La tarifa está en `config/rates.yml`. Si el caso no está contemplado ahí,
preguntale. Un número dicho al pasar queda de ancla para siempre, y en
mercados chicos los clientes hablan entre ellos.

Cuando se cotice algo nuevo, agregalo a `cotizados` en ese archivo.

### Nunca inventes datos en un CV o un mail

Si no sabés un número, preguntalo o no lo pongas. Un dato falso se descubre
en la primera entrevista y quema el contacto para siempre.

Cuando corrijas un dato del CV, **agregá una regla** en `config/cv-rules.yml`
para que ese error no vuelva:

```yaml
- id: cargo-viejo
  grave: true
  prohibido: 'Analista Junior'
  porque: desde 2025 el cargo es Semi Senior
```

Después:  `node laburo.mjs cv revisar`

### Nunca revises una muestra y digas "está todo bien"

Este es el error más común y el más caro. Si hay 30 archivos, se revisan los
30 — para eso está `cv revisar`. Decir "listo" habiendo mirado 6 es mentir
sin querer, y la persona se entera cuando ya mandó el archivo equivocado.

### Nunca publiques los datos personales

Antes de cualquier `git push`:

```bash
node laburo.mjs doctor
```

---

## Cómo ayudar bien

**Sé honesto con las probabilidades.** Si un puesto no le encaja, decilo. Si
el rubro tiene tasas de respuesta bajas, decilo antes y no después. Alguien
buscando trabajo necesita calibrar expectativas, no que le levanten el ánimo
con humo.

**Distinguí señal de ruido.** Con 6 contactos, "33% de respuesta" no es un
hallazgo, es azar. El comando `numeros` marca las muestras chicas: respetá
esa marca cuando saques conclusiones.

**El seguimiento vale más que el volumen.** Conseguir que alguien conteste
cuesta mucho más que contestarle. Si hay conversaciones abiertas sin tocar,
eso va primero que mandar una tanda nueva.

**Adaptate al rubro.** `perfiles/` tiene las particularidades de cada uno:
dónde buscar, qué sirve como prueba, cuánta personalización necesita el mail.
En algunos rubros una tanda idéntica funciona; en otros es evidencia en
contra de quien la manda.

**No narres lo que vas a hacer: hacelo.** Y cuando termines, decí qué quedó
hecho y qué no, sin adornar.

---

## Mapa del repo

| Carpeta | Qué hay |
|---|---|
| `config/` | quién es, cuánto cobra, qué no puede decir su CV. **Gitignoreado** |
| `data/` | contactos, agenda, memoria, archivo de envíos. **Gitignoreado** |
| `perfiles/` | particularidades por profesión |
| `plantillas/` | cuerpos de mail con `{{campos}}` |
| `cmd/` | un archivo por comando |
| `lib/base.mjs` | rutas, config, TSV, fechas |
| `salida/` | los HTML/PDF del CV. **Gitignoreado** |

Los datos van en TSV a propósito: se abren en cualquier planilla y se
arreglan a mano. Alguien buscando trabajo no debería necesitar una
herramienta para reparar sus propios datos.
