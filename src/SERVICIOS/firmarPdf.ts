import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

export const PALABRA_CLAVE = 'firma_aqui'
export const PALABRA_CLAVE_COMERCIALIZADOR = 'firma_comer_aqui'

export type AnclaTextoPdf = {
  texto: string
  despues?: boolean
  desplazamientoX?: number
  desplazamientoY?: number
  anchoMaximo?: number
  aparicion?: number
}

export type CampoTextoPdf = {
  marcador: string
  valor: string
  marcadoresAlternativos?: readonly string[]
  anclasAlternativas?: readonly AnclaTextoPdf[]
  anchoMaximo?: number
}

export type OpcionMarcadorPlanPdf = {
  marcador: string
  aparicion?: number
  desplazamientoX?: number
  desplazamientoY?: number
}

const ANCHO_FIRMA = 140
const ALTO_FIRMA = 140
const ALTO_FIRMA_COMERCIALIZADOR = 60
const GROSOR_TILDE_PLAN = 2.5

type ResultadoFirma = {
  bytes: Uint8Array
  coincidencias: number
  coincidenciasPlan: number
  coincidenciasDatos: Record<string, number>
}

type ItemTextoPdf = {
  str: string
  transform: number[]
  width: number
  height: number
}

type PaginaTextoPdf = {
  pagina: PDFPage
  items: ItemTextoPdf[]
}

