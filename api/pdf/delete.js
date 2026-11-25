import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'node:crypto'
import { awsConfig } from '../_lib/aws.js'

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

  const authorization = request.headers.authorization
  const match = typeof authorization === 'string' ? /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization) : null
  const deleteAfterEmailConfirmation = request.body?.reason === 'email-confirmed'

  if (!match || !DOCUMENT_KEY_PATTERN.test(match[1])) {
    response.setHeader('WWW-Authenticate', 'Bearer')
    return responder(response, 401, { error: 'Invalid document key.' })
  }

  try {
    const { bucket, client } = awsConfig()
    const documentHash = createHash('sha256').update(match[1]).digest('hex')
    const objectKey = `pdf/${documentHash}.pdf`

    try {
      const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }))
      const expiresAt = Number(object.Metadata?.['expires-at'])

      const documentExpired = Number.isSafeInteger(expiresAt) && Date.now() >= expiresAt
      if (!documentExpired && !deleteAfterEmailConfirmation) {
        return responder(response, 403, { error: 'Document has not expired.' })
      }
    } catch (error) {
      if (error && typeof error === 'object' && '$metadata' in error && error.$metadata?.httpStatusCode === 404) {
        return responder(response, 200, { deleted: true })
      }
      throw error
    }

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }))
    return responder(response, 200, { deleted: true })
  } catch (error) {
    console.error('Could not delete S3 document.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return responder(response, 500, { error: 'Could not delete document.' })
  }
}
