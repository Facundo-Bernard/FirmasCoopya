export const MAX_NOMBRE_COMERCIALIZADOR = 120
export const MAX_CORREO_COMERCIALIZADOR = 254
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COMMERCIALIZER_STORAGE_KEY = 'firma-coopya:comercializador:v1'
const LEGACY_COMMERCIALIZER_STORAGE_KEY = 'firma-coopya:papeleria-aws:comercializador:v1'

export type DatosComercializador = {
  nombre: string
  correo: string
}

// Quita espacios accidentales antes de validar, guardar o enviar los datos.
export const normalizarDatosComercializador = (nombre: string, correo: string): DatosComercializador => ({
  nombre: nombre.trim(),
  correo: correo.trim(),
})

// Confirma que el correo tenga el formato requerido antes de habilitar el envío a la API.
export const esCorreoComercializadorValido = (correo: string) => {
  const correoNormalizado = correo.trim()
  return correoNormalizado.length > 0 &&
    correoNormalizado.length <= MAX_CORREO_COMERCIALIZADOR &&
    EMAIL_PATTERN.test(correoNormalizado)
}

// Verifica los mismos límites que acepta la API antes de permitir el envío.
export const sonDatosComercializadorValidos = ({ nombre, correo }: DatosComercializador) =>
  nombre.length > 0 &&
  nombre.length <= MAX_NOMBRE_COMERCIALIZADOR &&
  esCorreoComercializadorValido(correo)

// Recupera datos válidos del navegador y evita romper la pantalla si el almacenamiento no está disponible.
export const recuperarDatosComercializador = (): DatosComercializador | null => {
  try {
    // También lee la clave anterior para no obligar a repetir datos ya guardados en /papeleria-aws.
    const textoGuardado = window.localStorage.getItem(COMMERCIALIZER_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_COMMERCIALIZER_STORAGE_KEY)
    if (!textoGuardado) return null

    const datos = JSON.parse(textoGuardado) as Partial<DatosComercializador>
    const datosNormalizados = normalizarDatosComercializador(datos.nombre ?? '', datos.correo ?? '')
    return sonDatosComercializadorValidos(datosNormalizados) ? datosNormalizados : null
  } catch {
    return null
  }
}

// Persiste únicamente el nombre y correo para no pedirlos nuevamente en este dispositivo.
export const persistirDatosComercializador = (datos: DatosComercializador) => {
  try {
    window.localStorage.setItem(COMMERCIALIZER_STORAGE_KEY, JSON.stringify(datos))
  } catch {
    // El trámite puede continuar si el navegador bloquea el almacenamiento local.
  }
}

// Borra los datos actuales y la clave anterior para que Editar siempre empiece con campos vacíos.
export const eliminarDatosComercializadorGuardados = () => {
  try {
    window.localStorage.removeItem(COMMERCIALIZER_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_COMMERCIALIZER_STORAGE_KEY)
  } catch {
    // La edición continúa aunque el navegador no permita modificar el almacenamiento local.
  }
}
