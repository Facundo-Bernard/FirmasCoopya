import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.RESEND_API_KEY = env.RESEND_API_KEY || process.env.RESEND_API_KEY
  process.env.EMAIL_DESTINO = env.EMAIL_DESTINO || process.env.EMAIL_DESTINO

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      {
        name: 'local-api-enviar',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/enviar' && req.method === 'POST') {
              try {
                // @ts-expect-error dynamic import of local api handler
                const { POST: enviarHandler } = await import('./api/enviar.js')

                const chunks: Buffer[] = []
                for await (const chunk of req) {
                  chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
                }
                const bodyBuffer = Buffer.concat(chunks)

                const webHeaders = new Headers()
                for (const [key, value] of Object.entries(req.headers)) {
                  if (value) {
                    if (Array.isArray(value)) {
                      value.forEach(v => webHeaders.append(key, v))
                    } else {
                      webHeaders.set(key, value)
                    }
                  }
                }

                const fullUrl = `http://${req.headers.host || 'localhost:5173'}${req.url}`
                const init: RequestInit = {
                  method: 'POST',
                  headers: webHeaders,
                  body: bodyBuffer,
                }
                // @ts-ignore Node 18+ streaming body duplex support
                init.duplex = 'half'

                const webRequest = new Request(fullUrl, init)
                const webResponse = await enviarHandler(webRequest)

                res.statusCode = webResponse.status
                webResponse.headers.forEach((v: string, k: string) => res.setHeader(k, v))
                const responseText = await webResponse.text()
                res.end(responseText)
                return
              } catch (error: unknown) {
                console.error('Error en middleware local de /api/enviar:', error)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                const mensaje = error instanceof Error ? error.message : 'Error interno local'
                res.end(JSON.stringify({ error: mensaje }))
                return
              }
            }
            next()
          })
        },
      },
    ],
  }
})
