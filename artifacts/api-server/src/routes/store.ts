import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, giftCardsTable, giftPurchasesTable, pointsLogTable } from "@workspace/db";
import {
  CreateGiftCardBody,
  UpdateGiftCardParams,
  UpdateGiftCardBody,
  DeleteGiftCardParams,
  PurchaseGiftCardBody,
  AwardPointsBody,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { getLevel } from "../lib/jwt";

const router: IRouter = Router();

function randomCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

router.get("/store/cards", async (req: Request, res: Response): Promise<void> => {
  const type = req.query.type as string | undefined;
  const query = db.select().from(giftCardsTable);
  const cards = type
    ? await query.where(eq(giftCardsTable.cardType, type)).orderBy(giftCardsTable.minLevel, giftCardsTable.pointsCost)
    : await query.orderBy(giftCardsTable.minLevel, giftCardsTable.pointsCost);
  res.json(cards);
});

router.post("/store/cards", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = CreateGiftCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [card] = await db.insert(giftCardsTable).values(body.data).returning();
  res.status(201).json(card);
});

router.patch("/store/cards/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateGiftCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid card ID" });
    return;
  }
  const { id } = params.data;

  const body = UpdateGiftCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [card] = await db
    .update(giftCardsTable)
    .set(body.data)
    .where(eq(giftCardsTable.id, id))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Gift card not found" });
    return;
  }

  res.json(card);
});

router.delete("/store/cards/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = DeleteGiftCardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid card ID" });
    return;
  }
  const { id } = params.data;

  await db.delete(giftCardsTable).where(eq(giftCardsTable.id, id));
  res.sendStatus(204);
});

router.post("/store/purchase", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const body = PurchaseGiftCardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [card] = await db
    .select()
    .from(giftCardsTable)
    .where(and(eq(giftCardsTable.id, body.data.giftCardId), eq(giftCardsTable.isActive, true)))
    .limit(1);

  if (!card) {
    res.status(404).json({ error: "Gift card not found or inactive" });
    return;
  }

  const userLevel = getLevel(user.points);
  if (userLevel < card.minLevel) {
    res.status(400).json({ error: `Requires level ${card.minLevel}. You are level ${userLevel}.` });
    return;
  }

  if (user.points < card.pointsCost) {
    res.status(400).json({ error: `Insufficient points. Need ${card.pointsCost}, have ${user.points}.` });
    return;
  }

  // Enforce one redemption per user per gift card
  const existing = await db
    .select({ id: giftPurchasesTable.id })
    .from(giftPurchasesTable)
    .where(and(eq(giftPurchasesTable.userId, req.userId!), eq(giftPurchasesTable.giftCardId, card.id)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "You have already redeemed this gift card." });
    return;
  }

  const code = randomCode();
  const [purchase] = await db
    .insert(giftPurchasesTable)
    .values({
      userId: req.userId!,
      giftCardId: card.id,
      code,
      pointsSpent: card.pointsCost,
    })
    .returning();

  await db
    .update(usersTable)
    .set({ points: sql`${usersTable.points} - ${card.pointsCost}` })
    .where(eq(usersTable.id, req.userId!));

  await db.insert(pointsLogTable).values({
    userId: req.userId!,
    amount: -card.pointsCost,
    reason: `purchase:${card.brand}`,
  });

  res.status(201).json({
    id: purchase.id,
    userId: purchase.userId,
    giftCardId: purchase.giftCardId,
    giftCard: card,
    code: purchase.code,
    pointsSpent: purchase.pointsSpent,
    createdAt: purchase.createdAt,
  });
});

router.get("/store/purchases", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const purchases = await db
    .select({
      id: giftPurchasesTable.id,
      userId: giftPurchasesTable.userId,
      giftCardId: giftPurchasesTable.giftCardId,
      code: giftPurchasesTable.code,
      pointsSpent: giftPurchasesTable.pointsSpent,
      createdAt: giftPurchasesTable.createdAt,
      brand: giftCardsTable.brand,
      category: giftCardsTable.category,
      value: giftCardsTable.value,
      pointsCost: giftCardsTable.pointsCost,
      minLevel: giftCardsTable.minLevel,
      gradientFrom: giftCardsTable.gradientFrom,
      gradientTo: giftCardsTable.gradientTo,
      emoji: giftCardsTable.emoji,
      description: giftCardsTable.description,
      isActive: giftCardsTable.isActive,
      cardCreatedAt: giftCardsTable.createdAt,
    })
    .from(giftPurchasesTable)
    .innerJoin(giftCardsTable, eq(giftPurchasesTable.giftCardId, giftCardsTable.id))
    .where(eq(giftPurchasesTable.userId, req.userId!))
    .orderBy(sql`${giftPurchasesTable.createdAt} desc`);

  res.json(
    purchases.map((p) => ({
      id: p.id,
      userId: p.userId,
      giftCardId: p.giftCardId,
      code: p.code,
      pointsSpent: p.pointsSpent,
      createdAt: p.createdAt,
      giftCard: {
        id: p.giftCardId,
        brand: p.brand,
        category: p.category,
        value: p.value,
        pointsCost: p.pointsCost,
        minLevel: p.minLevel,
        gradientFrom: p.gradientFrom,
        gradientTo: p.gradientTo,
        emoji: p.emoji,
        description: p.description,
        isActive: p.isActive,
        createdAt: p.cardCreatedAt,
      },
    }))
  );
});

router.get("/store/balance", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [user] = await db
    .select({ points: usersTable.points })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ userId: req.userId!, balance: user.points, level: getLevel(user.points) });
});

router.post("/store/award", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const body = AwardPointsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ points: sql`${usersTable.points} + ${body.data.amount}` })
    .where(eq(usersTable.id, body.data.userId))
    .returning({ id: usersTable.id, points: usersTable.points });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(pointsLogTable).values({
    userId: body.data.userId,
    amount: body.data.amount,
    reason: body.data.reason,
  });

  res.json({ userId: user.id, balance: user.points, level: getLevel(user.points) });
});

export default router;
