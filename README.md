# FirmaCoopya

Aplicación web para dibujar una firma electrónica, aplicarla sobre un PDF y enviar la papelería firmada a `info@asistodo.com.ar`.

## Desarrollo

```bash
npm install
npm run dev
```

## Envío de correo

El formulario utiliza FormSubmit para enviar la papelería a `info@asistodo.com.ar` en un solo correo. Adjunta el PDF firmado y un segundo PDF con la foto de la persona sosteniendo su DNI, una selfie guiñando, el frente y dorso del documento y el comprobante bancario, con un límite total de 10 MB.

La primera vez, FormSubmit envía un mensaje de activación a `info@asistodo.com.ar`. Es necesario confirmar ese mensaje una sola vez para habilitar las entregas posteriores.
