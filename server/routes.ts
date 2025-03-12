import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertWebhookSchema, insertUserSchema, appSettingsSchema } from "@shared/schema";
import { ZodError } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { emailSettingsSchema } from "@shared/schema";
import { sendWebhookNotification } from "./services/email";
import { sendTestEmail } from "./services/email";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import type { AppSettings } from "@shared/schema";
import { parseMultipartForm, saveFile } from './utils/file-handler';
import { typeformSettingsSchema, TypeformSettings } from "@shared/schema";
import * as fs from 'fs';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Middleware für Admin-Prüfung
function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  if (!req.user.isRootAdmin) return res.sendStatus(403);
  next();
}

// Add this helper function at the top of the file
async function verifyTypeformForm(settings: TypeformSettings, formId: string): Promise<boolean> {
  try {
    console.log(`Verifying form ${formId} exists...`);

    const response = await fetch(`https://api.typeform.com/forms/${formId}`, {
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Form verification failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying form:", error);
    return false;
  }
}

// Verbesserte Funktion zum Löschen von Typeform Webhooks
async function deleteTypeformWebhook(settings: TypeformSettings, formId: string) {
  try {
    console.log(`Deleting Typeform webhooks for form ${formId}`);

    // Zuerst alle Webhooks für das Formular abrufen
    const response = await fetch(`https://api.typeform.com/forms/${formId}/webhooks`, {
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to fetch Typeform webhooks:', error);
      throw new Error('Failed to fetch Typeform webhooks');
    }

    const webhooks = await response.json();
    console.log(`Found ${webhooks.items.length} webhooks to delete`);

    // Jeden Webhook für dieses Formular löschen
    for (const webhook of webhooks.items) {
      console.log(`Deleting webhook ${webhook.id}`);
      const deleteResponse = await fetch(`https://api.typeform.com/forms/${formId}/webhooks/${webhook.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${settings.apiToken}`
        }
      });

      if (!deleteResponse.ok) {
        console.error(`Failed to delete webhook ${webhook.id}`);
        throw new Error(`Failed to delete webhook ${webhook.id}`);
      }
      console.log(`Successfully deleted webhook ${webhook.id}`);
    }
  } catch (error) {
    console.error('Error deleting Typeform webhook:', error);
    throw error;
  }
}

// Update the webhook creation function
async function createTypeformWebhook(settings: TypeformSettings, formId: string, webhookUrl: string) {
  try {
    console.log(`Creating Typeform webhook for form ${formId} with URL ${webhookUrl}`);

    // First verify the form exists
    const formExists = await verifyTypeformForm(settings, formId);
    if (!formExists) {
      throw new Error(`Das Formular mit der ID "${formId}" wurde nicht gefunden. Bitte überprüfen Sie die Formular-ID.`);
    }

    const response = await fetch(`https://api.typeform.com/forms/${formId}/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        verify_ssl: false
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Typeform webhook creation failed:', responseData);
      throw new Error(`Fehler beim Erstellen des Webhooks: ${responseData.description || 'Unbekannter Fehler'}`);
    }

    console.log('Successfully created Typeform webhook:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error creating Typeform webhook:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // User management routes - Nur für Admins
  app.get("/api/users", requireAdmin, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword
      });
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const updateData = {
        ...data,
        password: data.password ? await hashPassword(data.password) : undefined
      };
      const user = await storage.updateUser(parseInt(req.params.id), updateData);
      res.json(user);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteUser(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Email settings routes - Nur für Admins
  app.get("/api/email-settings", requireAdmin, async (req, res) => {
    const settings = await storage.getEmailSettings();
    res.json(settings || {});
  });

  app.post("/api/email-settings", requireAdmin, async (req, res) => {
    try {
      const data = emailSettingsSchema.parse(req.body);
      const settings = await storage.updateEmailSettings(data);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.post("/api/email-settings/test", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getEmailSettings();
      if (!settings) {
        return res.status(400).json({ error: "E-Mail-Einstellungen nicht konfiguriert" });
      }

      await sendTestEmail(settings);
      res.json({ message: "Test-E-Mail erfolgreich gesendet" });
    } catch (error) {
      console.error("Error testing email settings:", error);
      res.status(500).json({
        error: "Fehler beim Senden der Test-E-Mail",
        details: error.message
      });
    }
  });

  // App settings routes - Nur für Admins
  app.get("/api/app-settings", requireAdmin, async (req, res) => {
    const settings = await storage.getAppSettings();
    res.json(settings || {});
  });

  // Update the app settings route
  app.post("/api/app-settings", requireAdmin, async (req, res) => {
    try {
      // FormData parsen
      const { fields, files } = await parseMultipartForm(req);

      const companyName = fields.companyName?.[0];
      const logoFile = files.logo?.[0];

      // Validiere den Firmennamen
      if (!companyName) {
        return res.status(400).json({ error: "Firmenname ist erforderlich" });
      }

      // Stelle sicher, dass die Verzeichnisse existieren
      const publicDir = 'public';
      const uploadsDir = 'public/uploads';

      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Hole aktuelle Einstellungen
      const currentSettings = await storage.getAppSettings();
      let logoUrl = currentSettings?.logoUrl || "/Medventi_logo_colour.png";

      // Wenn ein neues Logo hochgeladen wurde
      if (logoFile) {
        try {
          // Generiere einen eindeutigen Dateinamen
          const filename = `logo_${Date.now()}_${logoFile.originalFilename?.replace(/\s+/g, '_')}`;
          const filePath = `${uploadsDir}/${filename}`;
          const publicPath = `/uploads/${filename}`;

          // Speichere die Datei
          await saveFile(logoFile, filePath);
          logoUrl = publicPath;

          console.log("Logo erfolgreich gespeichert:", {
            originalName: logoFile.originalFilename,
            savedPath: filePath,
            publicUrl: logoUrl
          });
        } catch (error) {
          console.error("Fehler beim Speichern des Logos:", error);
          return res.status(500).json({ error: "Fehler beim Speichern des Logos" });
        }
      }

      // Aktualisiere die Einstellungen
      const settings = await storage.updateAppSettings({
        companyName,
        logoUrl,
        updatedAt: new Date()
      });

      res.json(settings);
    } catch (error) {
      console.error("Error updating app settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Standard Webhook routes - Für alle authentifizierten Benutzer
  app.get("/api/webhooks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const webhooks = await storage.getWebhooks(req.user.id);
    res.json(webhooks);
  });

  app.get("/api/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const webhook = await storage.getWebhook(parseInt(req.params.id));
    if (!webhook) return res.status(404).json({ error: "Webhook not found" });
    if (webhook.userId !== req.user.id) return res.sendStatus(403);
    res.json(webhook);
  });

  // Update the POST route for webhook creation
  app.post("/api/webhooks", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Nicht autorisiert" });
      }

      const data = insertWebhookSchema.parse({
        ...req.body,
        userId: req.user.id,
        notifyEmailAddresses: req.body.notifyEmail ? req.body.notifyEmailAddresses : []
      });

      // Get Typeform settings
      const settings = await storage.getTypeformSettings();
      if (!settings?.apiToken) {
        return res.status(400).json({ error: "Typeform API Token nicht konfiguriert" });
      }

      // Generate webhook URL using the host from request
      const host = req.get('host');
      const protocol = req.protocol;
      const webhookUrl = `${protocol}://${host}/api/webhooks/${data.typeformId}/receive`;

      console.log('Attempting to create webhook with URL:', webhookUrl);

      try {
        // Create webhook in Typeform first
        await createTypeformWebhook(settings, data.typeformId, webhookUrl);

        // Then create webhook in our system
        const webhook = await storage.createWebhook({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        res.status(201).json(webhook);
      } catch (error) {
        // If Typeform webhook creation fails, return detailed error
        console.error("Error creating Typeform webhook:", error);
        return res.status(400).json({
          error: "Fehler beim Erstellen des Typeform Webhooks",
          details: error.message
        });
      }
    } catch (error) {
      console.error("Error creating webhook:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validierungsfehler",
          details: error.errors.map(e => e.message)
        });
      }

      res.status(500).json({
        error: "Fehler beim Erstellen des Webhooks",
        details: error.message
      });
    }
  });

  app.patch("/api/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const webhook = await storage.getWebhook(parseInt(req.params.id));
      if (!webhook) return res.status(404).json({ error: "Webhook not found" });
      if (webhook.userId !== req.user.id) return res.sendStatus(403);

      const data = insertWebhookSchema.parse({
        ...req.body,
        userId: webhook.userId,
        updatedAt: new Date()
      });

      // Get Typeform settings
      const settings = await storage.getTypeformSettings();
      if (!settings?.apiToken) {
        return res.status(400).json({ error: "Typeform API Token nicht konfiguriert" });
      }

      // Update webhook in Typeform
      // First delete old webhook
      await deleteTypeformWebhook(settings, webhook.typeformId);

      // Then create new webhook if typeformId changed
      if (data.typeformId !== webhook.typeformId) {
        const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/${data.typeformId}/receive`;
        await createTypeformWebhook(settings, data.typeformId, webhookUrl);
      }

      // Update webhook in our system
      const updatedWebhook = await storage.updateWebhook(parseInt(req.params.id), data);
      res.json(updatedWebhook);
    } catch (error) {
      console.error("Error updating webhook:", error);

      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validierungsfehler",
          details: error.errors.map(e => e.message)
        });
      }

      res.status(500).json({
        error: "Fehler beim Aktualisieren des Webhooks",
        details: error.message
      });
    }
  });

  // Aktualisierte DELETE Route
  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Nicht autorisiert" });
      }

      const webhookId = parseInt(req.params.id);
      console.log(`Attempting to delete webhook with ID: ${webhookId}`);

      const webhook = await storage.getWebhook(webhookId);
      if (!webhook) {
        console.error(`Webhook not found with ID: ${webhookId}`);
        return res.status(404).json({ error: "Webhook nicht gefunden" });
      }

      if (webhook.userId !== req.user.id) {
        console.error(`Unauthorized deletion attempt for webhook ${webhookId} by user ${req.user.id}`);
        return res.status(403).json({ error: "Nicht berechtigt" });
      }

      // Typeform Einstellungen abrufen
      const settings = await storage.getTypeformSettings();
      if (!settings?.apiToken) {
        return res.status(400).json({ error: "Typeform API Token nicht konfiguriert" });
      }

      // Zuerst den Webhook in Typeform löschen
      console.log(`Deleting Typeform webhook for form ${webhook.typeformId}`);
      await deleteTypeformWebhook(settings, webhook.typeformId);

      // Dann den Webhook in unserem System löschen
      console.log(`Deleting webhook ${webhookId} from database`);
      await storage.deleteWebhook(webhookId);

      console.log(`Successfully deleted webhook ${webhookId}`);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({
        error: "Fehler beim Löschen des Webhooks",
        details: error.message
      });
    }
  });

  // Add this route near the other Typeform settings routes
  app.post("/api/typeform-settings/validate-token", requireAdmin, async (req, res) => {
    try {
      const { apiToken } = req.body;

      if (!apiToken) {
        return res.status(400).json({ error: "API Token ist erforderlich" });
      }

      // Test the token by making a request to Typeform API
      const response = await fetch('https://api.typeform.com/forms', {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Invalid API token');
      }

      const data = await response.json();

      res.json({
        valid: true,
        message: "API Token ist gültig",
        forms: data.items.length
      });
    } catch (error) {
      console.error("Error validating Typeform token:", error);
      res.status(400).json({
        valid: false,
        error: "API Token ist ungültig. Bitte überprüfen Sie den Token und versuchen Sie es erneut."
      });
    }
  });

  // Add near other Typeform routes
  app.get("/api/typeform-settings/forms", requireAdmin, async (req, res) => {
    try {
      // Get the API token from settings
      const settings = await storage.getTypeformSettings();
      if (!settings?.apiToken) {
        return res.status(400).json({ error: "Typeform API Token nicht konfiguriert" });
      }

      // Fetch forms from Typeform API
      console.log("Fetching forms from Typeform API...");
      const response = await fetch('https://api.typeform.com/forms', {
        headers: {
          'Authorization': `Bearer ${settings.apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Typeform API error:", error);
        throw new Error('Fehler beim Abrufen der Typeform-Formulare');
      }

      const data = await response.json();
      console.log(`Found ${data.items.length} forms`);

      // Map the response to include only necessary fields
      const forms = data.items.map(form => ({
        id: form.id,
        title: form.title,
        lastUpdated: form.last_updated_at,
        _links: form._links
      }));

      res.json(forms);
    } catch (error) {
      console.error("Error fetching Typeform forms:", error);
      res.status(500).json({
        error: "Fehler beim Abrufen der Typeform-Formulare",
        details: error.message
      });
    }
  });

  // Add route to get specific form details
  app.get("/api/typeform-settings/forms/:formId", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getTypeformSettings();
      if (!settings?.apiToken) {
        return res.status(400).json({ error: "Typeform API Token nicht konfiguriert" });
      }

      console.log("Fetching form details for:", req.params.formId);

      const response = await fetch(`https://api.typeform.com/forms/${req.params.formId}`, {
        headers: {
          'Authorization': `Bearer ${settings.apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Typeform API error:", errorData);
        throw new Error(`Fehler beim Abrufen der Formulardetails: ${errorData.description || 'Unbekannter Fehler'}`);
      }

      const data = await response.json();
      console.log("Typeform form details:", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching form details:", error);
      res.status(500).json({
        error: "Fehler beim Abrufen der Formulardetails",
        details: error.message
      });
    }
  });


  // Add this route near the other Typeform settings routes
  app.get("/api/metrics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get total webhooks for the user
      const userWebhooks = await storage.getWebhooks(req.user.id);

      // Get all responses for user's webhooks
      let totalResponses = 0;
      let responsesToday = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const webhook of userWebhooks) {
        const webhookResponses = await storage.getResponses(webhook.id);
        totalResponses += webhookResponses.length;

        // Count responses from today
        responsesToday += webhookResponses.filter(response => {
          const responseDate = new Date(response.createdAt);
          return responseDate >= today;
        }).length;
      }

      // Calculate average response time (dummy data for now)
      const avgResponseTime = 1.5; // In seconds

      res.json({
        totalWebhooks: userWebhooks.length,
        totalResponses,
        responsesToday,
        avgResponseTime,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add this route near the other Typeform settings routes
  app.get("/api/typeform/forms/:formId/responses", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      // Get settings for API token
      const settings = await storage.getTypeformSettings();
      if (!settings?.apiToken) {
        return res.status(400).json({ error: "Typeform API Token nicht konfiguriert" });
      }

      console.log("Fetching responses for form:", req.params.formId);

      // Get all responses with pagination
      const apiUrl = `https://api.typeform.com/forms/${req.params.formId}/responses?page_size=1000&completed=true`;
      console.log("Calling Typeform API:", apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${settings.apiToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Typeform API error:", errorData);
        throw new Error(`Fehler beim Abrufen der Formularantworten: ${errorData.description || 'Unbekannter Fehler'}`);
      }

      const data = await response.json();
      console.log("Received Typeform responses:", data);

      res.json(data.items || []);
    } catch (error) {
      console.error("Error fetching form responses:", error);
      res.status(500).json({
        error: "Fehler beim Abrufen der Formularantworten",
        details: error.message
      });
    }
  });

  // Update the responses endpoint to properly fetch responses
  app.get("/api/webhooks/:id/responses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const webhook = await storage.getWebhook(parseInt(req.params.id));
      if (!webhook) return res.status(404).json({ error: "Webhook not found" });
      if (webhook.userId !== req.user.id) return res.sendStatus(403);

      const responses = await storage.getResponses(parseInt(req.params.id));
      console.log(`Fetched ${responses.length} responses for webhook ${req.params.id}`);

      res.json(responses);
    } catch (error) {
      console.error("Error fetching responses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update the webhook receive endpoint
  app.post("/api/webhooks/:typeformId/receive", async (req, res) => {
    try {
      // Find webhook by typeformId instead of numeric id
      const webhooks = await storage.getWebhooks();
      const webhook = webhooks.find(w => w.typeformId === req.params.typeformId);

      if (!webhook) {
        console.error(`Webhook not found for Typeform ID: ${req.params.typeformId}`);
        return res.status(404).json({ error: "Webhook not found" });
      }

      // Log incoming webhook data for debugging
      console.log("Received webhook data for Typeform ID:", webhook.typeformId);
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      // Validate that this is a Typeform response
      if (!req.body.form_response) {
        console.error("Invalid webhook data: Missing form_response");
        return res.status(400).json({ error: "Invalid webhook data format" });
      }

      // Store the response data
      const response = await storage.createResponse(webhook.id, {
        responseData: JSON.stringify(req.body),
        caseNumber: req.body.event_id || `CASE-${Date.now()}`,
        createdAt: new Date()
      });

      console.log("Created response:", response);

      // Notify connected WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            const message = JSON.stringify({
              type: 'newResponse',
              webhookId: webhook.id,
              responseData: req.body
            });
            client.send(message);
            console.log("WebSocket notification sent for webhook:", webhook.id);
          } catch (error) {
            console.error('Error sending WebSocket message:', error);
          }
        }
      });

      res.status(201).json(response);
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error.message
      });
    }
  });

  // Typeform settings routes - Nur für Admins
  app.get("/api/typeform-settings", requireAdmin, async (req, res) => {
    const settings = await storage.getTypeformSettings();
    res.json(settings || {});
  });

  app.post("/api/typeform-settings", requireAdmin, async (req, res) => {
    try {
      const data = typeformSettingsSchema.parse(req.body);
      const settings = await storage.updateTypeformSettings(data);
      res.status(200).json(settings);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error("Error updating typeform settings:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Send a test message to verify connection
    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  return httpServer;
}