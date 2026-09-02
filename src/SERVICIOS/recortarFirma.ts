const MARGEN_MINIMO = 8

export const recortarFirma = (canvasOriginal: HTMLCanvasElement): string | null => {
  const contextoOriginal = canvasOriginal.getContext('2d', { willReadFrequently: true })
  if (!contextoOriginal) {
    return null
  }

  const imagen = contextoOriginal.getImageData(0, 0, canvasOriginal.width, canvasOriginal.height)
  let minimoX = canvasOriginal.width
  let minimoY = canvasOriginal.height
  let maximoX = -1
  let maximoY = -1

  // Detecta únicamente tinta visible: se puede firmar en cualquier punto del lienzo sin arrastrar espacio vacío al PDF.
  for (let y = 0; y < canvasOriginal.height; y += 1) {
    for (let x = 0; x < canvasOriginal.width; x += 1) {
      const indice = (y * canvasOriginal.width + x) * 4
      const rojo = imagen.data[indice]
      const verde = imagen.data[indice + 1]
      const azul = imagen.data[indice + 2]
      const alfa = imagen.data[indice + 3]
      const esTinta = alfa > 16 && (rojo < 245 || verde < 245 || azul < 245)

      if (!esTinta) {
        continue
      }

      minimoX = Math.min(minimoX, x)
      minimoY = Math.min(minimoY, y)
      maximoX = Math.max(maximoX, x)
      maximoY = Math.max(maximoY, y)
    }
  }

  if (maximoX < 0 || maximoY < 0) {
    return null
  }

  // Deja un pequeño margen para que un trazo junto al borde no quede cortado.
  const margen = Math.max(MARGEN_MINIMO, Math.round(Math.min(canvasOriginal.width, canvasOriginal.height) * 0.04))
  const origenX = Math.max(0, minimoX - margen)
  const origenY = Math.max(0, minimoY - margen)
  const finalX = Math.min(canvasOriginal.width, maximoX + margen + 1)
  const finalY = Math.min(canvasOriginal.height, maximoY + margen + 1)
  const ancho = finalX - origenX
  const alto = finalY - origenY
  const canvasRecortado = document.createElement('canvas')
  canvasRecortado.width = ancho
  canvasRecortado.height = alto
  const contextoRecortado = canvasRecortado.getContext('2d')

  if (!contextoRecortado) {
    return null
  }

  contextoRecortado.drawImage(canvasOriginal, origenX, origenY, ancho, alto, 0, 0, ancho, alto)
  return canvasRecortado.toDataURL('image/png')
}
