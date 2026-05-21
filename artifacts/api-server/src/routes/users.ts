import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, usersTable, followsTable, reelsTable, postsTable, pointsLogTable } from "@workspace/db";
import { GetUserParams, UpdateUserParams, UpdateUserBody, DeleteUserParams, FollowUserParams, UnfollowUserParams, GetUserFollowersParams, GetUserFollowingParams, GetUserReelsParams, GetUserPostsParams } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/users/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [followers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followingId, id));

  const [following] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(followsTable)
    .where(eq(followsTable.followerId, id));

  const [reelsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reelsTable)
    .where(and(eq(reelsTable.userId, id), eq(reelsTable.isActive, true)));

  const [postsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(and(eq(postsTable.userId, id), eq(postsTable.isActive, true)));

  let isFollowing = false;
  if (req.userId && req.userId !== id) {
    const [follow] = await db
      .select({ id: followsTable.id })
      .from(followsTable)
      .where(and(eq(followsTable.followerId, req.userId), eq(followsTable.followingId, id)))
      .limit(1);
    isFollowing = !!follow;
  }

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    website: user.website,
    followersCount: followers.count,
    followingCount: following.count,
    reelsCount: reelsCount.count,
    postsCount: postsCount.count,
    isFollowing,
  });
});

router.patch("/users/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  if (req.userId !== id && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = UpdateUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (body.data.displayName !== undefined) updates.displayName = body.data.displayName;
  if (body.data.bio !== undefined) updates.bio = body.data.bio;
  if (body.data.website !== undefined) updates.website = body.data.website;
  if (body.data.avatarUrl !== undefined) updates.avatarUrl = body.data.avatarUrl;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: updated.id,
    username: updated.username,
    displayName: updated.displayName,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
    bio: updated.bio,
    website: updated.website,
    role: updated.role,
    isActive: updated.isActive,
    isSuspended: updated.isSuspended,
    points: updated.points,
    createdAt: updated.createdAt,
  });
});

router.delete("/users/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  if (req.userId !== id && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.sendStatus(204);
});

router.post("/users/:id/follow", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = FollowUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  if (req.userId === id) {
    res.status(400).json({ error: "Cannot follow yourself" });
    return;
  }

  await db
    .insert(followsTable)
    .values({ followerId: req.userId!, followingId: id })
    .onConflictDoNothing();

  res.sendStatus(204);
});

router.delete("/users/:id/follow", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = UnfollowUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  await db
    .delete(followsTable)
    .where(and(eq(followsTable.followerId, req.userId!), eq(followsTable.followingId, id)));

  res.sendStatus(204);
});

router.get("/users/:id/followers", async (req: Request, res: Response): Promise<void> => {
  const params = GetUserFollowersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const followers = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followerId, usersTable.id))
    .where(eq(followsTable.followingId, id));

  res.json(followers);
});

router.get("/users/:id/following", async (req: Request, res: Response): Promise<void> => {
  const params = GetUserFollowingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const following = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.followingId, usersTable.id))
    .where(eq(followsTable.followerId, id));

  res.json(following);
});

router.get("/users/:id/reels", async (req: Request, res: Response): Promise<void> => {
  const params = GetUserReelsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

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
    })
    .from(reelsTable)
    .where(and(eq(reelsTable.userId, id), eq(reelsTable.isActive, true)))
    .orderBy(sql`${reelsTable.createdAt} desc`);

  res.json(
    reels.map((r) => ({
      ...r,
      user: null,
      likesCount: 0,
      likedByMe: false,
    }))
  );
});

router.get("/users/:id/posts", async (req: Request, res: Response): Promise<void> => {
  const params = GetUserPostsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const { id } = params.data;

  const posts = await db
    .select({
      id: postsTable.id,
      userId: postsTable.userId,
      content: postsTable.content,
      mediaUrl: postsTable.mediaUrl,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .where(and(eq(postsTable.userId, id), eq(postsTable.isActive, true)))
    .orderBy(sql`${postsTable.createdAt} desc`);

  res.json(
    posts.map((p) => ({
      ...p,
      user: null,
      reactions: [],
      myReaction: null,
    }))
  );
});

router.get("/me/points-breakdown", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      reason: pointsLogTable.reason,
      total: sql<number>`sum(${pointsLogTable.amount})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(pointsLogTable)
    .where(eq(pointsLogTable.userId, req.userId!))
    .groupBy(pointsLogTable.reason)
    .orderBy(sql`sum(${pointsLogTable.amount}) desc`);

  res.json(rows);
});

export default router;
