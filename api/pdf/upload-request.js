import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { awsConfig } from '../_lib/aws.js'
import { createHash } from 'node:crypto'

const MAX_PDF_BYTES = Number(process.env.MAX_PDF_BYTES ?? 20 * 1024 * 1024)
const DOCUMENT_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/

const responder = (response, status, body) => {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return responder(response, 405, { error: 'Method not allowed.' })
  }

  const { fileName, contentType, size, documentKey } = request.body ?? {}
  const esArchivoValido =
    typeof fileName === 'string' &&
    /\.pdf$/i.test(fileName) &&
    contentType === 'application/pdf' &&
    Number.isInteger(size) &&
    size > 0 &&
    size <= MAX_PDF_BYTES

  if (!esArchivoValido || typeof documentKey !== 'string' || !DOCUMENT_KEY_PATTERN.test(documentKey)) {
    return responder(response, 400, { error: 'Invalid upload request.' })
  }

  try {
    const { bucket, client } = awsConfig()
    const documentHash = createHash('sha256').update(documentKey).digest('hex')
    const objectKey = `pdf/${documentHash}.pdf`
    const upload = await createPresignedPost(client, {
      Bucket: bucket,
      Key: objectKey,
      Expires: 300,
      Fields: {
        'Content-Type': 'application/pdf',
      },
      Conditions: [
        ['eq', '$Content-Type', 'application/pdf'],
        ['content-length-range', 1, MAX_PDF_BYTES],
      ],
    })

    return responder(response, 200, { upload, expiresIn: 300 })
  } catch (error) {
    console.error('Could not prepare S3 upload.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return responder(response, 500, { error: 'Could not prepare the upload.' })
  }
}
