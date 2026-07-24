const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://talex.com.co',
  'https://www.talex.com.co'
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
const emailFrom = process.env.EMAIL_FROM?.trim() || emailUser;
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

app.post('/api/enviar-formulario', async (req, res) => {
  console.log(req.body);
  try {
    const nombreCompleto = normalizeText(req.body.nombreCompleto);
    const correoCorporativo = normalizeText(req.body.correoCorporativo);
    const telefonoWhatsapp = normalizeText(req.body.telefonoWhatsapp);
    const tipoEquipo = normalizeText(req.body.tipoEquipo);
    const empresaOrganizacion = normalizeText(
      req.body.empresaOrganizacion
    );
    const cargoRol = normalizeText(req.body.cargoRol);
    const mensaje = normalizeText(req.body.mensaje);

    if (
      !nombreCompleto ||
      !correoCorporativo ||
      !telefonoWhatsapp ||
      !tipoEquipo ||
      !empresaOrganizacion ||
      !cargoRol ||
      !mensaje
    ) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(correoCorporativo)) {
      return res.status(400).json({
        success: false,
        message: 'El correo corporativo no es válido'
      });
    }

    if (!emailHost || !emailUser || !emailPass) {
      console.error('La configuración SMTP está incompleta');

      return res.status(500).json({
        success: false,
        message: 'El servicio de correo no está configurado'
      });
    }

    const safeData = {
      nombreCompleto: escapeHtml(nombreCompleto),
      correoCorporativo: escapeHtml(correoCorporativo),
      telefonoWhatsapp: escapeHtml(telefonoWhatsapp),
      tipoEquipo: escapeHtml(tipoEquipo),
      empresaOrganizacion: escapeHtml(empresaOrganizacion),
      cargoRol: escapeHtml(cargoRol),
      mensaje: escapeHtml(mensaje)
    };

    const info = await transporter.sendMail({
      from: emailFrom,
      to: emailTo,

      // Al responder el correo, responderá al interesado
      replyTo: correoCorporativo,

      subject: `Nueva solicitud de demo TaleX - ${empresaOrganizacion}`,

      text: `
Nueva solicitud de demo TaleX

Nombre completo: ${nombreCompleto}
Correo corporativo: ${correoCorporativo}
Teléfono / WhatsApp: ${telefonoWhatsapp}
Tipo de equipo: ${tipoEquipo}
Empresa u organización: ${empresaOrganizacion}
Cargo o rol: ${cargoRol}

Mensaje:
${mensaje}

Fecha de recepción: ${new Date().toLocaleString('es-CO', {
        timeZone: 'America/Bogota'
      })}
      `.trim(),

      html: `
        <div style="
          max-width: 650px;
          margin: 0 auto;
          padding: 28px;
          background: #071126;
          color: #ffffff;
          font-family: Arial, sans-serif;
          border-radius: 12px;
        ">
          <h1 style="margin-top: 0; color: #ffffff;">
            Nueva solicitud de demo
          </h1>

          <p style="color: #b9c5d8;">
            Se recibió una nueva solicitud desde la landing de TaleX.
          </p>

          <div style="
            background: #101a30;
            border: 1px solid #263653;
            padding: 20px;
            border-radius: 10px;
          ">
            <p>
              <strong>Nombre completo:</strong><br>
              ${safeData.nombreCompleto}
            </p>

            <p>
              <strong>Correo corporativo:</strong><br>
              ${safeData.correoCorporativo}
            </p>

            <p>
              <strong>Teléfono / WhatsApp:</strong><br>
              ${safeData.telefonoWhatsapp}
            </p>

            <p>
              <strong>Tipo de equipo:</strong><br>
              ${safeData.tipoEquipo}
            </p>

            <p>
              <strong>Empresa u organización:</strong><br>
              ${safeData.empresaOrganizacion}
            </p>

            <p>
              <strong>Cargo o rol:</strong><br>
              ${safeData.cargoRol}
            </p>

            <p>
              <strong>Mensaje:</strong><br>
              ${safeData.mensaje.replaceAll('\n', '<br>')}
            </p>
          </div>

          <p style="margin-top: 20px; color: #8796ad; font-size: 13px;">
            Fecha de recepción:
            ${new Date().toLocaleString('es-CO', {
              timeZone: 'America/Bogota'
            })}
          </p>
        </div>
      `
    });

    console.log('Correo enviado:', info.messageId);

    return res.status(200).json({
      success: true,
      message: 'Solicitud enviada correctamente'
    });
  } catch (error) {
    console.error('Error al enviar el correo:', {
      message: error.message,
      code: error.code,
      command: error.command
    });

    return res.status(500).json({
      success: false,
      message:
        'No fue posible enviar la solicitud. Inténtalo nuevamente.'
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