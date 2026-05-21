import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, and, desc } from "drizzle-orm";
import { db, usersTable, reelsTable, reelLikesTable, reelCommentsTable, pointsLogTable } from "@workspace/db";
import { ListReelsQueryParams, CreateReelBody, GetReelParams, DeleteReelParams, LikeReelParams, UnlikeReelParams, ViewReelParams, ListReelCommentsParams, ListReelCommentsQueryParams, CreateReelCommentParams, CreateReelCommentBody } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reels", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const query = ListReelsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 20;
  const userId = query.data.userId ?? null;
  const offset = (page - 1) * limit;

  const whereClause = and(
    eq(reelsTable.isActive, true),
    userId != null ? eq(reelsTable.userId, userId) : undefined
  );

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reelsTable)
    .where(whereClause);

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
    .where(whereClause)
    .orderBy(desc(reelsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const reelIds = reels.map((r) => r.id);

  const likesCounts: Record<number, number> = {};
  const commentsCounts: Record<number, number> = {};

  if (reelIds.length > 0) {
    const [likesResult, commentsResult] = await Promise.all([
      db
        .select({
          reelId: reelLikesTable.reelId,
          count: sql<number>`count(*)::int`,
        })
        .from(reelLikesTable)
        .where(sql`${reelLikesTable.reelId} = ANY(${sql.raw(`ARRAY[${reelIds.join(",")}]::int[]`)})`)
        .groupBy(reelLikesTable.reelId),
      db
        .select({
          reelId: reelCommentsTable.reelId,
          count: sql<number>`count(*)::int`,
        })
        .from(reelCommentsTable)
        .where(sql`${reelCommentsTable.reelId} = ANY(${sql.raw(`ARRAY[${reelIds.join(",")}]::int[]`)})`)
        .groupBy(reelCommentsTable.reelId),
    ]);

    likesResult.forEach((c) => { likesCounts[c.reelId] = c.count; });
    commentsResult.forEach((c) => { commentsCounts[c.reelId] = c.count; });
  }

  const likedByMe: Set<number> = new Set();
  if (req.userId && reelIds.length > 0) {
    const liked = await db
      .select({ reelId: reelLikesTable.reelId })
      .from(reelLikesTable)
      .where(
        and(
          eq(reelLikesTable.userId, req.userId),
          sql`${reelLikesTable.reelId} = ANY(${sql.raw(`ARRAY[${reelIds.join(",")}]::int[]`)})`
        )
      );
    liked.forEach((l) => likedByMe.add(l.reelId));
  }

  res.json({
    items: reels.map((r) => ({
      id: r.id,
      userId: r.userId,
      user: {
        id: r.userId,
        username: r.username,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        bio: r.bio,
      },
      description: r.description,
      mediaUrl: r.mediaUrl,
      thumbnailUrl: r.thumbnailUrl,
      views: r.views,
      music: r.music,
      createdAt: r.createdAt,
      likesCount: likesCounts[r.id] ?? 0,
      commentsCount: commentsCounts[r.id] ?? 0,
      likedByMe: likedByMe.has(r.id),
    })),
    total: totalRow.count,
    page,
    limit,
  });
});

router.post("/reels", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const body = CreateReelBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [reel] = await db
    .insert(reelsTable)
    .values({
      userId: req.userId!,
      description: body.data.description ?? null,
      mediaUrl: body.data.mediaUrl ?? null,
      thumbnailUrl: body.data.thumbnailUrl ?? null,
      music: body.data.music ?? null,
    })
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, reel.userId)).limit(1);

  res.status(201).json({
    id: reel.id,
    userId: reel.userId,
    user: user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio } : null,
    description: reel.description,
    mediaUrl: reel.mediaUrl,
    thumbnailUrl: reel.thumbnailUrl,
    views: reel.views,
    music: reel.music,
    createdAt: reel.createdAt,
    likesCount: 0,
    commentsCount: 0,
    likedByMe: false,
  });
});

