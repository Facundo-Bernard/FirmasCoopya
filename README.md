# FirmaCoopya

Aplicación web para dibujar una firma electrónica, aplicarla sobre un PDF y enviar la papelería firmada a `info@asistodo.com.ar`.

## Desarrollo

```bash
npm install
npm run dev
```

## Envío de correo

El formulario utiliza FormSubmit para enviar la papelería a `info@asistodo.com.ar`. El PDF firmado y los archivos opcionales se adjuntan automáticamente y tienen un límite total de 10 MB.

La primera vez, FormSubmit envía un mensaje de activación a `info@asistodo.com.ar`. Es necesario confirmar ese mensaje una sola vez para habilitar las entregas posteriores.
