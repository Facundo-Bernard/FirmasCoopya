import { PDFDocument } from 'pdf-lib'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

export const PALABRA_CLAVE = 'Firma'

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

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
  return pdfjsLib
}

export async function firmarPdf(pdf: ArrayBuffer, firmaPng: string): Promise<ResultadoFirma> {
  const pdfjsLib = await cargarPdfJs()
  const bytesPdf = new Uint8Array(pdf)
  const visorPdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytesPdf) }).promise
  const documento = await PDFDocument.load(bytesPdf)
  const firma = await documento.embedPng(firmaPng)
  const paginas = documento.getPages()
  const palabra = new RegExp(`\\b${PALABRA_CLAVE}\\b`, 'i')
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