router.get("/reels/:id", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const { id } = params.data;

  const [reel] = await db
    .select({
      id: reelsTable.id,
      userId: reelsTable.userId,
      description: reelsTable.description,
      mediaUrl: reelsTable.mediaUrl,
      thumbnailUrl: reelsTable.thumbnailUrl,
      views: reelsTable.views,
      music: reelsTable.music,
      isActive: reelsTable.isActive,
      createdAt: reelsTable.createdAt,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(reelsTable)
    .innerJoin(usersTable, eq(reelsTable.userId, usersTable.id))
    .where(eq(reelsTable.id, id))
    .limit(1);

  if (!reel || !reel.isActive) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  const [[likesRow], [commentsRow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reelLikesTable)
      .where(eq(reelLikesTable.reelId, id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reelCommentsTable)
      .where(eq(reelCommentsTable.reelId, id)),
  ]);

  let likedByMe = false;
  if (req.userId) {
    const [like] = await db
      .select({ id: reelLikesTable.id })
      .from(reelLikesTable)
      .where(and(eq(reelLikesTable.reelId, id), eq(reelLikesTable.userId, req.userId)))
      .limit(1);
    likedByMe = !!like;
  }

  res.json({
    id: reel.id,
    userId: reel.userId,
    user: { id: reel.userId, username: reel.username, displayName: reel.displayName, avatarUrl: reel.avatarUrl, bio: reel.bio },
    description: reel.description,
    mediaUrl: reel.mediaUrl,
    thumbnailUrl: reel.thumbnailUrl,
    views: reel.views,
    music: reel.music,
    createdAt: reel.createdAt,
    likesCount: likesRow?.count ?? 0,
    commentsCount: commentsRow?.count ?? 0,
    likedByMe,
  });
});

router.delete("/reels/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = DeleteReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const { id } = params.data;

  const [reel] = await db.select().from(reelsTable).where(eq(reelsTable.id, id)).limit(1);
  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  if (reel.userId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.update(reelsTable).set({ isActive: false }).where(eq(reelsTable.id, id));
  res.sendStatus(204);
});

router.post("/reels/:id/like", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = LikeReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const { id } = params.data;

  const [existingLike] = await db
    .select({ id: reelLikesTable.id })
    .from(reelLikesTable)
    .where(and(eq(reelLikesTable.reelId, id), eq(reelLikesTable.userId, req.userId!)))
    .limit(1);

  await db
    .insert(reelLikesTable)
    .values({ reelId: id, userId: req.userId! })
    .onConflictDoNothing();

  if (!existingLike) {
    const [reel] = await db
      .select({ userId: reelsTable.userId })
      .from(reelsTable)
      .where(eq(reelsTable.id, id))
      .limit(1);
    if (reel && reel.userId !== req.userId) {
      await Promise.all([
        db.insert(pointsLogTable).values({ userId: reel.userId, amount: 1, reason: "reel_like" }),
        db.update(usersTable).set({ points: sql`${usersTable.points} + 1` }).where(eq(usersTable.id, reel.userId)),
      ]);
    }
  }

  res.sendStatus(204);
});

router.delete("/reels/:id/like", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = UnlikeReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const { id } = params.data;

  await db
    .delete(reelLikesTable)
    .where(and(eq(reelLikesTable.reelId, id), eq(reelLikesTable.userId, req.userId!)));

  res.sendStatus(204);
});

router.post("/reels/:id/view", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const params = ViewReelParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const { id } = params.data;

  const [reel] = await db
    .select({ userId: reelsTable.userId })
    .from(reelsTable)
    .where(eq(reelsTable.id, id))
    .limit(1);

  if (!reel) {
    res.sendStatus(204);
    return;
  }

  const ops: Promise<unknown>[] = [
    db.update(reelsTable).set({ views: sql`${reelsTable.views} + 1` }).where(eq(reelsTable.id, id)),
  ];

  if (req.userId) {
    ops.push(
      db.insert(pointsLogTable).values({ userId: req.userId, amount: 1, reason: "reel_play" }),
      db.update(usersTable).set({ points: sql`${usersTable.points} + 1` }).where(eq(usersTable.id, req.userId))
    );
  }

  await Promise.all(ops);
  res.sendStatus(204);
});

router.get("/reels/:id/comments", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const params = ListReelCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const query = ListReelCommentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { id } = params.data;
  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 50;
  const offset = (page - 1) * limit;

  const [reel] = await db
    .select({ id: reelsTable.id })
    .from(reelsTable)
    .where(and(eq(reelsTable.id, id), eq(reelsTable.isActive, true)))
    .limit(1);

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  const [totalRow, comments] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reelCommentsTable)
      .where(eq(reelCommentsTable.reelId, id)),
    db
      .select({
        id: reelCommentsTable.id,
        reelId: reelCommentsTable.reelId,
        userId: reelCommentsTable.userId,
        body: reelCommentsTable.body,
        createdAt: reelCommentsTable.createdAt,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        bio: usersTable.bio,
      })
      .from(reelCommentsTable)
      .innerJoin(usersTable, eq(reelCommentsTable.userId, usersTable.id))
      .where(eq(reelCommentsTable.reelId, id))
      .orderBy(desc(reelCommentsTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  res.json({
    items: comments.map((c) => ({
      id: c.id,
      reelId: c.reelId,
      userId: c.userId,
      user: {
        id: c.userId,
        username: c.username,
        displayName: c.displayName,
        avatarUrl: c.avatarUrl,
        bio: c.bio,
      },
      body: c.body,
      createdAt: c.createdAt,
    })),
    total: totalRow[0]?.count ?? 0,
    page,
    limit,
  });
});

router.post("/reels/:id/comments", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = CreateReelCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid reel ID" });
    return;
  }
  const body = CreateReelCommentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { id } = params.data;

  const [reel] = await db
    .select({ id: reelsTable.id })
    .from(reelsTable)
    .where(and(eq(reelsTable.id, id), eq(reelsTable.isActive, true)))
    .limit(1);

  if (!reel) {
    res.status(404).json({ error: "Reel not found" });
    return;
  }

  const [comment] = await db
    .insert(reelCommentsTable)
    .values({ reelId: id, userId: req.userId!, body: body.data.body })
    .returning();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

  res.status(201).json({
    id: comment.id,
    reelId: comment.reelId,
    userId: comment.userId,
    user: user
      ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio }
      : null,
    body: comment.body,
    createdAt: comment.createdAt,
  });
});

export default router;
