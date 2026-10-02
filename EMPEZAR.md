# Empezar

Instructivo de la primera semana. No hace falta saber programar.

Si querés saber **qué es** esto y por qué existe, está en el [README](README.md).
Esto de acá es **qué hacés, en qué orden**.

---

## Antes que nada: la terminal

Casi todo se hace escribiendo una línea en una ventana negra. Si nunca abriste
una, no es difícil:

- **Windows:** tecla Windows → escribí `powershell` → Enter
- **Mac:** Cmd+Espacio → escribí `terminal` → Enter
- **Linux:** ya sabés

Para moverte hasta una carpeta se usa `cd` y la ruta. Si la arrastrás a la
ventana, se escribe sola.

Una sola cosa más: necesitás **Node 18 o más nuevo**, que se baja de
[nodejs.org](https://nodejs.org). Para chequear si ya lo tenés:

```bash
node --version
```

Si te contesta un número, estás.

---

## Día 1 — Que funcione (10 minutos)

### 1. Bajarlo

```bash
git clone https://github.com/Froaky/laburo.git
cd laburo
```

Si no tenés `git`, bajá el ZIP desde GitHub (botón verde **Code → Download ZIP**),
descomprimilo, y entrá a esa carpeta con `cd`.

**No hay `npm install`.** Clonás y usás.

### 2. Configurarlo

```bash
node laburo.mjs setup
```

Te va a preguntar tu nombre, tu mail, a qué te dedicás y cuánto querés cobrar.
Elegí el perfil que más se parezca a lo tuyo:

| | |
|---|---|
| `desarrollo` | programación, sistemas, datos |
| `comunicacion` | redacción, prensa, contenidos, marketing |
| `diseno` | gráfico, UX/UI, industrial, audiovisual |
| `administracion` | contabilidad, impuestos, administración |
| `educacion` | docencia, capacitación, formación |
| `generico` | cualquier otra cosa — después lo ajustás |

El perfil no es decorativo: cambia **a quién te conviene escribirle**, **qué
sirve como prueba en tu rubro**, **cómo se cobra**, y **cuánta personalización
exige cada mail**. En diseño y comunicación el sistema directamente te frena si
mandás el mismo texto a treinta lugares, porque en esos rubros eso juega en
contra.

Cuando termina deja cuatro archivos en `config/` y `data/`. **Todo eso es tuyo y
no se sube a ningún lado** — está en el `.gitignore`.

### 3. Probar que anda

```bash
node laburo.mjs hoy
```

Si te saluda por tu nombre, listo.

---

## Día 2 — Tu CV y tus datos (30 minutos)

### 4. Poné tu CV

Creá un archivo `cv.md` en la carpeta. Es texto común, con títulos:

```markdown
# Ana Gutiérrez
Diseñadora gráfica · ana@ejemplo.com · +54 9 11 5555-5555
ana-portfolio.com

## Experiencia

### Diseñadora senior — Estudio Vera (2023 – hoy)
- Identidad visual de 12 marcas, de la marca al manual
- Rediseño del sitio de X: el tiempo de carga bajó de 6s a 1,8s

## Educación
...
```

No te preocupes por el diseño. Eso lo pone el sistema después.

### 5. Anotá lo que sabés de vos

Esto es lo que hace que no te pregunten dos veces lo mismo:

```bash
node laburo.mjs aprender "Cobro 20 la hora y no bajo por volumen chico" --tipo preferencia
node laburo.mjs aprender "Terminé la carrera en 2021" --tipo hecho
node laburo.mjs aprender "Busco remoto o híbrido, no presencial 5 días" --tipo preferencia
```

Los tipos son `preferencia`, `hecho`, `correccion`, `leccion` y `perfil`. Todo
va a parar a `data/aprendido.md`, que es lo primero que lee cualquiera que te
ayude después —una persona o una IA.

**Cada vez que corrijas algo, anotalo.** Es la diferencia entre una herramienta
que te sirve cada vez más y una que te sirve igual siempre.

---

## Día 3 — La lista (la parte aburrida que más rinde)

Esta es la parte que todo el mundo saltea y es la que decide el resultado.

**No mandes mails a "recursos humanos" en general.** Mandale a quien tiene el
problema que vos resolvés. En lugares chicos, eso suele ser el dueño o el socio.

El perfil que elegiste ya te dice dónde buscar la lista:

```bash
node laburo.mjs contactos
```

Para cargarlos de a uno:

```bash
node laburo.mjs contactos agregar --email hola@estudiovera.com \
    --empresa "Estudio Vera" --persona "Luciana" --grupo estudios --zona "CABA"
```

O de a muchos, con un archivo de texto, una línea por contacto, separado por
tabulaciones:

```
hola@estudiovera.com	Estudio Vera	Luciana
contacto@agencianorte.com	Agencia Norte
info@editorialsur.com
```

```bash
node laburo.mjs contactos importar --archivo lista.txt --grupo estudios
```

### El `--grupo` importa más de lo que parece

Es una etiqueta que te inventás vos: `estudios`, `pymes`, `agencias`, o `A`/`B`/`C`.
Sirve para que después `contactos numeros` te diga **qué tipo de destinatario te
contesta** y cuál no. Sin grupos, mandás cien mails y no aprendés nada.

Treinta contactos bien elegidos valen más que doscientos sacados de un
directorio. Y ojo con los mails de directorios: rebotan muchísimo.

---

## Día 4 — El primer mail

### 6. Escribí tu plantilla

Copiá `plantillas/primer-contacto.md` y reescribila con lo tuyo. Los `{{campos}}`
se llenan solos desde tu configuración:

- `{{titulo}}`, `{{firma}}`, `{{telefono}}`, `{{email}}`, `{{links}}` → de `config/me.yml`
- `{{gancho}}` → **la línea que escribís vos para cada destinatario**

Lo que va entre corchetes `[así]` es instrucción para vos: reemplazalo.

Una regla que vale para todos los rubros: **cosas chequeables, no adjetivos.**
"Coordiné la comunicación de 4 marcas durante 2 años" sirve. "Soy proactivo y
orientado a resultados" no dice absolutamente nada.

### 7. Configurá tu casilla

Creá un archivo `.env.local` con:

```
CORREO_USUARIO=tumail@gmail.com
CORREO_CLAVE=xxxx xxxx xxxx xxxx
```

**Esa NO es la contraseña de tu cuenta.** Es una *clave de aplicación*: en Gmail
se genera en Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones.
Si ponés tu contraseña real, no va a funcionar.

`.env.local` está en el `.gitignore`: no se sube nunca.

Para mandar mails hace falta instalar dos cosas, una sola vez:

```bash
npm install nodemailer imapflow
```

### 8. Probá ANTES de mandar

El archivo de la lista de envío tiene **otro formato** que el de importar
contactos — acá la segunda columna es el gancho, la línea personal:

```
hola@estudiovera.com	Vi la identidad que hicieron para Mercado Norte, muy buen trabajo con la tipografía.
contacto@agencianorte.com	Los sigo desde la campaña de verano del año pasado.
```

```bash
node laburo.mjs mail probar --plantilla plantillas/mia.md --lista lista.txt
```

`probar` te muestra exactamente lo que se va a mandar, a quién, y **no manda
nada**. Mirá dos o tres mails completos antes de seguir.

Después, mandátelo a vos mismo primero:

```bash
node laburo.mjs mail mandar --plantilla plantillas/mia.md --para tumail@gmail.com --confirmar
```

Abrilo en tu casilla y fijate cómo se ve de verdad.

### 9. Ahora sí

```bash
node laburo.mjs mail mandar --plantilla plantillas/mia.md --lista lista.txt --adjunto cv.pdf --confirmar
```

Sin `--confirmar` no sale nada, nunca.

---

## Día 5 en adelante — La rutina

Esto es todo lo que hacés por día:

```bash
node laburo.mjs hoy
```

Te dice qué conversaciones se están enfriando, qué quedó pendiente, y qué
postulaciones no tuvieron respuesta.

### Cuando alguien contesta

Anotalo **en el momento**. Es lo único que el sistema no puede adivinar:

```bash
node laburo.mjs contactos marcar hola@estudiovera.com --estado Respondio \
    --persona "Luciana" --accion "mandar presupuesto" --en 3
```

`--en 3` significa "recordámelo en 3 días". Eso aparece en `hoy` hasta que lo hagas.

Los estados van siguiendo la conversación: `Enviado` → `Respondio` → `Cotizado` →
`Negociando` → `Reunion` → `Cerrado`. También hay `Rebotado` (la dirección no
existe) y `Frio` (pasaron los días).

**Esta es la parte que decide todo.** Conseguir que te contesten es lo caro.
Dejar morir una respuesta es tirar ese trabajo a la basura.

### Cuando te postulás a un aviso

```bash
node laburo.mjs postulaciones agregar --empresa "Editorial Sur" --puesto "Diseñadora" \
    --donde LinkedIn --porque "catálogo lindo, equipo chico, 100% remoto"
```

El `--porque` parece al pedo. A los dos meses, con veinte postulaciones encima,
no te vas a acordar por qué te anotaste en esa.

```bash
node laburo.mjs postulaciones marcar "Editorial Sur" --estado Entrevista --accion "preparar casos" --en 2
```

### Cuando te preguntan cuánto cobrás

```bash
node laburo.mjs hoy
```

Tu número está ahí arriba, en **PLATA (no improvisar)**, con el piso.

Improvisar es el error caro: el número que decís queda de ancla para siempre, y
en mercados chicos los clientes hablan entre ellos. Decilo igual que la vez
anterior.

### Cuando tenés entrevista

```bash
node laburo.mjs entrevista ficha "Editorial Sur"
node laburo.mjs entrevista historias
```

Las historias son tus ejemplos concretos —un problema, qué hiciste, qué pasó—
escritos una vez y reutilizados. Son las mismas preguntas en todas las
entrevistas; no las improvises cada vez.

### Antes de mandar un CV

```bash
node laburo.mjs cv revisar
```

Chequea **todas** tus versiones a la vez, no la que tenés abierta. Es el error
más tonto y más común: corregís un dato en una, y mandás otra tres días después.

```bash
node laburo.mjs cv nuevo editorial     # de cv.md a HTML con diseño
node laburo.mjs cv generar editorial   # a PDF listo para adjuntar
```

Cada vez que corrijas un dato, agregá la regla en `config/cv-rules.yml` para que
no vuelva nunca:

```yaml
  - id: cargo-viejo
    grave: true
    prohibido: 'Diseñadora Junior'
    porque: desde 2024 el cargo es Senior
```

---

## Cada dos semanas

```bash
node laburo.mjs aprender revisar --guardar
```

Mira tus contactos reales y saca conclusiones: cuánto tardan en contestarte los
que contestan, qué grupo responde mejor, qué conversaciones estás dejando morir.

**Te avisa cuando la muestra es muy chica para concluir nada.** Esa es la trampa
en la que cae todo el mundo: dos respuestas de seis contactos parece un 33% y no
es nada — con veinte contactos eso pasa por casualidad una de cada quince veces.
Preferí no saber antes que creer algo falso.

```bash
node laburo.mjs contactos numeros
node laburo.mjs postulaciones numeros
```

---

## Usarlo con una inteligencia artificial

El repo trae un agente adentro. Si usás Claude Code, Cursor, OpenCode o similar,
abrí la carpeta y escribí:

```
/laburo
```

Arranca leyendo tu situación —`hoy` y `data/aprendido.md`— antes de opinar, así
que no te hace repetir lo que ya contaste. Podés pedirle cosas en castellano:
"ayudame a escribir el mail para este estudio", "preparame para la entrevista del
jueves", "¿a quién le estoy dejando de contestar?".

Si no usás ninguna de esas, podés pegar el contenido de `.agents/skills/laburo/SKILL.md`
en cualquier chat de IA y pedirle que siga esas instrucciones.

### Por qué hay scripts y no es todo IA

Las partes que no pueden fallar están en código a propósito: que un mail
realmente haya salido, que se revisen **todos** los CV, que no le escribas dos
veces a la misma persona. Eso no puede depender de que un modelo se acuerde.

Vos ponés el criterio. Los scripts ponen las garantías.

---

## Si algo sale mal

```bash
node laburo.mjs doctor
```

Te dice qué falta y qué está mal, incluyendo si estás por filtrar datos tuyos.

| Pasa esto | Es esto |
|---|---|
| `node: command not found` | falta Node → [nodejs.org](https://nodejs.org) |
| `Falta config/me.yml` | no corriste `node laburo.mjs setup` |
| `Esto necesita "nodemailer"` | `npm install nodemailer imapflow` |
| `Falta .env.local` | ver el paso 7 |
| El mail no sale y la clave parece bien | es *clave de aplicación*, no la contraseña de la cuenta |
| Un comando no sabés cómo se usa | escribilo sin nada: `node laburo.mjs contactos` |

Todos tus datos están en `data/`, en archivos de texto separados por tabulaciones.
Si algo quedó mal cargado, **abrilos con Excel o con el bloc de notas y
arreglalo a mano.** Están en ese formato justamente para eso: nadie debería
necesitar una herramienta para arreglar sus propios datos.

---

## Las tres cosas, si no te acordás de nada más

1. **Anotá la respuesta el día que llega.** Lo caro es que te contesten; dejarlo
   enfriar cinco días es tirar ese trabajo.
2. **Decí siempre el mismo número.** El primero que decís queda de ancla.
3. **Revisá todos los CV, no el que tenés abierto.**

El resto es tener la lista hecha y aparecer todos los días.
