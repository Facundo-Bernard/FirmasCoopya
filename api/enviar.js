import { Resend } from 'resend'

export const config = {
  maxDuration: 60,
}

export async function POST(request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Falta configurar RESEND_API_KEY en las variables de entorno.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const resend = new Resend(apiKey)
    const formData = await request.formData()

    const dni = ((formData.get('DNI') || formData.get('dni') || 'SIN_DNI')).toString().trim()
    const telefono = (formData.get('Teléfono') || formData.get('telefono') || 'No informado').toString().trim()
    const email = (formData.get('email') || '').toString().trim()
    const emailInformado = (formData.get('Email informado') || email || 'No informado').toString().trim()
    const nombreComercializador = (formData.get('Nombre del comercializador') || '').toString().trim()
    const correoComercializador = (formData.get('Correo del comercializador') || '').toString().trim()

    // Destinatario: Se toma de la variable de entorno EMAIL_DESTINO (ej. tu email personal para pruebas),
    // o por defecto info@asistodo.com.ar
    const emailDestino = process.env.EMAIL_DESTINO || 'info@asistodo.com.ar'

    const attachmentPdf = formData.get('attachment')
    const attachmentDoc = formData.get('attachment_2')

    if (!attachmentPdf || !attachmentDoc) {
      return new Response(
        JSON.stringify({ error: 'Faltan los archivos adjuntos obligatorios (papelería o documentación).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const pdfFirmadoBuffer = Buffer.from(await attachmentPdf.arrayBuffer())
    const docBuffer = Buffer.from(await attachmentDoc.arrayBuffer())

    const asunto = `PAPELERIA ${dni}`

    let comercializadorHtml = ''
    if (nombreComercializador || correoComercializador) {
      comercializadorHtml = `
        <tr>
          <td style="padding: 6px 0; font-weight: bold; color: #555;">Comercializador:</td>
          <td style="padding: 6px 0;">${nombreComercializador} (${correoComercializador})</td>
        </tr>
      `
    }

    const { data, error } = await resend.emails.send({
      from: 'Firma Asistodo <onboarding@resend.dev>',
      to: [emailDestino],
      subject: asunto,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
          <h2 style="color: #0d6efd; margin-bottom: 6px;">Nueva papelería firmada recibida</h2>
          <p style="color: #666; font-size: 14px; margin-top: 0;">Trámite completado a través de Firma Asistodo.</p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 16px 0;" />
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 6px 0; width: 180px; font-weight: bold; color: #555;">DNI del titular:</td>
              <td style="padding: 6px 0;">${dni}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Teléfono:</td>
              <td style="padding: 6px 0;">${telefono}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Email informado:</td>
              <td style="padding: 6px 0;">${emailInformado}</td>
            </tr>
            ${comercializadorHtml}
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #555;">Fecha de envío:</td>
              <td style="padding: 6px 0;">${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td>
            </tr>
          </table>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 16px 0;" />
          <h3 style="font-size: 16px; color: #333; margin-bottom: 8px;">Documentos adjuntos:</h3>
          <ol style="margin-top: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;"><strong>${asunto}.pdf:</strong> Papelería oficial con la firma electrónica del cliente estampada.</li>
            <li style="margin-bottom: 6px;"><strong>DOCUMENTACION_${dni}.pdf:</strong> Archivo unificado de evidencia fotográfica (selfie con DNI, selfie guiñando, DNI frente y dorso, y comprobante de CBU).</li>
          </ol>
        </div>
      `,
      attachments: [
        {
          filename: `${asunto}.pdf`,
          content: pdfFirmadoBuffer,
        },
        {
          filename: `DOCUMENTACION_${dni}.pdf`,
          content: docBuffer,
        },
      ],
    })

    if (error) {
      console.error('Error al enviar correo con Resend:', error)
      return new Response(
        JSON.stringify({ error: error.message || 'Error al despachar el correo con Resend.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Error no controlado en /api/enviar:', err)
    const mensaje = err instanceof Error ? err.message : 'Error inesperado al procesar el envío de papelería.'
    return new Response(
      JSON.stringify({ error: mensaje }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
