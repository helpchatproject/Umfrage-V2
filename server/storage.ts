import { users, webhooks, responses, emailSettings, appSettings, typeformSettings } from "@shared/schema";
import type { User, Webhook, Response, EmailSettings, AppSettings, TypeformSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;

  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  createUser(user: Omit<User, "id">): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Webhook operations
  getWebhooks(userId: number): Promise<Webhook[]>;
  getWebhook(id: number): Promise<Webhook | null>;
  createWebhook(webhook: Omit<Webhook, "id">): Promise<Webhook>;
  updateWebhook(id: number, webhook: Partial<Webhook>): Promise<Webhook>;
  deleteWebhook(id: number): Promise<void>;
  getResponses(webhookId: number): Promise<Response[]>;
  createResponse(webhookId: number, data: any): Promise<Response>;

  // Settings operations
  getEmailSettings(): Promise<EmailSettings | null>;
  updateEmailSettings(settings: EmailSettings): Promise<EmailSettings>;
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  getTypeformSettings(): Promise<TypeformSettings | null>;
  updateTypeformSettings(settings: TypeformSettings): Promise<TypeformSettings>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async createUser(user: Omit<User, "id">): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Webhook operations
  async getWebhooks(userId: number): Promise<Webhook[]> {
    return await db.select().from(webhooks).where(eq(webhooks.userId, userId));
  }

  async getWebhook(id: number): Promise<Webhook | null> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return webhook || null;
  }

  async createWebhook(webhook: Omit<Webhook, "id">): Promise<Webhook> {
    const [newWebhook] = await db.insert(webhooks).values(webhook).returning();
    return newWebhook;
  }

  async updateWebhook(id: number, webhook: Partial<Webhook>): Promise<Webhook> {
    const [updatedWebhook] = await db
      .update(webhooks)
      .set(webhook)
      .where(eq(webhooks.id, id))
      .returning();
    return updatedWebhook;
  }

  async deleteWebhook(id: number): Promise<void> {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  }

  async getResponses(webhookId: number): Promise<Response[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.webhookId, webhookId))
      .orderBy(responses.createdAt);
  }

  async createResponse(webhookId: number, data: any): Promise<Response> {
    const [newResponse] = await db
      .insert(responses)
      .values({
        webhookId,
        responseData: data.responseData,
        caseNumber: data.caseNumber,
      })
      .returning();
    return newResponse;
  }

  // Settings operations
  async getEmailSettings(): Promise<EmailSettings | null> {
    const [settings] = await db.select().from(emailSettings).limit(1);
    return settings || null;
  }

  async updateEmailSettings(settings: EmailSettings): Promise<EmailSettings> {
    // Delete existing settings first
    await db.delete(emailSettings);
    // Insert new settings
    const [newSettings] = await db.insert(emailSettings)
      .values({
        ...settings,
        updatedAt: new Date()
      })
      .returning();
    return newSettings;
  }

  async getAppSettings(): Promise<AppSettings> {
    const [settings] = await db.select().from(appSettings).limit(1);
    if (!settings) {
      // Create default settings if none exist
      return this.updateAppSettings({
        companyName: "Medventi GmbH",
        logoUrl: "/Medventi_logo_colour.png",
        updatedAt: new Date()
      });
    }
    return settings;
  }

  async updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    // Delete existing settings first
    await db.delete(appSettings);

    // Prepare the new settings with required fields
    const newSettings = {
      ...settings,
      updatedAt: new Date(),
      id: 1, // Always use ID 1 for app settings
    };

    // Insert new settings
    const [updatedSettings] = await db.insert(appSettings)
      .values(newSettings)
      .returning();
    return updatedSettings;
  }

  // Neue Typeform Settings Operationen
  async getTypeformSettings(): Promise<TypeformSettings | null> {
    const [settings] = await db.select().from(typeformSettings).limit(1);
    return settings || null;
  }

  async updateTypeformSettings(settings: TypeformSettings): Promise<TypeformSettings> {
    // Delete existing settings first
    await db.delete(typeformSettings);
    // Insert new settings
    const [newSettings] = await db.insert(typeformSettings)
      .values({
        ...settings,
        updatedAt: new Date()
      })
      .returning();
    return newSettings;
  }
}

export const storage = new DatabaseStorage();