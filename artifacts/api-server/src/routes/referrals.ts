import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  referralsTable,
  referralMilestonesTable,
  postsTable,
  postReactionsTable,
  pointsLogTable,
  rewardConfigTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { getLevel } from "../lib/jwt";

const router: IRouter = Router();

function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function getOrCreateReferralCode(userId: number): Promise<string> {
  const [user] = await db
    .select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (user?.referralCode) return user.referralCode;

  let code = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCode();
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, candidate))
      .limit(1);
    if (!existing) { code = candidate; break; }
  }
  if (!code) throw new Error("Could not generate a unique referral code");

  await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, userId));
  return code;
}

router.get("/referrals/my-code", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = await getOrCreateReferralCode(req.userId!);
  res.json({ code });
});

router.get("/referrals/stats", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code = await getOrCreateReferralCode(req.userId!);

  const myReferrals = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerUserId, req.userId!));

  let totalPointsEarned = 0;
  const entries = [];

  for (const referral of myReferrals) {
    if (!referral.referredUserId) continue;

    const [referredUser] = await db
      .select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
      .from(usersTable)
      .where(eq(usersTable.id, referral.referredUserId))
      .limit(1);

    const milestones = await db
      .select()
      .from(referralMilestonesTable)
      .where(eq(referralMilestonesTable.referralId, referral.id));

    const entryPoints = milestones.reduce((sum, m) => sum + m.pointsAwarded, 0);
    totalPointsEarned += entryPoints;

    entries.push({
      id: referral.id,
      referredUserId: referral.referredUserId,
      referredDisplayName: referredUser?.displayName ?? null,
      referredAvatarUrl: referredUser?.avatarUrl ?? null,
      referredAt: (referral.referredAt ?? referral.createdAt).toISOString(),
      milestonesAchieved: milestones.map((m) => ({
        type: m.milestoneType,
        pointsAwarded: m.pointsAwarded,
        awardedAt: m.awardedAt.toISOString(),
      })),
      totalPointsEarned: entryPoints,
    });
  }

  res.json({ code, totalReferred: entries.length, totalPointsEarned, referrals: entries });
});

router.post("/referrals/apply", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const code: unknown = req.body?.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    res.status(400).json({ error: "code is required" });
    return;
  }

  const [alreadyReferred] = await db
    .select({ id: referralsTable.id })
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, req.userId!))
    .limit(1);

  if (alreadyReferred) {
    res.status(400).json({ error: "You have already used a referral code" });
    return;
  }

  const [referrer] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referralCode, code.toUpperCase()))
    .limit(1);

  if (!referrer) {
    res.status(400).json({ error: "Invalid referral code" });
    return;
  }

  if (referrer.id === req.userId!) {
    res.status(400).json({ error: "You cannot use your own referral code" });
    return;
  }

  await db.insert(referralsTable).values({
    code: code.toUpperCase(),
    referrerUserId: referrer.id,
    referredUserId: req.userId!,
    referredAt: new Date(),
  });

  res.json({ success: true });
});

export async function checkAndAwardReferralMilestones(referredUserId: number): Promise<void> {
  const [referral] = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referredUserId, referredUserId))
    .limit(1);
  if (!referral) return;

  const [config] = await db.select().from(rewardConfigTable).limit(1);
  if (!config) return;

  const awardedRows = await db
    .select({ milestoneType: referralMilestonesTable.milestoneType })
    .from(referralMilestonesTable)
    .where(eq(referralMilestonesTable.referralId, referral.id));
  const awarded = new Set(awardedRows.map((r) => r.milestoneType));

  const [referredUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, referredUserId))
    .limit(1);
  if (!referredUser) return;

  const referredAt = referral.referredAt ?? referral.createdAt;
  const now = new Date();
  const daysSince = (now.getTime() - referredAt.getTime()) / 86_400_000;
  const isActive =
    referredUser.lastActiveAt != null &&
    now.getTime() - referredUser.lastActiveAt.getTime() < 30 * 86_400_000;

  const pending: Array<{ type: string; points: number }> = [];

  if (!awarded.has("retention_3d") && daysSince >= 3 && isActive && config.referralRetention3dPoints > 0)
    pending.push({ type: "retention_3d", points: config.referralRetention3dPoints });

  if (!awarded.has("retention_7d") && daysSince >= 7 && isActive && config.referralRetention7dPoints > 0)
    pending.push({ type: "retention_7d", points: config.referralRetention7dPoints });

  if (!awarded.has("retention_14d") && daysSince >= 14 && isActive && config.referralRetention14dPoints > 0)
    pending.push({ type: "retention_14d", points: config.referralRetention14dPoints });

  if (!awarded.has("engagement_likes") && config.referralEngagementLikesPoints > 0) {
    const [likesRes] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(postReactionsTable)
      .innerJoin(postsTable, eq(postsTable.id, postReactionsTable.postId))
      .where(eq(postsTable.userId, referredUserId));
    if ((likesRes?.total ?? 0) >= config.referralEngagementLikesThreshold)
      pending.push({ type: "engagement_likes", points: config.referralEngagementLikesPoints });
  }

  if (!awarded.has("engagement_posts") && config.referralEngagementPostsPoints > 0) {
    const [postsRes] = await db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(postsTable)
      .where(and(eq(postsTable.userId, referredUserId), eq(postsTable.isActive, true)));
    if ((postsRes?.total ?? 0) >= config.referralEngagementPostsThreshold)
      pending.push({ type: "engagement_posts", points: config.referralEngagementPostsPoints });
  }

  if (!awarded.has("engagement_level5") && config.referralEngagementLevel5Points > 0) {
    if (getLevel(referredUser.points) >= 5)
      pending.push({ type: "engagement_level5", points: config.referralEngagementLevel5Points });
  }

  if (pending.length === 0) return;

  const referrerId = referral.referrerUserId;
  const totalPoints = pending.reduce((s, m) => s + m.points, 0);

  await Promise.all([
    db.insert(referralMilestonesTable).values(
      pending.map((m) => ({
        referralId: referral.id,
        milestoneType: m.type,
        pointsAwarded: m.points,
      }))
    ),
    db.insert(pointsLogTable).values(
      pending.map((m) => ({
        userId: referrerId,
        amount: m.points,
        reason: `referral_${m.type}`,
      }))
    ),
    db
      .update(usersTable)
      .set({ points: sql`${usersTable.points} + ${totalPoints}` })
      .where(eq(usersTable.id, referrerId)),
  ]);
}

export default router;
