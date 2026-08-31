# FirmaAsistodo

Aplicación web para dibujar una firma electrónica, aplicarla sobre un PDF y enviar la papelería firmada a `info@asistodo.com.ar`.

## Desarrollo

```bash
npm install
npm run dev
```

## Rutas de la aplicación

| Ruta | Uso |
| --- | --- |
| `/` | Menú principal. |
| `/firma-digital` | Pantalla donde la persona dibuja su firma. Si recibe un link con `codigo` y `vence`, recupera automáticamente la papelería privada. |
| `/unificarpap` | Aplica la firma al PDF y solicita la documentación final de la persona. |
| `/firma-comercializador` | El comercializador completa los datos, selecciona un plan, aplica su firma al PDF y genera un link temporal para que la otra persona continúe con su firma. |
| `/papeleria-aws` | Carga directa de una papelería privada y generación de un link temporal para firmar. |
| `/tutorial` | Tutorial de uso de la aplicación. |

## Rutas internas de papelería privada

Estas rutas se ejecutan en Vercel y no exponen las credenciales de AWS al navegador:

| Ruta | Método | Uso |
| --- | --- | --- |
| `/api/pdf/upload-request` | `POST` | Prepara una carga temporal y firmada hacia S3. |
| `/api/pdf/download-url` | `GET` | Obtiene una URL de descarga temporal para la papelería asociada al link. |
| `/api/pdf/delete` | `POST` | Elimina de S3 una papelería cuyo link ya venció. |

Los links duran 30 minutos. Los PDF nuevos guardan su vencimiento en el almacenamiento privado; luego de vencer no se pueden recuperar y el sistema intenta eliminarlos de S3.

## Envío de correo

El formulario utiliza FormSubmit para enviar la papelería a `info@asistodo.com.ar` en un solo correo. Adjunta el PDF firmado y un segundo PDF con la foto de la persona sosteniendo su DNI, una selfie guiñando, el frente y dorso del documento y el comprobante bancario, con un límite total de 10 MB.

La primera vez, FormSubmit envía un mensaje de activación a `info@asistodo.com.ar`. Es necesario confirmar ese mensaje una sola vez para habilitar las entregas posteriores.
