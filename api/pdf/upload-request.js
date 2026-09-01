import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { awsConfig } from '../_lib/aws.js'
import { createHash } from 'node:crypto'

const MAX_PDF_BYTES = Number(process.env.MAX_PDF_BYTES ?? 20 * 1024 * 1024)
const DOCUMENT_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/
const LINK_DURATION_MS = 30 * 60 * 1000
const MAX_COMMERCIALIZER_NAME_LENGTH = 120
const MAX_COMMERCIALIZER_EMAIL_LENGTH = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const responder = (response, status, body) => {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}

const diagnosticoSeguro = (error) => {
  const message = error instanceof Error ? error.message : ''

  if (message.startsWith('Missing required environment variable:')) {
    return message
  }

  if (/region/i.test(message)) {
    return 'La región configurada para AWS no es válida.'
  }

  if (/credential|access key/i.test(message)) {
    return 'Las credenciales de AWS no son válidas.'
  }

  return 'AWS no pudo preparar la carga firmada.'
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return responder(response, 405, { error: 'Method not allowed.' })
  }

  const { fileName, contentType, size, documentKey, expiresAt, commercializerName, commercializerEmail } = request.body ?? {}
  const nombreComercializador = typeof commercializerName === 'string' ? commercializerName.trim() : ''
  const correoComercializador = typeof commercializerEmail === 'string' ? commercializerEmail.trim() : ''
  const incluyeDatosComercializador = commercializerName !== undefined || commercializerEmail !== undefined
  const now = Date.now()
  const esArchivoValido =
    typeof fileName === 'string' &&
    /\.pdf$/i.test(fileName) &&
    contentType === 'application/pdf' &&
    Number.isInteger(size) &&
    size > 0 &&
    size <= MAX_PDF_BYTES
  const esVencimientoValido =
    Number.isSafeInteger(expiresAt) &&
    expiresAt > now &&
    expiresAt <= now + LINK_DURATION_MS + 60_000
  const sonDatosComercializadorValidos =
    !incluyeDatosComercializador || (
      nombreComercializador.length > 0 &&
      nombreComercializador.length <= MAX_COMMERCIALIZER_NAME_LENGTH &&
      correoComercializador.length > 0 &&
      correoComercializador.length <= MAX_COMMERCIALIZER_EMAIL_LENGTH &&
      EMAIL_PATTERN.test(correoComercializador)
    )

  if (
    !esArchivoValido ||
    typeof documentKey !== 'string' ||
    !DOCUMENT_KEY_PATTERN.test(documentKey) ||
    !esVencimientoValido ||
    !sonDatosComercializadorValidos
  ) {
    return responder(response, 400, { error: 'Invalid upload request.' })
  }

  try {
    const { bucket, client } = awsConfig()
    const documentHash = createHash('sha256').update(documentKey).digest('hex')
    const objectKey = `pdf/${documentHash}.pdf`
    const fields = {
      'Content-Type': 'application/pdf',
      'x-amz-meta-expires-at': String(expiresAt),
    }
    const conditions = [
      ['eq', '$Content-Type', 'application/pdf'],
      ['eq', '$x-amz-meta-expires-at', String(expiresAt)],
      ['content-length-range', 1, MAX_PDF_BYTES],
    ]

    if (incluyeDatosComercializador) {
      fields['x-amz-meta-comercializador-nombre'] = nombreComercializador
      fields['x-amz-meta-comercializador-correo'] = correoComercializador
      conditions.push(
        ['eq', '$x-amz-meta-comercializador-nombre', nombreComercializador],
        ['eq', '$x-amz-meta-comercializador-correo', correoComercializador],
      )
    }

    const upload = await createPresignedPost(client, {
      Bucket: bucket,
      Key: objectKey,
      Expires: 300,
      Fields: fields,
      Conditions: conditions,
    })

    return responder(response, 200, { upload, expiresIn: 300 })
  } catch (error) {
    console.error('Could not prepare S3 upload.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return responder(response, 500, {
      error: 'Could not prepare the upload.',
      diagnostic: diagnosticoSeguro(error),
    })
  }
}
