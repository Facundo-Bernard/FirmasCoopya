import { PDFDocument } from 'pdf-lib'

const ANCHO_PAGINA = 595
const ALTO_PAGINA = 842
const MARGEN = 24
const MAXIMO_IMAGEN = 1800

const convertirAJpeg = async (archivo: File) => {
  const url = URL.createObjectURL(archivo)
  const imagen = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve()
      imagen.onerror = () => reject(new Error(`No se pudo leer la imagen ${archivo.name}.`))
      imagen.src = url
    })

    const escala = Math.min(1, MAXIMO_IMAGEN / Math.max(imagen.naturalWidth, imagen.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(imagen.naturalWidth * escala)
    canvas.height = Math.round(imagen.naturalHeight * escala)
    canvas.getContext('2d')?.drawImage(imagen, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (resultado) => resultado ? resolve(resultado) : reject(new Error('No se pudo convertir la imagen.')),
        'image/jpeg',
        0.82,
      )
    })

    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function crearPdfDocumentacion(imagenes: File[]) {
  const documento = await PDFDocument.create()

  for (const archivo of imagenes) {
    const imagen = await documento.embedJpg(await convertirAJpeg(archivo))
    const pagina = documento.addPage([ANCHO_PAGINA, ALTO_PAGINA])
    const escala = Math.min(
      (ANCHO_PAGINA - MARGEN * 2) / imagen.width,
      (ALTO_PAGINA - MARGEN * 2) / imagen.height,
    )
    const ancho = imagen.width * escala
    const alto = imagen.height * escala

    pagina.drawImage(imagen, {
      x: (ANCHO_PAGINA - ancho) / 2,
      y: (ALTO_PAGINA - alto) / 2,
      width: ancho,
      height: alto,
    })
  }

  return documento.save()
}
