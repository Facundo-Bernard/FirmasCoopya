import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export const PALABRA_CLAVE = 'Firma'

const ANCHO_FIRMA = 140
const ALTO_FIRMA = 140

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

type ResultadoFirma = {
  bytes: Uint8Array
  coincidencias: number
}

export async function firmarPdf(pdf: ArrayBuffer, firmaPng: string): Promise<ResultadoFirma> {
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
