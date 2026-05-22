import { pgTable, serial, boolean, text, integer, timestamp } from "drizzle-orm/pg-core";

export const admobConfigTable = pgTable("admob_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  androidAppId: text("android_app_id").notNull().default("ca-app-pub-3940256099942544~3347511713"),
  iosAppId: text("ios_app_id").notNull().default("ca-app-pub-3940256099942544~1458002511"),
  interstitialAndroidUnitId: text("interstitial_android_unit_id").notNull().default("ca-app-pub-3940256099942544/1033173712"),
  interstitialIosUnitId: text("interstitial_ios_unit_id").notNull().default("ca-app-pub-3940256099942544/4411468910"),
  nativeAndroidUnitId: text("native_android_unit_id").notNull().default("ca-app-pub-3940256099942544/2247696110"),
  nativeIosUnitId: text("native_ios_unit_id").notNull().default("ca-app-pub-3940256099942544/3986624511"),
  appOpenAndroidUnitId: text("app_open_android_unit_id").notNull().default("ca-app-pub-3940256099942544/9257395921"),
  appOpenIosUnitId: text("app_open_ios_unit_id").notNull().default("ca-app-pub-3940256099942544/5575463023"),
  interstitialFrequency: integer("interstitial_frequency").notNull().default(3),
  interstitialCooldownSeconds: integer("interstitial_cooldown_seconds").notNull().default(30),
  nativeAdInterval: integer("native_ad_interval").notNull().default(5),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AdMobConfig = typeof admobConfigTable.$inferSelect;
