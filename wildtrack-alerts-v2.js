// wildtrack-alerts.js v2
// Webhook para alertas de Traccar → AWS SES
// Instalar: npm install express nodemailer
// Correr: node wildtrack-alerts.js

const express    = require('express');
const nodemailer = require('nodemailer');
const app        = express();
app.use(express.json());

// ── CONFIGURACIÓN ─────────────────────────────────────────────
const CONFIG = {
  port: 3001,
  smtp: {
    host:   'email-smtp.us-east-2.amazonaws.com',
    port:   587,
    secure: false,
    auth: {
      user: 'AKIARVVH5QIDVVYDPNX5',
      pass: 'BK8Sacfcv/pVrGtz/srZ1X2Wi/+DpGEd6mUSBlDU++c6'
    }
  },
  from:      'WILDTRACK Alertas <bergro@gpstracking.com.do>',
  defaultTo: 'bergro@gpstracking.com.do',

  // Solo estos tipos de evento generan correo
  allowedTypes: [
    'ignitionOn', 'ignitionOff',
    'deviceMoving', 'deviceStopped',
    'overspeed', 'powerCut', 'alarm',
    'geofenceEnter', 'geofenceExit',
    'deviceOffline'
  ]
};

// ── TRANSPORTE SMTP ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   CONFIG.smtp.host,
  port:   CONFIG.smtp.port,
  secure: CONFIG.smtp.secure,
  auth:   CONFIG.smtp.auth
});

// ── TIPOS DE ALERTAS ──────────────────────────────────────────
const ALERT_LABELS = {
  ignitionOn:    { label: '🔑 Encendido',           color: '#22c55e' },
  ignitionOff:   { label: '🔴 Apagado',             color: '#ef4444' },
  deviceMoving:  { label: '🚗 En movimiento',       color: '#2B4DE8' },
  deviceStopped: { label: '🛑 Detenido',            color: '#f59e0b' },
  deviceOffline: { label: '📡 Fuera de línea',      color: '#ef4444' },
  deviceOnline:  { label: '✅ En línea',             color: '#22c55e' },
  overspeed:     { label: '⚡ Exceso de velocidad', color: '#f59e0b' },
  powerCut:      { label: '⚠️ Corte de energía',    color: '#ef4444' },
  alarm:         { label: '🚨 Alarma',              color: '#ef4444' },
  geofenceEnter: { label: '📍 Entró a zona',        color: '#2B4DE8' },
  geofenceExit:  { label: '📍 Salió de zona',       color: '#f59e0b' },
};

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('es-DO', {
    timeZone: 'America/Santo_Domingo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function buildEmail(payload) {
  const event  = payload.event  || payload;
  const device = payload.device || {};
  const pos    = payload.position || {};

  const type     = event.type || 'unknown';
  const alert    = ALERT_LABELS[type] || { label: type, color: '#64748b' };
  const devName  = device.name || `Dispositivo ${event.deviceId}`;
  const time     = formatDate(event.eventTime || event.serverTime);
  const speedKmh = pos.speed ? `${Math.round(pos.speed * 1.852)} km/h` : null;
  const lat      = pos.latitude  || null;
  const lon      = pos.longitude || null;
  const mapsLink = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : null;
  const address  = pos.address || null;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <tr>
          <td style="background:#080c14;padding:20px 28px;">
            <span style="font-size:18px;font-weight:700;letter-spacing:3px;color:#fff;">WILDTRACK</span>
            <span style="font-size:10px;color:#2B4DE8;letter-spacing:3px;display:block;margin-top:2px;">SISTEMA DE ALERTAS</span>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 28px 12px;">
            <div style="background:${alert.color}18;border-left:4px solid ${alert.color};border-radius:4px;padding:14px 18px;">
              <span style="font-size:20px;font-weight:700;color:${alert.color};">${alert.label}</span>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:8px 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">

              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Vehículo</span><br>
                <span style="font-size:14px;color:#0f172a;font-weight:600;">${devName}</span>
              </td></tr>

              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Fecha y Hora</span><br>
                <span style="font-size:14px;color:#0f172a;">${time}</span>
              </td></tr>

              ${speedKmh ? `
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Velocidad</span><br>
                <span style="font-size:14px;color:#0f172a;">${speedKmh}</span>
              </td></tr>` : ''}

              ${address ? `
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Dirección</span><br>
                <span style="font-size:14px;color:#0f172a;">${address}</span>
              </td></tr>` : ''}

              ${mapsLink ? `
              <tr><td style="padding:12px 0 0;">
                <a href="${mapsLink}" style="display:inline-block;background:#2B4DE8;color:#fff;text-decoration:none;padding:10px 20px;border-radius:4px;font-size:13px;font-weight:600;letter-spacing:1px;">📍 Ver en Google Maps</a>
              </td></tr>` : ''}

            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;">
            <span style="font-size:11px;color:#94a3b8;">Generado automáticamente por WILDTRACK · gpstracking.com.do</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: `WILDTRACK · ${alert.label} — ${devName}`,
    html
  };
}

// ── WEBHOOK ───────────────────────────────────────────────────
app.post('/webhook', async (req, res) => {
  const payload = req.body;
  const type    = payload.event?.type || payload.type;

  // Filtrar tipos no relevantes
  if (!CONFIG.allowedTypes.includes(type)) {
    console.log(`[SKIP] Tipo ignorado: ${type}`);
    return res.status(200).json({ skip: true });
  }

  const devName = payload.device?.name || `#${payload.event?.deviceId}`;
  console.log(`[${new Date().toISOString()}] ${type} — ${devName}`);

  const { subject, html } = buildEmail(payload);

  // Destino: por ahora defaultTo. En producción: leer correo del usuario en Traccar
  const to = CONFIG.defaultTo;

  try {
    await transporter.sendMail({ from: CONFIG.from, to, subject, html });
    console.log(`[OK] → ${to}: ${subject}`);
    res.status(200).json({ ok: true });
  } catch(e) {
    console.error('[ERROR] SES:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── TEST ──────────────────────────────────────────────────────
app.get('/test', async (req, res) => {
  const payload = {
    event: {
      type:      'ignitionOn',
      eventTime: new Date().toISOString(),
      deviceId:  2
    },
    device: { name: 'TOYOTA HILUX ROJO VINO' },
    position: {
      speed:     45,
      latitude:  18.4861,
      longitude: -69.9312,
      address:   'Av. Winston Churchill, Santo Domingo, DO'
    }
  };
  const { subject, html } = buildEmail(payload);
  try {
    await transporter.sendMail({ from: CONFIG.from, to: CONFIG.defaultTo, subject, html });
    res.send('✅ Correo de prueba enviado a ' + CONFIG.defaultTo);
  } catch(e) {
    res.status(500).send('❌ Error: ' + e.message);
  }
});

app.listen(CONFIG.port, () => {
  console.log(`WILDTRACK Alerts v2 corriendo en puerto ${CONFIG.port}`);
  console.log(`Test: http://localhost:${CONFIG.port}/test`);
});
