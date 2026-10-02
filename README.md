# laburo

Buscar trabajo con método: a quién le escribiste, quién te contestó, cuánto
cobrás y qué fuiste aprendiendo.

Sirve para cualquier profesión. No es un portal de empleos ni te escribe el CV:
ordena la parte que se pierde sola.

```
node laburo.mjs hoy
```

```
  Ana Gutiérrez — 2026-09-16

AGENDA
──────
  2026-09-17  mañana           Estudio Vera   Mandar presupuesto

CONTACTOS
─────────
  34 en total · 3 conversación(es) abierta(s) · 12 sin escribir
  Cotizado    Estudio Vera                 hace 2d
  Respondio   Agencia Norte                hace 6d  ← enfriándose
  Respondio   Editorial Sur                hace 8d  ← enfriándose

PLATA (no improvisar)
─────────────────────
  Por tu cuenta:  USD 22/hora   (piso: USD 16)
```

---

## El problema que resuelve

Casi nadie pierde oportunidades por no mandar suficientes mails. Se pierden
por otras tres cosas:

1. **Alguien contesta, pasan cinco días, y nadie vuelve sobre eso.** Conseguir
   que te contesten es lo caro; dejarlo enfriar es tirar ese trabajo.
2. **Te preguntan cuánto cobrás y decís un número improvisado.** Ese número
   queda de ancla para siempre, y en mercados chicos los clientes hablan.
3. **Corregís un dato en un CV y te olvidás de las otras diez versiones.**
   Después mandás la vieja sin darte cuenta.

Nada de eso se arregla con más esfuerzo. Se arregla anotando.

## Y algo que va mejorando

Todo lo que descubrís queda en `data/aprendido.md`: tus correcciones, tus
preferencias, tus datos verificados, y las conclusiones medidas sobre tus
propios resultados.

Ese archivo es lo primero que lee cualquiera que te ayude —una persona o una
IA— así que cada vez arrancan sabiendo más y preguntándote menos.

```bash
node laburo.mjs aprender "Mi tarifa es 22 la hora y no la bajo por volumen chico" --tipo preferencia
node laburo.mjs aprender revisar --guardar
```

`revisar` mira tus contactos reales y saca conclusiones: cuánto tardan en
contestarte los que contestan, qué tipo de destinatario responde mejor, qué
conversaciones estás dejando morir. Y **te avisa cuando la muestra es
demasiado chica para sacar conclusiones**, que es la trampa en la que cae
todo el mundo con los primeros veinte contactos.

---

## Arranque

> **¿Primera vez, o nunca usaste una terminal?** Andá directo a
> **[EMPEZAR.md](EMPEZAR.md)**: el instructivo paso a paso de la primera semana.

