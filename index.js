const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://127.0.0.1:5502',
  'http://localhost:5502',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://angularis.com.co'
];

const corsOptions = {
  origin(origin, callback) {
    // Permite peticiones sin origin, como Postman o health checks
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

const emailHost = process.env.EMAIL_HOST?.trim();
const emailPort = Number(process.env.EMAIL_PORT || 465);
const emailSecure = process.env.EMAIL_SECURE === 'true';
const emailUser = process.env.EMAIL_USER?.trim();
const emailPass = process.env.EMAIL_PASS;
const emailFromName =
  process.env.EMAIL_FROM_NAME?.trim() || 'TaleX';
const emailTo = process.env.EMAIL_TO?.trim() || emailUser;

if (!emailHost || !emailUser || !emailPass) {
  console.warn('⚠️ Faltan variables de configuración SMTP');
}

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailSecure,
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

/**
 * Evita que los valores del formulario inyecten HTML
 * dentro del correo.
 */
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'TaleX Landing Backend'
  });
});
app.post('/api/enviar-precotizacion', async (req, res) => {
  try {
    const nombreConjunto = normalizeText(req.body.nombreConjunto);
    const ciudad = normalizeText(req.body.ciudad);
    const tipoProyecto = normalizeText(req.body.tipoProyecto);
    const tipoInmueble = normalizeText(req.body.tipoInmueble);
    const areaAproximada = normalizeText(req.body.areaAproximada);
    const tipoAcabados = normalizeText(req.body.tipoAcabados);
    const tiempoInicio = normalizeText(req.body.tiempoInicio);
    const presupuestoEstimado = normalizeText(
      req.body.presupuestoEstimado
    );
    const nombreCompleto = normalizeText(req.body.nombreCompleto);
    const correoElectronico = normalizeText(req.body.correoElectronico);
    const telefono = normalizeText(req.body.telefono);
    const comentarios = normalizeText(req.body.comentarios);

    if (
      !nombreConjunto ||
      !ciudad ||
      !tipoProyecto ||
      !tipoInmueble ||
      !areaAproximada ||
      !tipoAcabados ||
      !tiempoInicio ||
      !presupuestoEstimado ||
      !nombreCompleto ||
      !correoElectronico ||
      !telefono
    ) {
      return res.status(400).json({
        success: false,
        message: 'Completa todos los campos obligatorios'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correoElectronico)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no es válido'
      });
    }

    if (!emailHost || !emailUser || !emailPass) {
      return res.status(500).json({
        success: false,
        message: 'El servicio de correo no está configurado'
      });
    }

    const safeData = {
      nombreConjunto: escapeHtml(nombreConjunto),
      ciudad: escapeHtml(ciudad),
      tipoProyecto: escapeHtml(tipoProyecto),
      tipoInmueble: escapeHtml(tipoInmueble),
      areaAproximada: escapeHtml(areaAproximada),
      tipoAcabados: escapeHtml(tipoAcabados),
      tiempoInicio: escapeHtml(tiempoInicio),
      presupuestoEstimado: escapeHtml(presupuestoEstimado),
      nombreCompleto: escapeHtml(nombreCompleto),
      correoElectronico: escapeHtml(correoElectronico),
      telefono: escapeHtml(telefono),
      comentarios: escapeHtml(comentarios || 'Sin comentarios adicionales')
    };

    const fechaRecepcion = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota'
    });

    const info = await transporter.sendMail({
      from: {
        name: emailFromName,
        address: emailUser
      },
      to: emailTo,
      replyTo: correoElectronico,
      subject: `Nueva precotización - ${nombreConjunto}`,

      text: `
Nueva solicitud de precotización

INFORMACIÓN DEL ESPACIO
Nombre del conjunto: ${nombreConjunto}
Ciudad: ${ciudad}

ALCANCE DEL PROYECTO
Tipo de proyecto: ${tipoProyecto}
Tipo de inmueble: ${tipoInmueble}
Área aproximada: ${areaAproximada} m²
Acabados deseados: ${tipoAcabados}

INVERSIÓN Y TIEMPOS
Tiempo estimado de inicio: ${tiempoInicio}
Presupuesto estimado: ${presupuestoEstimado}

DATOS DE CONTACTO
Nombre: ${nombreCompleto}
Correo: ${correoElectronico}
Teléfono: ${telefono}

COMENTARIOS
${comentarios || 'Sin comentarios adicionales'}

Fecha de recepción: ${fechaRecepcion}
      `.trim(),

      html: `
        <div style="
          max-width: 680px;
          margin: 0 auto;
          background: #fffaf7;
          font-family: Arial, sans-serif;
          color: #171717;
          border: 1px solid #f0e3dc;
          border-radius: 16px;
          overflow: hidden;
        ">
          <div style="
            background: #f5864b;
            padding: 28px;
            color: #ffffff;
          ">
            <p style="
              margin: 0 0 8px;
              font-size: 12px;
              letter-spacing: 2px;
              text-transform: uppercase;
            ">
              Nueva solicitud
            </p>

            <h1 style="margin: 0; font-size: 28px;">
              Precotización de proyecto
            </h1>
          </div>

          <div style="padding: 28px;">
            <h2 style="font-size: 17px; color: #f5864b;">
              Información del espacio
            </h2>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 9px 0;"><strong>Conjunto:</strong></td>
                <td>${safeData.nombreConjunto}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0;"><strong>Ciudad:</strong></td>
                <td>${safeData.ciudad}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0;"><strong>Tipo de proyecto:</strong></td>
                <td>${safeData.tipoProyecto}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0;"><strong>Tipo de inmueble:</strong></td>
                <td>${safeData.tipoInmueble}</td>
              </tr>
              <tr>
                <td style="padding: 9px 0;"><strong>Área:</strong></td>
                <td>${safeData.areaAproximada} m²</td>
              </tr>
              <tr>
                <td style="padding: 9px 0;"><strong>Acabados:</strong></td>
                <td>${safeData.tipoAcabados}</td>
              </tr>
            </table>

            <hr style="
              border: none;
              border-top: 1px solid #eadfd9;
              margin: 24px 0;
            ">

            <h2 style="font-size: 17px; color: #f5864b;">
              Inversión y tiempos
            </h2>

            <p>
              <strong>Tiempo de inicio:</strong><br>
              ${safeData.tiempoInicio}
            </p>

            <p>
              <strong>Presupuesto estimado:</strong><br>
              ${safeData.presupuestoEstimado}
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #eadfd9;
              margin: 24px 0;
            ">

            <h2 style="font-size: 17px; color: #f5864b;">
              Datos de contacto
            </h2>

            <p><strong>Nombre:</strong> ${safeData.nombreCompleto}</p>
            <p><strong>Correo:</strong> ${safeData.correoElectronico}</p>
            <p><strong>Teléfono:</strong> ${safeData.telefono}</p>

            <p>
              <strong>Comentarios:</strong><br>
              ${safeData.comentarios.replaceAll('\n', '<br>')}
            </p>

            <p style="
              margin-top: 28px;
              font-size: 12px;
              color: #777777;
            ">
              Recibido el ${fechaRecepcion}
            </p>
          </div>
        </div>
      `
    });

    console.log('Precotización enviada:', info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Precotización enviada correctamente'
    });
  } catch (error) {
    console.error('Error al enviar la precotización:', {
      message: error.message,
      code: error.code,
      response: error.response
    });

    return res.status(500).json({
      success: false,
      message: 'No fue posible enviar la precotización'
    });
  }
});

