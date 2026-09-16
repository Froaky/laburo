# Plantillas de CV

`clasico.html` es sobria y sirve para casi cualquier rubro. Se llena sola con
tus datos de `config/me.yml` y con el contenido de `cv.md`.

```bash
node laburo.mjs cv nuevo mi-cv
```

## Hacer la tuya

Copiá el archivo con otro nombre y editá el CSS. Los campos que se
reemplazan son:

`{{nombre}}` `{{titulo}}` `{{color}}` `{{contenido}}`
`{{datos_html}}` (ubicación, mail, teléfono y links, ya armados y sin los vacíos)

`{{contenido}}` es tu `cv.md` convertido a HTML. `{{color}}` sale de
`config/me.yml` (`entrega.color`), y si no está usa un azul sobrio.

Después:

```bash
node laburo.mjs cv nuevo mi-cv --plantilla plantillas/cv/la-mia.html
```

## Una advertencia de diseño

Si agregás `break-inside: avoid` a las secciones enteras, vas a terminar con
una tercera hoja casi vacía: la regla empuja secciones completas a una página
nueva en vez de dejarlas partirse. Aplicalo sólo a bloques chicos.
