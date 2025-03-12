import { pgTable, text, serial, boolean, timestamp, json, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isRootAdmin: boolean("is_root_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Webhooks table
export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  typeformId: text("typeform_id").notNull(),
  notifyEmail: boolean("notify_email").default(false),
  notifyEmailAddresses: text("notify_email_addresses").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Responses table
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  webhookId: serial("webhook_id").references(() => webhooks.id),
  responseData: json("response_data").notNull(),
  caseNumber: text("case_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add new tables for settings
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPassword: text("smtp_password").notNull(),
  fromEmail: text("from_email").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add new table for Typeform settings
export const typeformSettings = pgTable("typeform_settings", {
  id: serial("id").primaryKey(),
  apiToken: text("api_token").notNull(),
  workspaceId: text("workspace_id"),
  defaultLanguage: text("default_language").default("de"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  user: one(users, {
    fields: [webhooks.userId],
    references: [users.id],
  }),
  responses: many(responses),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [responses.webhookId],
    references: [webhooks.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type InsertResponse = typeof responses.$inferInsert;
export type EmailSettings = typeof emailSettings.$inferSelect;
export type InsertEmailSettings = typeof emailSettings.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = typeof appSettings.$inferInsert;
// Export new types
export type TypeformSettings = typeof typeformSettings.$inferSelect;
export type InsertTypeformSettings = typeof typeformSettings.$inferInsert;

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertWebhookSchema = createInsertSchema(webhooks)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine((data) => {
    if (data.notifyEmail && (!data.notifyEmailAddresses || data.notifyEmailAddresses.length === 0)) {
      return false;
    }
    return true;
  }, {
    message: "Mindestens eine E-Mail-Adresse ist erforderlich wenn Benachrichtigungen aktiviert sind",
    path: ["notifyEmailAddresses"]
  });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, createdAt: true });

export const emailSettingsSchema = createInsertSchema(emailSettings).omit({ id: true, updatedAt: true });
export const appSettingsSchema = createInsertSchema(appSettings).omit({ id: true, updatedAt: true });
// Export new schema
export const typeformSettingsSchema = createInsertSchema(typeformSettings).omit({ id: true, updatedAt: true });