type CoincidenciaTextoPdf = {
  pagina: PDFPage
  item: ItemTextoPdf
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

const buscarCoincidencias = (
  paginas: readonly PaginaTextoPdf[],
  texto: string,
): CoincidenciaTextoPdf[] => {
  const expresion = crearExpresionMarcador(texto)

  return paginas.flatMap(({ pagina, items }) => (
    items
      .filter((item) => expresion.test(item.str))
      .map((item) => ({ pagina, item }))
  ))
}

const elegirAparicion = (
  coincidencias: readonly CoincidenciaTextoPdf[],
  aparicion?: number,
) => aparicion ? coincidencias.slice(aparicion - 1, aparicion) : coincidencias

const dibujarTildePlan = (pagina: PDFPage, posicionX: number, posicionY: number) => {
  const x = Math.max(0, posicionX)
  const y = Math.max(0, posicionY + 1)

  pagina.drawLine({
    start: { x, y: y + 3 },
    end: { x: x + 3, y },
    thickness: GROSOR_TILDE_PLAN,
  })
  pagina.drawLine({
    start: { x: x + 3, y },
    end: { x: x + 9, y: y + 8 },
    thickness: GROSOR_TILDE_PLAN,
  })
}

const marcarCampoPlan = (
  documento: PDFDocument,
  opcionesPlan: readonly OpcionMarcadorPlanPdf[],
) => {
  for (const opcion of opcionesPlan) {
    try {
      documento.getForm().getCheckBox(opcion.marcador).check()
      return 1
    } catch {
      // The plan marker can be visible text instead of an interactive checkbox.
    }
  }

  return 0
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
  anchoMaximo?: number,
) => {
  const alto = Math.max(altoMarcador, 10)
  let tamano = Math.min(Math.max(alto * 0.8, 8), 12)

  while (anchoMaximo && fuente.widthOfTextAtSize(valor, tamano) > anchoMaximo && tamano > 6) {
    tamano -= 0.5
  }

  const anchoTexto = fuente.widthOfTextAtSize(valor, tamano)
  const ancho = anchoMaximo ?? Math.max(anchoMarcador, anchoTexto)
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

const dibujarCamposTexto = (
  paginas: readonly PaginaTextoPdf[],
  camposTexto: readonly CampoTextoPdf[],
  fuente: PDFFont,
  coincidenciasDatos: Record<string, number>,
  camposFormulario: ReadonlySet<string>,
) => {
  for (const campo of camposTexto) {
    if (camposFormulario.has(campo.marcador)) {
      continue
    }

    let coincidencias: CoincidenciaTextoPdf[] = []

    for (const marcador of obtenerMarcadores(campo)) {
      coincidencias = buscarCoincidencias(paginas, marcador)

      if (coincidencias.length) {
        break
      }
    }

    if (coincidencias.length) {
      for (const { pagina, item } of coincidencias) {
        const [, , , , posicionX, posicionY] = item.transform
        dibujarDato(
          pagina,
          fuente,
          campo.valor,
          posicionX,
          posicionY,
          item.width,
          item.height,
          campo.anchoMaximo,
        )
      }

      coincidenciasDatos[campo.marcador] += coincidencias.length
      continue
    }

    for (const ancla of campo.anclasAlternativas ?? []) {
      const coincidenciasAncla = elegirAparicion(
        buscarCoincidencias(paginas, ancla.texto),
        ancla.aparicion,
      )

      if (!coincidenciasAncla.length) {
        continue
      }

      for (const { pagina, item } of coincidenciasAncla) {
        const [, , , , posicionX, posicionY] = item.transform
        const x = posicionX + (ancla.despues ? item.width : 0) + (ancla.desplazamientoX ?? 0)
        const y = posicionY + (ancla.desplazamientoY ?? 0)

        dibujarDato(
          pagina,
          fuente,
          campo.valor,
          x,
          y,
          item.width,
          item.height,
          ancla.anchoMaximo,
        )
      }

      coincidenciasDatos[campo.marcador] += coincidenciasAncla.length
      break
    }
  }
}

const dibujarPlanEnTexto = (
  paginas: readonly PaginaTextoPdf[],
  opcionesPlan: readonly OpcionMarcadorPlanPdf[],
) => {
  for (const opcion of opcionesPlan) {
    const [coincidencia] = elegirAparicion(
      buscarCoincidencias(paginas, opcion.marcador),
      opcion.aparicion ?? 1,
    )

    if (!coincidencia) {
      continue
    }

    const [, , , , posicionX, posicionY] = coincidencia.item.transform
    dibujarTildePlan(
      coincidencia.pagina,
      posicionX + (opcion.desplazamientoX ?? 0),
      posicionY + (opcion.desplazamientoY ?? 0),
    )
    return 1
  }

  return 0
}

export async function firmarPdf(
  pdf: ArrayBuffer,
  firmaPng: string,
  palabraClave = PALABRA_CLAVE,
  opcionesPlan: readonly OpcionMarcadorPlanPdf[] = [],
  camposTexto: readonly CampoTextoPdf[] = [],
): Promise<ResultadoFirma> {
  const pdfjsLib = await cargarPdfJs()
  const bytesPdf = new Uint8Array(pdf)
  let cargaPdf
  const textosPorPagina: ItemTextoPdf[][] = []

  try {
    cargaPdf = pdfjsLib.getDocument({ data: new Uint8Array(bytesPdf) })
    const visorPdf = await cargaPdf.promise

    for (let indice = 0; indice < visorPdf.numPages; indice += 1) {
      const pagina = await visorPdf.getPage(indice + 1)
      const contenido = await pagina.getTextContent()
      const items = contenido.items.flatMap<ItemTextoPdf>((item) => (
        'str' in item
          ? [{ str: item.str, transform: item.transform, width: item.width, height: item.height }]
          : []
      ))

      textosPorPagina.push(items)
    }
  } catch (error) {
    throw new Error(`PDF.js no pudo leer el archivo: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    // Libera PDF.js antes de abrir el mismo PDF con pdf-lib para reducir el pico de memoria en móviles.
    await cargaPdf?.destroy().catch(() => undefined)
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

  const paginasPdf = documento.getPages()
  const paginasTexto: PaginaTextoPdf[] = textosPorPagina.map((items, indice) => ({
    pagina: paginasPdf[indice],
    items,
  }))

  const coincidenciasFirma = buscarCoincidencias(paginasTexto, palabraClave)
  const esFirmaComercializador = palabraClave.toLowerCase() === PALABRA_CLAVE_COMERCIALIZADOR
  const altoFirma = esFirmaComercializador ? ALTO_FIRMA_COMERCIALIZADOR : ALTO_FIRMA
  const desplazamientoFirmaY = esFirmaComercializador ? 30 : ALTO_FIRMA - 80

  for (const { pagina, item } of coincidenciasFirma) {
    const [, , , , posicionX, posicionY] = item.transform
    pagina.drawImage(firma, {
      x: Math.max(0, posicionX - 4),
      y: Math.max(0, posicionY - desplazamientoFirmaY),
      width: ANCHO_FIRMA,
      height: altoFirma,
    })
  }

  const campoPlanMarcado = marcarCampoPlan(documento, opcionesPlan) > 0
  const coincidenciasPlan = campoPlanMarcado
    ? 1
    : dibujarPlanEnTexto(paginasTexto, opcionesPlan)
  const fuenteCampos = camposTexto.length ? await documento.embedFont(StandardFonts.Helvetica) : null
  const { coincidenciasDatos, camposFormulario } = fuenteCampos
    ? completarCamposFormulario(documento, camposTexto, fuenteCampos)
    : { coincidenciasDatos: {}, camposFormulario: new Set<string>() }

  if (fuenteCampos) {
    dibujarCamposTexto(
      paginasTexto,
      camposTexto,
      fuenteCampos,
      coincidenciasDatos,
      camposFormulario,
    )
  }

  return {
    bytes: await documento.save(),
    coincidencias: coincidenciasFirma.length,
    coincidenciasPlan,
    coincidenciasDatos,
  }
}
