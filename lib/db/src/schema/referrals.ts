import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  referrerUserId: integer("referrer_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  referredUserId: integer("referred_user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  referredAt: timestamp("referred_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralMilestonesTable = pgTable("referral_milestones", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").notNull().references(() => referralsTable.id, { onDelete: "cascade" }),
  milestoneType: text("milestone_type").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Referral = typeof referralsTable.$inferSelect;
export type ReferralMilestone = typeof referralMilestonesTable.$inferSelect;
