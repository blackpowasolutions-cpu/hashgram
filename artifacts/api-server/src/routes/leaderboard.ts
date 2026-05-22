import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, gte, sql, and } from "drizzle-orm";
import { db, usersTable, pointsLogTable, rewardConfigTable } from "@workspace/db";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";
import { getLevel } from "../lib/jwt";

const router: IRouter = Router();

function calcPenalty(lastActiveAt: Date | null | undefined, penaltyPoints: number, penaltyHours: number): number {
  if (!lastActiveAt || penaltyPoints === 0 || penaltyHours === 0) return 0;
  const hoursInactive = (Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60);
  const windows = Math.floor(hoursInactive / penaltyHours);
  return windows * penaltyPoints;
}

router.get("/leaderboard", async (req: Request, res: Response): Promise<void> => {
  const query = GetLeaderboardQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const period = query.data.period ?? "alltime";
  const limit = Math.min(query.data.limit ?? 10, 50);

  const [config] = await db.select().from(rewardConfigTable).limit(1);
  const penaltyPoints = config?.inactivityPenaltyPoints ?? 100;
  const penaltyHours = config?.inactivityPenaltyHours ?? 6;

  if (period === "alltime") {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        bio: usersTable.bio,
        points: usersTable.points,
        lastActiveAt: usersTable.lastActiveAt,
      })
      .from(usersTable)
      .where(and(eq(usersTable.isActive, true), sql`${usersTable.role} != 'admin'`))
      .orderBy(desc(usersTable.points))
      .limit(limit);

    res.json(
      users.map((u, i) => {
        const penalty = calcPenalty(u.lastActiveAt, penaltyPoints, penaltyHours);
        return {
          rank: i + 1,
          userId: u.id,
          user: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, bio: u.bio },
          points: Math.max(0, u.points - penalty),
          penaltyPoints: penalty,
          level: getLevel(u.points),
        };
      })
    );
    return;
  }

  const now = new Date();
  let since: Date;
  if (period === "daily") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    since = new Date(now.getFullYear(), now.getMonth(), diff);
  }

  const periodPoints = await db
    .select({
      userId: pointsLogTable.userId,
      total: sql<number>`sum(${pointsLogTable.amount})::int`,
    })
    .from(pointsLogTable)
    .where(gte(pointsLogTable.createdAt, since))
    .groupBy(pointsLogTable.userId)
    .orderBy(sql`sum(${pointsLogTable.amount}) desc`)
    .limit(limit);

  if (periodPoints.length === 0) {
    res.json([]);
    return;
  }

  const userIds = periodPoints.map((p) => p.userId);
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
      points: usersTable.points,
      lastActiveAt: usersTable.lastActiveAt,
    })
    .from(usersTable)
    .where(and(
      sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]::int[]`)})`,
      sql`${usersTable.role} != 'admin'`
    ));

  const userMap = new Map(users.map((u) => [u.id, u]));

  res.json(
    periodPoints
      .filter((p) => userMap.has(p.userId))
      .map((p, i) => {
        const u = userMap.get(p.userId)!;
        const penalty = calcPenalty(u.lastActiveAt, penaltyPoints, penaltyHours);
        const gross = p.total ?? 0;
        return {
          rank: i + 1,
          userId: u.id,
          user: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, bio: u.bio },
          points: Math.max(0, gross - penalty),
          penaltyPoints: penalty,
          level: getLevel(u.points),
        };
      })
  );
});

export default router;
