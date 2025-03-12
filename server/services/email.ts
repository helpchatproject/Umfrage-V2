import nodemailer from "nodemailer";
import { EmailSettings } from "@shared/schema";
import { storage } from "../storage";

let transporter: nodemailer.Transporter | null = null;

export async function initializeEmailTransporter(settings: EmailSettings) {
  transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true für 465, false für andere Ports
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
    tls: {
      // Aktiviere STARTTLS für Port 587
      ciphers: 'SSLv3',
      rejectUnauthorized: true
    }
  });
}

export async function sendTestEmail(settings: EmailSettings) {
  await initializeEmailTransporter(settings);

  if (!transporter) {
    throw new Error("E-Mail-Transporter konnte nicht initialisiert werden");
  }

  try {
    const info = await transporter.sendMail({
      from: settings.fromEmail,
      to: settings.fromEmail,
      subject: "Test E-Mail von Webhook Manager",
      html: `
        <h2>Test E-Mail</h2>
        <p>Dies ist eine Test-E-Mail um zu überprüfen, ob Ihre SMTP-Einstellungen korrekt konfiguriert sind.</p>
        <p>Wenn Sie diese E-Mail sehen, funktioniert alles wie erwartet!</p>
        <br>
        <p>Webhook Manager</p>
      `,
    });

    return info;
  } catch (error) {
    console.error("Error sending test email:", error);
    throw error;
  }
}

export async function sendWebhookNotification(
  to: string,
  webhookName: string,
  responseData: any
) {
  if (!transporter) {
    const settings = await storage.getEmailSettings();
    if (!settings) {
      console.error("Email settings not configured");
      return;
    }
    await initializeEmailTransporter(settings);
  }

  try {
    const mailOptions = {
      from: `"Webhook Notifier" <${settings.fromEmail}>`,
      to,
      subject: `Neue Antwort für ${webhookName}`,
      html: `
        <h2>Neue Webhook-Antwort erhalten</h2>
        <p>Es wurde eine neue Antwort für den Webhook "${webhookName}" empfangen.</p>
        <h3>Details:</h3>
        <pre>${JSON.stringify(responseData, null, 2)}</pre>
      `,
    };

    await transporter!.sendMail(mailOptions);
    console.log("Notification email sent successfully");
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
}