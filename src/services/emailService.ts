import nodemailer from 'nodemailer';
import logger from '../utils/logger';

/** Crea un transporter según las variables de entorno.
 *  Soporta cualquier SMTP (Gmail, Outlook, Brevo, etc.)
 *  Si las credenciales no están configuradas, devuelve null. */
function createTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);

    if (!user || !pass) return null;

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Envía un email de alerta.
 * @returns true si el envío fue exitoso, false si las credenciales no están configuradas o hay un error.
 */
export async function sendEmail(opts: EmailOptions): Promise<boolean> {
    const transporter = createTransporter();
    if (!transporter) {
        logger.warn('Email no configurado. Definí EMAIL_USER y EMAIL_PASS en .env para activar notificaciones por email.');
        return false;
    }

    try {
        const from = `"Rulos Locos 🚀" <${process.env.EMAIL_USER}>`;
        await transporter.sendMail({ from, ...opts });
        logger.info('Email enviado a %s: %s', opts.to, opts.subject);
        return true;
    } catch (err) {
        logger.error('Error enviando email: %s', (err as Error).message);
        return false;
    }
}

/**
 * Envía el email estándar de alerta de precio.
 */
export async function sendPriceAlertEmail(opts: {
    to: string;
    message: string;
    prices?: Record<string, number>;
}): Promise<boolean> {
    const pricesHtml = opts.prices
        ? Object.entries(opts.prices)
            .map(([k, v]) => `<tr><td style="padding:6px 12px;font-weight:600;color:#94a3b8;text-transform:uppercase;">${k}</td><td style="padding:6px 12px;font-weight:700;color:#f1f5f9;">$${v.toLocaleString('es-AR')}</td></tr>`)
            .join('')
        : '';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0f172a;font-family:system-ui,sans-serif;color:#e2e8f0;margin:0;padding:32px;">
  <div style="max-width:520px;margin:auto;background:#1e293b;border-radius:16px;padding:32px;border:1px solid #334155;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <span style="font-size:28px;">⚡</span>
      <div>
        <h1 style="margin:0;font-size:20px;color:#fff;">Rulos Locos</h1>
        <p style="margin:0;font-size:12px;color:#64748b;letter-spacing:.08em;">ALERTA DE PRECIO</p>
      </div>
    </div>
    <p style="font-size:16px;line-height:1.6;color:#cbd5e1;">${opts.message}</p>
    ${pricesHtml ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;background:#0f172a;border-radius:8px;overflow:hidden;">${pricesHtml}</table>` : ''}
    <hr style="border:none;border-top:1px solid #334155;margin:24px 0;">
    <a href="https://rulos-locos.vercel.app" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:14px;">Ver Dashboard →</a>
    <p style="margin-top:20px;font-size:11px;color:#475569;">Recibiste este email porque tenés alertas activas en Rulos Locos. Podés desactivarlas desde el dashboard.</p>
  </div>
</body>
</html>`;

    return sendEmail({
        to: opts.to,
        subject: '🔔 Alerta de Precio — Rulos Locos',
        html,
        text: opts.message,
    });
}
