import { S3Client } from '@aws-sdk/client-s3'

const required = (name) => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const awsConfig = () => ({
  region: required('AWS_REGION'),
  bucket: required('AWS_BUCKET'),
  client: new S3Client({
    region: required('AWS_REGION'),
    credentials: {
      accessKeyId: required('AWS_ACCESS_KEY_ID'),
      secretAccessKey: required('AWS_SECRET_ACCESS_KEY'),
    },
  }),
})
