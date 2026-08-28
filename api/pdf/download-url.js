import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash } from 'node:crypto'
import { awsConfig } from '../_lib/aws.js'

const DOCUMENT_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/
const URL_EXPIRATION_SECONDS = 60

const responder = (response, status, body) => {
  response.setHeader('Cache-Control', 'no-store')
  return response.status(status).json(body)
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return responder(response, 405, { error: 'Method not allowed.' })
  }

  const authorization = request.headers.authorization
  const match = typeof authorization === 'string' ? /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization) : null

  if (!match || !DOCUMENT_KEY_PATTERN.test(match[1])) {
    response.setHeader('WWW-Authenticate', 'Bearer')
    return responder(response, 401, { error: 'Invalid document key.' })
  }

  try {
    const { bucket, client } = awsConfig()
    const documentHash = createHash('sha256').update(match[1]).digest('hex')
    const objectKey = `pdf/${documentHash}.pdf`

    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }))
    } catch (error) {
      if (error && typeof error === 'object' && '$metadata' in error && error.$metadata?.httpStatusCode === 404) {
        return responder(response, 404, { error: 'Document not found.' })
      }
      throw error
    }

    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ResponseContentType: 'application/pdf',
        ResponseContentDisposition: 'inline; filename="papeleria.pdf"',
      }),
      { expiresIn: URL_EXPIRATION_SECONDS },
    )

    return responder(response, 200, { url, expiresIn: URL_EXPIRATION_SECONDS })
  } catch (error) {
    console.error('Could not prepare S3 download.', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return responder(response, 500, { error: 'Could not prepare download.' })
  }
}
