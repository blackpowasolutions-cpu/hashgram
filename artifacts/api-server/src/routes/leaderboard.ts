import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, gte, sql } from "drizzle-orm";
import { db, usersTable, pointsLogTable } from "@workspace/db";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";
import { getLevel } from "../lib/jwt";

const router: IRouter = Router();

router.get("/leaderboard", async (req: Request, res: Response): Promise<void> => {
  const query = GetLeaderboardQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const period = query.data.period ?? "alltime";
  const limit = Math.min(query.data.limit ?? 10, 50);

  if (period === "alltime") {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        bio: usersTable.bio,
        points: usersTable.points,
      })
      .from(usersTable)
      .where(eq(usersTable.isActive, true))
      .orderBy(desc(usersTable.points))
      .limit(limit);

    res.json(
      users.map((u, i) => ({
        rank: i + 1,
        userId: u.id,
        user: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, bio: u.bio },
        points: u.points,
        level: getLevel(u.points),
      }))
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
    })
    .from(usersTable)
    .where(sql`${usersTable.id} = ANY(${sql.raw(`ARRAY[${userIds.join(",")}]::int[]`)})`);

  const userMap = new Map(users.map((u) => [u.id, u]));

  res.json(
    periodPoints
      .filter((p) => userMap.has(p.userId))
      .map((p, i) => {
        const u = userMap.get(p.userId)!;
        return {
          rank: i + 1,
          userId: u.id,
          user: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, bio: u.bio },
          points: p.total ?? 0,
          level: getLevel(u.points),
        };
      })
  );
});

export default router;