app.post('/api/enviar-postulacion', async (req, res) => {
  try {
    const nombreCompleto = normalizeText(req.body.nombreCompleto);
    const identificacion = normalizeText(req.body.identificacion);
    const correoElectronico = normalizeText(req.body.correoElectronico);
    const telefono = normalizeText(req.body.telefono);
    const especialidad = normalizeText(req.body.especialidad);
    const experiencia = normalizeText(req.body.experiencia);
    const disponibilidad = normalizeText(req.body.disponibilidad);
    const certificacionesCursos = normalizeText(
      req.body.certificacionesCursos
    );
    const proyectosDestacados = normalizeText(
      req.body.proyectosDestacados
    );

    if (
      !nombreCompleto ||
      !identificacion ||
      !correoElectronico ||
      !telefono ||
      !especialidad ||
      !experiencia ||
      !disponibilidad ||
      !certificacionesCursos ||
      !proyectosDestacados
    ) {
      return res.status(400).json({
        success: false,
        message: 'Completa todos los campos de la postulación'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correoElectronico)) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico no es válido'
      });
    }

    if (!/^[a-zA-Z0-9.-]{5,30}$/.test(identificacion)) {
      return res.status(400).json({
        success: false,
        message: 'La identificación no es válida'
      });
    }

    const safeData = {
      nombreCompleto: escapeHtml(nombreCompleto),
      identificacion: escapeHtml(identificacion),
      correoElectronico: escapeHtml(correoElectronico),
      telefono: escapeHtml(telefono),
      especialidad: escapeHtml(especialidad),
      experiencia: escapeHtml(experiencia),
      disponibilidad: escapeHtml(disponibilidad),
      certificacionesCursos: escapeHtml(certificacionesCursos),
      proyectosDestacados: escapeHtml(proyectosDestacados)
    };

    const fechaRecepcion = new Date().toLocaleString('es-CO', {
      timeZone: 'America/Bogota'
    });

    const info = await transporter.sendMail({
      from: {
        name: emailFromName,
        address: emailUser
      },
      to: emailTo,
      replyTo: correoElectronico,
      subject: `Nueva postulación - ${nombreCompleto}`,

      text: `
Nueva postulación

Nombre completo: ${nombreCompleto}
Identificación: ${identificacion}
Correo electrónico: ${correoElectronico}
Teléfono: ${telefono}
Especialidad: ${especialidad}
Experiencia: ${experiencia}
Disponibilidad: ${disponibilidad}

Certificaciones o cursos:
${certificacionesCursos}

Proyectos destacados:
${proyectosDestacados}

Fecha de recepción: ${fechaRecepcion}
      `.trim(),

      html: `
        <div style="
          max-width: 680px;
          margin: 0 auto;
          padding: 30px;
          background: #1c1917;
          color: #f5f5f4;
          font-family: Arial, sans-serif;
          border-radius: 16px;
        ">
          <p style="
            margin: 0 0 8px;
            color: #f5864b;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
          ">
            Talento profesional
          </p>

          <h1 style="margin: 0 0 24px;">
            Nueva postulación
          </h1>

          <div style="
            background: #292524;
            border: 1px solid #44403c;
            border-radius: 12px;
            padding: 22px;
          ">
            <p>
              <strong>Nombre completo:</strong><br>
              ${safeData.nombreCompleto}
            </p>

            <p>
              <strong>Identificación:</strong><br>
              ${safeData.identificacion}
            </p>

            <p>
              <strong>Correo electrónico:</strong><br>
              ${safeData.correoElectronico}
            </p>

            <p>
              <strong>Teléfono:</strong><br>
              ${safeData.telefono}
            </p>

            <p>
              <strong>Especialidad:</strong><br>
              ${safeData.especialidad}
            </p>

            <p>
              <strong>Experiencia:</strong><br>
              ${safeData.experiencia}
            </p>

            <p>
              <strong>Disponibilidad:</strong><br>
              ${safeData.disponibilidad}
            </p>

            <p>
              <strong>Certificaciones o cursos:</strong><br>
              ${safeData.certificacionesCursos.replaceAll('\n', '<br>')}
            </p>

            <p>
              <strong>Proyectos destacados:</strong><br>
              ${safeData.proyectosDestacados.replaceAll('\n', '<br>')}
            </p>
          </div>

          <p style="
            margin-top: 22px;
            color: #a8a29e;
            font-size: 12px;
          ">
            Recibido el ${fechaRecepcion}
          </p>
        </div>
      `
    });

    console.log('Postulación enviada:', info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Postulación enviada correctamente'
    });
  } catch (error) {
    console.error('Error al enviar la postulación:', {
      message: error.message,
      code: error.code,
      response: error.response
    });

    return res.status(500).json({
      success: false,
      message: 'No fue posible enviar la postulación'
    });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);

    try {
      await transporter.verify();
      console.log('✅ Conexión SMTP verificada correctamente');
    } catch (error) {
      console.error('❌ No fue posible conectar con el SMTP:', {
        message: error.message,
        code: error.code
      });
    }
  });
}