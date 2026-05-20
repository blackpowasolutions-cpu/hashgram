import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const giftCardsTable = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  pointsCost: integer("points_cost").notNull(),
  minLevel: integer("min_level").notNull().default(1),
  gradientFrom: text("gradient_from").notNull(),
  gradientTo: text("gradient_to").notNull(),
  emoji: text("emoji").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const giftPurchasesTable = pgTable("gift_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  giftCardId: integer("gift_card_id").notNull().references(() => giftCardsTable.id),
  code: text("code").notNull(),
  pointsSpent: integer("points_spent").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsLogTable = pgTable("points_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGiftCardSchema = createInsertSchema(giftCardsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;
export type GiftCard = typeof giftCardsTable.$inferSelect;

export const insertGiftPurchaseSchema = createInsertSchema(giftPurchasesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGiftPurchase = z.infer<typeof insertGiftPurchaseSchema>;
export type GiftPurchase = typeof giftPurchasesTable.$inferSelect;

export const insertPointsLogSchema = createInsertSchema(pointsLogTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPointsLog = z.infer<typeof insertPointsLogSchema>;
export type PointsLog = typeof pointsLogTable.$inferSelect;
