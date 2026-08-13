# Arquitectura de FirmaCoopya

## Objetivo del rediseño

Eliminar del flujo del cliente cualquier decisión sobre archivos. El comercializador prepara previamente el trámite y obtiene un enlace. El cliente abre ese enlace, firma, toma las fotos solicitadas y confirma. El sistema identifica automáticamente la papelería correcta, aplica la firma y envía el correo con los adjuntos.

La solución continúa implementando **firma electrónica visual**, no firma digital criptográfica con certificados.

## Decisión principal

Cada trámite tendrá un enlace como:

```text
https://firmas.coopya.com.ar/tramite/{token}
```

`token` debe ser aleatorio, largo, no correlativo y difícil de adivinar. No debe incluir DNI, email ni el identificador interno de la base de datos. Se recomienda que expire y que deje de aceptar modificaciones después de completar el trámite.

## Componentes

### Frontend público

Mantiene React, Vite y Bootstrap. Sus responsabilidades serán:

- Leer el token de la URL.
- Mostrar datos mínimos para que el cliente confirme que es su trámite.
- Dibujar y conservar temporalmente la firma.
- Guiar las capturas obligatorias.
- Enviar firma, fotos, DNI y email al backend.
- Mostrar el resultado final sin pedir que el cliente cargue un PDF.

### Panel del comercializador

Puede formar parte del mismo frontend bajo rutas privadas. Sus responsabilidades serán:

- Iniciar sesión.
- Crear un trámite con datos del cliente y del comercializador.
- Cargar la papelería correspondiente.
- Validar que el PDF contiene al menos una marca `firma_aqui`.
- Generar y copiar el enlace para compartir.
- Consultar estado, fecha de envío y errores.
- Reintentar el correo cuando sea necesario.

### Backend

Se recomienda Spring Boot con Java 21, Maven e iText, respetando el stack originalmente definido. Sus responsabilidades serán:

- Autenticar comercializadores.
- Crear trámites y generar tokens seguros.
- Validar y guardar PDFs y evidencias.
- Entregar al cliente sólo la información correspondiente a su token.
- Aplicar la firma a la papelería en las marcas `firma_aqui`.
- Crear el PDF de documentación.
- Enviar el correo con ambos PDFs adjuntos.
- Registrar estados, errores y eventos importantes.

La generación final del PDF debe ocurrir en el backend. El navegador puede mostrar una previsualización, pero no debe ser la fuente definitiva del documento firmado.

### Base de datos

Se recomienda PostgreSQL. Los archivos no deben guardarse dentro de la base de datos; allí se guardan sus referencias, nombres, tamaños y hashes.

### Almacenamiento de archivos

Usar almacenamiento privado compatible con S3. En desarrollo puede utilizarse MinIO local. Los documentos deben descargarse únicamente mediante el backend o enlaces temporales.

### Servicio de correo

El envío debe pasar del frontend al backend. El backend enviará un único correo a `info@asistodo.com.ar` con:

- Papelería firmada en PDF.
- Documentación del cliente en PDF.

El asunto seguirá el formato `PAPELERIA {DNI}`. Si el proveedor falla, el trámite debe quedar pendiente de correo y permitir un reintento sin volver a solicitar la firma.

## Modelo de datos inicial

### Comercializador

- `id`
- `nombre`
- `email`
- `activo`
- `creado_en`

### Tramite

- `id` interno UUID
- `token_hash`
- `comercializador_id`
- `cliente_nombre`
- `cliente_dni`
- `cliente_email`
- `estado`
- `vence_en`
- `creado_en`
- `completado_en`
- `enviado_en`
- `ultimo_error`

### Documento

- `id`
- `tramite_id`
- `tipo`: `ORIGINAL`, `FIRMADO` o `DOCUMENTACION`
- `storage_key`
- `nombre_original`
- `mime_type`
- `tamano`
- `sha256`
- `creado_en`

### Evento de auditoría

- `id`
- `tramite_id`
- `tipo`
- `fecha`
- `detalle_tecnico`

Las fotos individuales pueden guardarse temporalmente durante el procesamiento y eliminarse después de crear el PDF de documentación, según la política de conservación definida.

## Estados del trámite

```text
BORRADOR
  -> LISTO
  -> ABIERTO
  -> PROCESANDO
  -> COMPLETADO_PENDIENTE_EMAIL
  -> ENVIADO
```

Estados alternativos:

- `VENCIDO`
- `CANCELADO`
- `ERROR`

El paso de `PROCESANDO` a un estado final debe ser idempotente: dos pulsaciones o reintentos no pueden generar documentos o correos duplicados.

## Flujo completo

