import { Router, type IRouter, type Request, type Response } from "express";
import { eq, ilike, and, desc, sql, gte } from "drizzle-orm";
import { db, usersTable, reelsTable, postsTable, giftPurchasesTable, pointsLogTable, followsTable } from "@workspace/db";
import {
  ListAdminUsersQueryParams,
  SuspendUserParams,
  SuspendUserBody,
  UpdateUserRoleParams,
  UpdateUserRoleBody,
  AdjustUserPointsParams,
  AdjustUserPointsBody,
  ListAdminReelsQueryParams,
  ListAdminPostsQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { getLevel } from "../lib/jwt";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res: Response): Promise<void> => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [totalReels] = await db.select({ count: sql<number>`count(*)::int` }).from(reelsTable).where(eq(reelsTable.isActive, true));
  const [totalPosts] = await db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.isActive, true));
  const [totalPurchases] = await db.select({ count: sql<number>`count(*)::int` }).from(giftPurchasesTable);

  const [totalPointsRow] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)::int` })
    .from(pointsLogTable)
    .where(sql`${pointsLogTable.amount} > 0`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const [newToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(gte(usersTable.createdAt, today));

  const [newThisWeek] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(gte(usersTable.createdAt, weekStart));

  const topUsers = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
      points: usersTable.points,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.points))
    .limit(5);

  res.json({
    totalUsers: totalUsers.count,
    totalReels: totalReels.count,
    totalPosts: totalPosts.count,
    totalGiftPurchases: totalPurchases.count,
    totalPointsDistributed: totalPointsRow.total,
    newUsersToday: newToday.count,
    newUsersThisWeek: newThisWeek.count,
    topUsers: topUsers.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      user: { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, bio: u.bio },
      points: u.points,
      level: getLevel(u.points),
    })),
  });
});

router.get("/admin/users", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const query = ListAdminUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 20;
  const search = query.data.search ?? null;
  const suspended = query.data.suspended ?? null;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    conditions.push(
      sql`(${usersTable.username} ILIKE ${"%" + search + "%"} OR ${usersTable.displayName} ILIKE ${"%" + search + "%"} OR ${usersTable.email} ILIKE ${"%" + search + "%"})`
    );
  }
  if (suspended !== null && suspended !== undefined) {
    conditions.push(eq(usersTable.isSuspended, suspended));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(whereClause);

  const users = await db
    .select()
    .from(usersTable)
    .where(whereClause)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = users.map((u) => u.id);
  const reelsCounts: Record<number, number> = {};
  const postsCounts: Record<number, number> = {};
  const followersCounts: Record<number, number> = {};

  if (userIds.length > 0) {
    const arr = `ARRAY[${userIds.join(",")}]::int[]`;

    const rCounts = await db
      .select({ userId: reelsTable.userId, count: sql<number>`count(*)::int` })
      .from(reelsTable)
      .where(and(sql`${reelsTable.userId} = ANY(${sql.raw(arr)})`, eq(reelsTable.isActive, true)))
      .groupBy(reelsTable.userId);
    rCounts.forEach((r) => { reelsCounts[r.userId] = r.count; });

    const pCounts = await db
      .select({ userId: postsTable.userId, count: sql<number>`count(*)::int` })
      .from(postsTable)
      .where(and(sql`${postsTable.userId} = ANY(${sql.raw(arr)})`, eq(postsTable.isActive, true)))
      .groupBy(postsTable.userId);
    pCounts.forEach((p) => { postsCounts[p.userId] = p.count; });

    const fCounts = await db
      .select({ followingId: followsTable.followingId, count: sql<number>`count(*)::int` })
      .from(followsTable)
      .where(sql`${followsTable.followingId} = ANY(${sql.raw(arr)})`)
      .groupBy(followsTable.followingId);
    fCounts.forEach((f) => { followersCounts[f.followingId] = f.count; });
  }

  res.json({
    items: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isActive: u.isActive,
      isSuspended: u.isSuspended,
      points: u.points,
      reelsCount: reelsCounts[u.id] ?? 0,
      postsCount: postsCounts[u.id] ?? 0,
      followersCount: followersCounts[u.id] ?? 0,
      createdAt: u.createdAt,
    })),
    total: totalRow.count,
    page,
    limit,
  });
});

router.patch("/admin/users/:id/suspend", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = SuspendUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const body = SuspendUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ isSuspended: body.data.suspended })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    points: user.points,
    createdAt: user.createdAt,
  });
});

router.patch("/admin/users/:id/role", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateUserRoleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const body = UpdateUserRoleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ role: body.data.role })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    points: user.points,
    createdAt: user.createdAt,
  });
});

router.patch("/admin/users/:id/points", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const params = AdjustUserPointsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const body = AdjustUserPointsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ points: sql`${usersTable.points} + ${body.data.amount}` })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, points: usersTable.points });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await db.insert(pointsLogTable).values({ userId: id, amount: body.data.amount, reason: body.data.reason });

  res.json({ userId: user.id, balance: user.points, level: getLevel(user.points) });
});

router.get("/admin/reels", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const query = ListAdminReelsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 20;
  const offset = (page - 1) * limit;

  const [totalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(reelsTable).where(eq(reelsTable.isActive, true));

  const reels = await db
    .select({
      id: reelsTable.id,
      userId: reelsTable.userId,
      description: reelsTable.description,
      mediaUrl: reelsTable.mediaUrl,
      thumbnailUrl: reelsTable.thumbnailUrl,
      views: reelsTable.views,
      music: reelsTable.music,
      createdAt: reelsTable.createdAt,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(reelsTable)
    .innerJoin(usersTable, eq(reelsTable.userId, usersTable.id))
    .where(eq(reelsTable.isActive, true))
    .orderBy(desc(reelsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    items: reels.map((r) => ({
      id: r.id,
      userId: r.userId,
      user: { id: r.userId, username: r.username, displayName: r.displayName, avatarUrl: r.avatarUrl, bio: r.bio },
      description: r.description,
      mediaUrl: r.mediaUrl,
      thumbnailUrl: r.thumbnailUrl,
      views: r.views,
      music: r.music,
      createdAt: r.createdAt,
      likesCount: 0,
      likedByMe: false,
    })),
    total: totalRow.count,
    page,
    limit,
  });
});

router.get("/admin/posts", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const query = ListAdminPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 20;
  const offset = (page - 1) * limit;

  const [totalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(eq(postsTable.isActive, true));

  const posts = await db
    .select({
      id: postsTable.id,
      userId: postsTable.userId,
      content: postsTable.content,
      mediaUrl: postsTable.mediaUrl,
      createdAt: postsTable.createdAt,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
    .where(eq(postsTable.isActive, true))
    .orderBy(desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    items: posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      user: { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, bio: p.bio },
      content: p.content,
      mediaUrl: p.mediaUrl,
      createdAt: p.createdAt,
      reactions: [],
      myReaction: null,
    })),
    total: totalRow.count,
    page,
    limit,
  });
});

export default router;