Necesitás [Node 18 o más nuevo](https://nodejs.org).

```bash
git clone https://github.com/Froaky/laburo.git
cd laburo
node laburo.mjs setup
```

**No hay `npm install`.** El núcleo no depende de nada: clonás y usás.
Sólo dos cosas piden instalar algo, y sólo cuando las usás:

```bash
npm install nodemailer imapflow   # para mandar mails y leer respuestas
npx playwright install chromium   # sólo si no tenés Chrome ni Edge
```

El setup pregunta a qué te dedicás y ajusta todo a tu rubro: dónde buscar
contactos, qué sirve como prueba, cómo se cobra, cuánta personalización
necesitan los mails.

Perfiles incluidos: **desarrollo de software**, **comunicación y contenidos**,
**diseño**, **administración y contabilidad**, **educación**, y uno **genérico**
para adaptar. Agregar el tuyo es copiar un `.yml` en `perfiles/`.

---

## Los comandos

| | |
|---|---|
| `hoy` | qué hay que hacer hoy — empezá por acá |
| `contactos` | mail en frío: a quién le escribiste y quién contestó |
| `postulaciones` | avisos publicados: en qué etapa está cada uno |
| `entrevista` | fichas de preparación y banco de historias |
| `mail` | mandar y detectar respuestas |
| `cv` | revisar que todas tus versiones digan lo mismo, y generar el PDF |
| `aprender` | la memoria: lo que sabe de vos y de lo que funciona |
| `doctor` | chequear que no estés por publicar tus datos |

Cada uno sin argumentos explica lo suyo.

### Contactos

```bash
node laburo.mjs contactos                          # lo pendiente
node laburo.mjs contactos importar --archivo lista.txt --grupo agencias
node laburo.mjs contactos marcar hola@x.com --estado Respondio --accion "mandar presupuesto" --en 3
node laburo.mjs contactos numeros                  # tasa de respuesta por grupo, zona, tanda
```

### Mail

```bash
node laburo.mjs mail probar  --plantilla plantillas/primer-contacto.md --lista lista.txt
node laburo.mjs mail mandar  --plantilla plantillas/primer-contacto.md --lista lista.txt --confirmar
node laburo.mjs mail respuestas
```

Tres guardas, las tres por daño concreto:

- **Sin `--confirmar` no manda nada.** Ver primero es la regla, no una opción.
- **No recontacta.** Se niega a escribirle de nuevo a alguien que ya está en
  la lista. Mandar dos veces el mismo mail en frío es peor que no mandarlo.
- **Chequea el dominio.** Descarta lo que probadamente no existe, porque cada
  rebote ensucia la reputación de tu casilla.

Cada envío queda archivado con el identificador real del servidor: sabés qué
salió y qué no, en vez de suponerlo.

### CV

```bash
node laburo.mjs cv nuevo mi-cv                       # de cv.md a HTML con diseño
node laburo.mjs cv revisar --arreglar
node laburo.mjs cv generar mi-cv --para "Estudio Vera - Diseñador"
```

Las reglas las escribís vos en `config/cv-rules.yml`. Cada vez que corregís
un dato, agregás una regla para que no vuelva:

```yaml
- id: cargo-viejo
  grave: true
  prohibido: 'Analista Junior'
  porque: desde 2025 el cargo es Semi Senior
```

Con `--para`, además de generar el PDF deja una copia con el nombre que
configuraste — porque lo primero que ve quien lo recibe es el nombre del
archivo, y `cv_v3_final_final.pdf` dice algo que no querés decir.

---

## Tus datos son tuyos

Todo lo personal vive en `config/` y `data/`, que están gitignoreados. El repo
se publica sin exponer nada.

```bash
node laburo.mjs doctor
```

Corré eso antes del primer `push`. Chequea que no haya quedado trackeado
ningún archivo con tus contactos, tus tarifas o la clave de tu casilla.

Los datos se guardan en TSV: se abren en cualquier planilla y se arreglan a
mano. Nadie debería necesitar una herramienta para reparar sus propios datos.

No hay servidor, no hay cuenta, no hay telemetría. Corre en tu máquina.

## Con una IA, como skill

El repo trae la skill lista. En Claude Code, OpenCode o cualquier CLI que siga
el [estándar de skills](https://agentskills.io):

```
/laburo
/laburo contactos
/laburo cv
```

La definición está en `.agents/skills/laburo/SKILL.md` y le dice al asistente
que lea tu memoria antes de opinar, que anote lo que le corrijas, que no
invente números y que no mande nada sin mostrártelo.

## Con una IA

Hay un [AGENTS.md](AGENTS.md) con las instrucciones para asistentes de código
(Claude Code, Codex, Gemini CLI). Le dice que lea tu memoria antes de opinar,
que anote lo que le corrijas, que no invente números y que no mande nada sin
mostrártelo.

Funciona igual sin IA. Es una herramienta de línea de comandos.

---

## Honestidad sobre lo que hace y lo que no

**No hace:** buscar ofertas por vos, escribirte el CV, garantizarte respuestas,
ni reemplazar tener algo bueno para ofrecer.

**Hace:** que no se te pierda una conversación que ya estaba andando, que no
improvises un precio, que no mandes la versión vieja de tu CV, y que lo que
vayas aprendiendo quede escrito en lugar de en tu cabeza.

La tasa de respuesta del mail en frío varía muchísimo por rubro. En rubros
técnicos con demanda insatisfecha puede rondar el 7-10%; en rubros con mucha
oferta, bastante menos. El sistema te muestra **tu** número real en vez de
uno prometido.

## Licencia

MIT. Hacé lo que quieras con esto.
