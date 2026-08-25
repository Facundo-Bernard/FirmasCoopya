import { PDFDocument } from 'pdf-lib'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

export const PALABRA_CLAVE = 'firma_aqui'
export const PALABRA_CLAVE_COMERCIALIZADOR = 'firma_comer_aqui'

const ANCHO_FIRMA = 140
const ALTO_FIRMA = 140

type ResultadoFirma = {
  bytes: Uint8Array
  coincidencias: number
}

type PromiseConCompatibilidad = typeof Promise & {
  withResolvers?: <T>() => {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: unknown) => void
  }
}

const agregarCompatibilidadSafari = () => {
  const Stream = globalThis.ReadableStream

  if (!Stream || !Symbol.asyncIterator || Stream.prototype[Symbol.asyncIterator]) {
    return
  }

  Object.defineProperty(Stream.prototype, Symbol.asyncIterator, {
    configurable: true,
    value(this: ReadableStream<unknown>) {
      const lector = this.getReader()

      return {
        next: () => lector.read(),
        return: async () => {
          lector.releaseLock()
          return { done: true, value: undefined }
        },
        [Symbol.asyncIterator]() {
          return this
        },
      }
    },
  })
}

const cargarPdfJs = async () => {
  const Promesa = Promise as PromiseConCompatibilidad

  if (!Promesa.withResolvers) {
    Promesa.withResolvers = <T>() => {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: unknown) => void
      const promise = new Promise<T>((resolver, rechazar) => {
        resolve = resolver
        reject = rechazar
      })

      return { promise, resolve, reject }
    }
  }

  agregarCompatibilidadSafari()

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
  return pdfjsLib
}

export async function firmarPdf(
  pdf: ArrayBuffer,
  firmaPng: string,
  palabraClave = PALABRA_CLAVE,
): Promise<ResultadoFirma> {
  const pdfjsLib = await cargarPdfJs()
  const bytesPdf = new Uint8Array(pdf)
  let visorPdf

  try {
    visorPdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytesPdf) }).promise
  } catch (error) {
    throw new Error(`PDF.js no pudo leer el archivo: ${error instanceof Error ? error.message : String(error)}`)
  }

  let documento: PDFDocument

  try {
    documento = await PDFDocument.load(bytesPdf)
  } catch (error) {
    throw new Error(
      `pdf-lib no pudo abrir el archivo. Puede estar protegido, encriptado o ser invalido: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  let firma

  try {
    firma = await documento.embedPng(firmaPng)
  } catch (error) {
    throw new Error(`No se pudo leer la imagen PNG de la firma: ${error instanceof Error ? error.message : String(error)}`)
  }
  const paginas = documento.getPages()
  const palabra = new RegExp(`\\b${palabraClave}\\b`, 'i')
  let coincidencias = 0

  for (let indice = 0; indice < visorPdf.numPages; indice += 1) {
    const paginaPdf = paginas[indice]
    const pagina = await visorPdf.getPage(indice + 1)
    const contenido = await pagina.getTextContent()

    for (const item of contenido.items) {
      if (!('str' in item) || !palabra.test(item.str)) {
        continue
      }

      const [, , , , posicionX, posicionY] = item.transform
      paginaPdf.drawImage(firma, {
        x: Math.max(0, posicionX - 4),
        y: Math.max(0, posicionY - ALTO_FIRMA + 80),
        width: ANCHO_FIRMA,
        height: ALTO_FIRMA,
      })
      coincidencias += 1
    }
  }

  return { bytes: await documento.save(), coincidencias }
}