1. El comercializador inicia sesión.
2. Crea un trámite y completa los datos del cliente.
3. Carga el PDF correspondiente.
4. El backend valida el archivo y cuenta las marcas `firma_aqui`.
5. El comercializador confirma y obtiene el enlace.
6. El cliente abre el enlace sin iniciar sesión.
7. El backend valida token, vencimiento y estado.
8. El cliente firma y realiza las capturas guiadas.
9. El frontend envía las evidencias al backend una sola vez.
10. El backend vuelve a validar todos los archivos.
11. El backend aplica la firma al PDF original.
12. El backend crea el PDF de documentación.
13. Ambos PDFs se guardan en almacenamiento privado.
14. El backend envía un único correo con ambos adjuntos.
15. El trámite queda en `ENVIADO` y el cliente ve la confirmación.

## API propuesta

### Rutas privadas

- `POST /api/admin/login`
- `POST /api/admin/tramites`
- `POST /api/admin/tramites/{id}/documento`
- `POST /api/admin/tramites/{id}/habilitar`
- `GET /api/admin/tramites`
- `GET /api/admin/tramites/{id}`
- `POST /api/admin/tramites/{id}/reenviar`
- `POST /api/admin/tramites/{id}/cancelar`

### Rutas públicas

- `GET /api/public/tramites/{token}`
- `POST /api/public/tramites/{token}/completar`

El endpoint público de consulta debe devolver sólo nombre, DNI parcialmente oculto, estado y vencimiento. El endpoint de finalización recibirá `multipart/form-data` con firma y evidencias.

## Validaciones mínimas

- PDF válido, no cifrado y con al menos una marca `firma_aqui`.
- Token existente, vigente y no utilizado.
- DNI del formulario coincidente con el trámite.
- Email válido.
- Firma no vacía y en PNG transparente.
- Todas las fotos obligatorias presentes.
- Evidencias capturadas desde `getUserMedia`, sin selector de archivos en el frontend.
- Tipos de archivo reales verificados por contenido, no sólo por extensión.
- Límites individuales y totales de tamaño.
- Coordenadas y páginas válidas al aplicar la firma.

## Seguridad y privacidad

- HTTPS obligatorio.
- Tokens públicos aleatorios y guardados como hash.
- Autenticación y autorización para el panel privado.
- Bucket de archivos privado.
- Cifrado en tránsito y, si el proveedor lo permite, en reposo.
- Rate limiting para enlaces públicos y login.
- No registrar DNI, tokens, firmas ni fotos en logs.
- Consentimiento visible antes de tomar y enviar las fotos.
- Política explícita de conservación y eliminación de documentación.
- Registro de quién creó, habilitó, completó y reenvió cada trámite.

La captura desde cámara reduce errores y reutilización accidental, pero por sí sola no demuestra identidad ni evita fraude. Una validación de identidad real requeriría controles adicionales y debe tratarse como una etapa futura separada.

Las validaciones del navegador no constituyen una frontera de seguridad: un usuario avanzado puede modificar el frontend o usar una cámara virtual. Por eso, el backend deberá volver a validar formato, tamaño, dimensiones, estado del trámite y secuencia de evidencias antes de aceptar el envío.

## Despliegue sugerido

- Frontend: Vercel, como actualmente.
- Backend: contenedor Spring Boot en un servicio persistente.
- Base de datos: PostgreSQL administrado o local según el entorno.
- Archivos: bucket S3 compatible; MinIO para desarrollo local.
- Correo: SMTP o proveedor transaccional configurado sólo en el backend.

Las credenciales deben ser variables de entorno y nunca formar parte del repositorio ni enviarse al navegador.

## Etapas de implementación

### Etapa 1: núcleo del backend

- Base de datos, almacenamiento, creación de trámites y tokens.
- Carga de papelería desde el panel.
- Consulta pública por token.

### Etapa 2: firma por enlace

- Nueva ruta pública `/tramite/:token`.
- Eliminación de la carga de PDF para el cliente.
- Envío de firma y evidencias al backend.
- Generación de PDFs en servidor.

### Etapa 3: correo y operación

- Correo desde backend.
- Estados, reintentos y auditoría.
- Panel de seguimiento para comercializadores.

### Etapa 4: endurecimiento

- Vencimiento y cancelación de enlaces.
- Retención automática de archivos.
- Monitoreo, copias de seguridad y alertas.
- Controles adicionales de identidad si el negocio los requiere.

## Decisiones pendientes antes de programar

- Dónde se desplegará Spring Boot.
- Qué PostgreSQL y almacenamiento se utilizarán.
- Qué proveedor enviará los correos.
- Cuánto tiempo se conservarán fotos y documentos.
- Si un enlace podrá reabrirse después de un error o sólo mediante el comercializador.
- Qué datos del cliente verá el comercializador y cuáles podrá corregir.
- Si habrá una única plantilla de papelería o varias por producto.
