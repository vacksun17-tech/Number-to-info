import { pgTable, text, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const keyStatusEnum = pgEnum("key_status", ["active", "revoked", "expired"]);

export const apiKeysTable = pgTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),          // This IS the key — e.g. "Sahil"
  ownerId: text("owner_id"),
  status: keyStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [unique("api_keys_name_unique").on(t.name)]);

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({ createdAt: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeysTable.$inferSelect;
