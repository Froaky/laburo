# Plantillas

Formato: la primera línea es `Asunto: ...`, después una línea con `---`, y
después el cuerpo.

## Campos que se llenan solos

Salen de `config/me.yml`:

`{{nombre}}` `{{firma}}` `{{titulo}}` `{{email}}` `{{telefono}}`
`{{ubicacion}}` `{{links}}`

## `{{gancho}}`

Es la línea propia de cada destinatario. Se pone en el archivo de la lista,
separada por un tabulador:

```
hola@estudio.com	Vi la identidad que hicieron para X y me gustó la decisión tipográfica.
hola@otra.com	Los encontré por la nota de Y sobre su proyecto de Z.
```

Si tu perfil tiene `personalizacion: alto`, el sistema no te va a dejar mandar
una tanda sin esto. No es capricho: en algunos rubros el mail **es** la muestra
de trabajo.

## Escribí las tuyas

Copiá cualquiera de estas a `plantillas/mias/` (gitignoreada) y reescribila.
Las de acá son andamio, no producto: lo que las hace funcionar es tu
experiencia concreta adentro.
