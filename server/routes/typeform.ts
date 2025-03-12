import express from "express";
import { z } from "zod";
import { storage } from "../storage";

const router = express.Router();

const formRequestSchema = z.object({
  formId: z.string().min(1),
});

router.post("/form", async (req, res) => {
  try {
    const { formId } = formRequestSchema.parse(req.body);

    // Get settings for API token
    const settings = await storage.getTypeformSettings();
    if (!settings?.apiToken) {
      throw new Error("Typeform API Token nicht konfiguriert. Bitte konfigurieren Sie den Token in den Einstellungen.");
    }

    const typeformResponse = await fetch(`https://api.typeform.com/forms/${formId}`, {
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
      },
    });

    if (!typeformResponse.ok) {
      const error = await typeformResponse.json();
      console.error("Typeform API Error:", error);
      throw new Error(error.description || "Fehler beim Abrufen der Formularstruktur");
    }

    const data = await typeformResponse.json();
    console.log("Typeform API Response:", data);

    res.json({
      id: data.id,
      title: data.title,
      fields: data.fields.map((field: any) => ({
        id: field.id,
        ref: field.ref,
        type: field.type,
        title: field.title,
        description: field.description,
        properties: field.properties || {},
        validations: field.validations || {},
        layout: field.layout || {}
      })),
    });
  } catch (error) {
    console.error("Error in /api/typeform/form:", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten",
    });
  }
});

// Neue Route für Webhook-Antworten
router.post("/responses/:formId", async (req, res) => {
  try {
    console.log("Received webhook response for formId:", req.params.formId);
    console.log("Webhook payload:", req.body);

    // Hier können Sie die Antworten verarbeiten und speichern
    // Zum Beispiel in der Datenbank oder für weitere Verarbeitung

    res.status(200).json({ message: "Webhook response received" });
  } catch (error) {
    console.error("Error processing webhook response:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Ein Fehler ist beim Verarbeiten der Webhook-Antwort aufgetreten"
    });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const { formId } = formRequestSchema.parse(req.body);

    const settings = await storage.getTypeformSettings();
    if (!settings?.apiToken) {
      throw new Error("Typeform API Token nicht konfiguriert");
    }

    // URL für den Webhook erstellen
    const protocol = req.protocol;
    const host = req.get('host');
    const webhookUrl = `${protocol}://${host}/api/typeform/responses/${formId}`;

    console.log("Creating webhook with URL:", webhookUrl);

    // Webhook bei Typeform registrieren mit einem eindeutigen Tag
    const webhookTag = `webhook_${formId}_${Date.now()}`;
    const response = await fetch(`https://api.typeform.com/forms/${formId}/webhooks/${webhookTag}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
        enabled: true,
        verify_ssl: false  // SSL-Verifikation deaktivieren für Entwicklungsumgebung
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Typeform webhook error:", error);
      throw new Error(error.description || "Fehler beim Erstellen des Webhooks");
    }

    const webhook = await response.json();
    console.log("Webhook created successfully:", webhook);

    // Sende die Webhook-URL zurück zum Client
    res.json({
      ...webhook,
      url: webhookUrl
    });
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten"
    });
  }
});

export default router;