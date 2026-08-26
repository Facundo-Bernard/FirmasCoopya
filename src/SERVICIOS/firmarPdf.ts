import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

export const PALABRA_CLAVE = 'firma_aqui'
export const PALABRA_CLAVE_COMERCIALIZADOR = 'firma_comer_aqui'

export type CampoTextoPdf = {
  marcador: string
  valor: string
  marcadoresAlternativos?: readonly string[]
}

const ANCHO_FIRMA = 140
const ALTO_FIRMA = 140
const GROSOR_TILDE_PLAN = 2.5

type ResultadoFirma = {
  bytes: Uint8Array
  coincidencias: number
  coincidenciasPlan: number
  coincidenciasDatos: Record<string, number>
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

const escaparExpresionRegular = (valor: string) => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const crearExpresionMarcador = (marcador: string) => new RegExp(escaparExpresionRegular(marcador), 'i')

const obtenerMarcadores = (campo: CampoTextoPdf) => [
  campo.marcador,
  ...(campo.marcadoresAlternativos ?? []),
]

const dibujarTildePlan = (pagina: PDFPage, posicionX: number, posicionY: number) => {
  const x = Math.max(0, posicionX)
  const y = Math.max(0, posicionY - 8)

  pagina.drawLine({
    start: { x, y: y + 5 },
    end: { x: x + 5, y },
    thickness: GROSOR_TILDE_PLAN,
  })
  pagina.drawLine({
    start: { x: x + 5, y },
    end: { x: x + 15, y: y + 13 },
    thickness: GROSOR_TILDE_PLAN,
  })
}

const marcarCampoPlan = (documento: PDFDocument, marcadorPlan?: string) => {
  if (!marcadorPlan) {
    return 0
  }

  try {
    documento.getForm().getCheckBox(marcadorPlan).check()
    return 1
  } catch {
    return 0
  }
}

const completarCamposFormulario = (
  documento: PDFDocument,
  camposTexto: readonly CampoTextoPdf[],
  fuente: PDFFont,
) => {
  const coincidenciasDatos: Record<string, number> = Object.fromEntries(
    camposTexto.map((campo) => [campo.marcador, 0]),
  )
  const camposFormulario = new Set<string>()

  if (!camposTexto.length) {
    return { coincidenciasDatos, camposFormulario }
  }

  const formulario = documento.getForm()

  for (const campo of camposTexto) {
    for (const marcador of obtenerMarcadores(campo)) {
      try {
        formulario.getTextField(marcador).setText(campo.valor)
        coincidenciasDatos[campo.marcador] += 1
        camposFormulario.add(campo.marcador)
        break
      } catch {
        // The marker can be visible text instead of an interactive PDF field.
      }
    }
  }

  if (camposFormulario.size) {
    formulario.updateFieldAppearances(fuente)
  }

  return { coincidenciasDatos, camposFormulario }
}

const dibujarDato = (
  pagina: PDFPage,
  fuente: PDFFont,
  valor: string,
  posicionX: number,
  posicionY: number,
  anchoMarcador: number,
  altoMarcador: number,
) => {
  const alto = Math.max(altoMarcador, 10)
  const tamano = Math.min(Math.max(alto * 0.8, 8), 12)
  const ancho = Math.max(anchoMarcador, fuente.widthOfTextAtSize(valor, tamano))
  const x = Math.max(0, posicionX)
  const y = Math.max(0, posicionY)

  pagina.drawRectangle({
    x: Math.max(0, x - 1),
    y: Math.max(0, y - 3),
    width: ancho + 2,
    height: alto + 6,
    color: rgb(1, 1, 1),
  })
  pagina.drawText(valor, { x, y, size: tamano, font: fuente })
}

export async function firmarPdf(
  pdf: ArrayBuffer,
  firmaPng: string,
  palabraClave = PALABRA_CLAVE,
  marcadorPlan?: string,
  camposTexto: readonly CampoTextoPdf[] = [],
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

  const fuenteCampos = camposTexto.length ? await documento.embedFont(StandardFonts.Helvetica) : null
  const { coincidenciasDatos, camposFormulario } = fuenteCampos
    ? completarCamposFormulario(documento, camposTexto, fuenteCampos)
    : { coincidenciasDatos: {}, camposFormulario: new Set<string>() }
  const paginas = documento.getPages()
  const palabra = crearExpresionMarcador(palabraClave)
  const palabraPlan = marcadorPlan
    ? crearExpresionMarcador(marcadorPlan)
    : null
  const camposConMarcadores = camposTexto.map((campo) => ({
    campo,
    expresiones: obtenerMarcadores(campo).map(crearExpresionMarcador),
  }))
  let coincidencias = 0
  const campoPlanMarcado = marcarCampoPlan(documento, marcadorPlan) > 0
  let coincidenciasPlan = campoPlanMarcado ? 1 : 0

  for (let indice = 0; indice < visorPdf.numPages; indice += 1) {
    const paginaPdf = paginas[indice]
    const pagina = await visorPdf.getPage(indice + 1)
    const contenido = await pagina.getTextContent()

    for (const item of contenido.items) {
      if (!('str' in item)) {
        continue
      }

      const [, , , , posicionX, posicionY] = item.transform

      if (palabra.test(item.str)) {
        paginaPdf.drawImage(firma, {
          x: Math.max(0, posicionX - 4),
          y: Math.max(0, posicionY - ALTO_FIRMA + 80),
          width: ANCHO_FIRMA,
          height: ALTO_FIRMA,
        })
        coincidencias += 1
      }

      if (!campoPlanMarcado && palabraPlan?.test(item.str)) {
        dibujarTildePlan(paginaPdf, posicionX, posicionY)
        coincidenciasPlan += 1
      }

      if (fuenteCampos) {
        const campoMarcado = camposConMarcadores.find(({ campo, expresiones }) => (
          !camposFormulario.has(campo.marcador)
          && expresiones.some((expresion) => expresion.test(item.str))
        ))

        if (campoMarcado) {
          dibujarDato(
            paginaPdf,
            fuenteCampos,
            campoMarcado.campo.valor,
            posicionX,
            posicionY,
            item.width,
            item.height,
          )
          coincidenciasDatos[campoMarcado.campo.marcador] += 1
        }
      }
    }
  }

  return { bytes: await documento.save(), coincidencias, coincidenciasPlan, coincidenciasDatos }
}
