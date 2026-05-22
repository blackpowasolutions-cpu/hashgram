import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, admobConfigTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const DEFAULT_CONFIG = {
  enabled: false,
  androidAppId: "ca-app-pub-3940256099942544~3347511713",
  iosAppId: "ca-app-pub-3940256099942544~1458002511",
  interstitialAndroidUnitId: "ca-app-pub-3940256099942544/1033173712",
  interstitialIosUnitId: "ca-app-pub-3940256099942544/4411468910",
  nativeAndroidUnitId: "ca-app-pub-3940256099942544/2247696110",
  nativeIosUnitId: "ca-app-pub-3940256099942544/3986624511",
  appOpenAndroidUnitId: "ca-app-pub-3940256099942544/9257395921",
  appOpenIosUnitId: "ca-app-pub-3940256099942544/5575463023",
  interstitialFrequency: 3,
  interstitialCooldownSeconds: 30,
  nativeAdInterval: 5,
};

router.get("/ads/config", async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(admobConfigTable).limit(1);
    if (!rows[0]) {
      res.json(DEFAULT_CONFIG);
      return;
    }
    const { id: _id, updatedAt: _u, ...config } = rows[0];
    res.json(config);
  } catch {
    res.json(DEFAULT_CONFIG);
  }
});

router.patch("/ads/config", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = req.body as Partial<typeof DEFAULT_CONFIG & { enabled: boolean }>;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.enabled !== undefined) update.enabled = body.enabled;
  if (body.androidAppId !== undefined) update.androidAppId = body.androidAppId;
  if (body.iosAppId !== undefined) update.iosAppId = body.iosAppId;
  if (body.interstitialAndroidUnitId !== undefined) update.interstitialAndroidUnitId = body.interstitialAndroidUnitId;
  if (body.interstitialIosUnitId !== undefined) update.interstitialIosUnitId = body.interstitialIosUnitId;
  if (body.nativeAndroidUnitId !== undefined) update.nativeAndroidUnitId = body.nativeAndroidUnitId;
  if (body.nativeIosUnitId !== undefined) update.nativeIosUnitId = body.nativeIosUnitId;
  if (body.appOpenAndroidUnitId !== undefined) update.appOpenAndroidUnitId = body.appOpenAndroidUnitId;
  if (body.appOpenIosUnitId !== undefined) update.appOpenIosUnitId = body.appOpenIosUnitId;
  if (body.interstitialFrequency !== undefined) update.interstitialFrequency = body.interstitialFrequency;
  if (body.interstitialCooldownSeconds !== undefined) update.interstitialCooldownSeconds = body.interstitialCooldownSeconds;
  if (body.nativeAdInterval !== undefined) update.nativeAdInterval = body.nativeAdInterval;

  const [row] = await db
    .update(admobConfigTable)
    .set(update)
    .where(eq(admobConfigTable.id, 1))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Config not found" });
    return;
  }
  const { id: _id, updatedAt: _u, ...config } = row;
  res.json(config);
});

export default router;
