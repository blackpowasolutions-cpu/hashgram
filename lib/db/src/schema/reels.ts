import { pgTable, text, serial, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  description: text("description"),
  mediaUrl: text("media_url"),
  thumbnailUrl: text("thumbnail_url"),
  music: text("music"),
  views: integer("views").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const reelLikesTable = pgTable("reel_likes", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id").notNull().references(() => reelsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.reelId, t.userId)]);

export const reelCommentsTable = pgTable("reel_comments", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id").notNull().references(() => reelsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReelSchema = createInsertSchema(reelsTable).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertReel = z.infer<typeof insertReelSchema>;
export type Reel = typeof reelsTable.$inferSelect;

export const insertReelLikeSchema = createInsertSchema(reelLikesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReelLike = z.infer<typeof insertReelLikeSchema>;
export type ReelLike = typeof reelLikesTable.$inferSelect;

export const insertReelCommentSchema = createInsertSchema(reelCommentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReelComment = z.infer<typeof insertReelCommentSchema>;
export type ReelComment = typeof reelCommentsTable.$inferSelect;
