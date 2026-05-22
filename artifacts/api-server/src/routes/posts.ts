import { Router, type IRouter, type Request, type Response } from "express";
import { checkAndAwardReferralMilestones } from "./referrals";
import { eq, sql, and, desc } from "drizzle-orm";
import { db, usersTable, postsTable, postReactionsTable, pointsLogTable } from "@workspace/db";
import { ListPostsQueryParams, CreatePostBody, DeletePostParams, ReactToPostParams, ReactToPostBody, RemovePostReactionParams } from "@workspace/api-zod";
import { requireAuth, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/posts", optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const query = ListPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const page = query.data.page ?? 1;
  const limit = query.data.limit ?? 20;
  const offset = (page - 1) * limit;
  const filterUserId = req.query.userId ? parseInt(req.query.userId as string, 10) : null;

  const baseWhere = filterUserId
    ? and(eq(postsTable.isActive, true), eq(postsTable.userId, filterUserId))
    : eq(postsTable.isActive, true);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(baseWhere);

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
    .where(baseWhere)
    .orderBy(desc(postsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const postIds = posts.map((p) => p.id);

  const reactionsMap: Record<number, Array<{ emoji: string; count: number }>> = {};
  const myReactionsMap: Record<number, string> = {};

  if (postIds.length > 0) {
    const reactionCounts = await db
      .select({
        postId: postReactionsTable.postId,
        emoji: postReactionsTable.emoji,
        count: sql<number>`count(*)::int`,
      })
      .from(postReactionsTable)
      .where(sql`${postReactionsTable.postId} = ANY(${sql.raw(`ARRAY[${postIds.join(",")}]::int[]`)})`)
      .groupBy(postReactionsTable.postId, postReactionsTable.emoji);

    reactionCounts.forEach(({ postId, emoji, count }) => {
      if (!reactionsMap[postId]) reactionsMap[postId] = [];
      reactionsMap[postId].push({ emoji, count });
    });

    if (req.userId) {
      const myReactions = await db
        .select({ postId: postReactionsTable.postId, emoji: postReactionsTable.emoji })
        .from(postReactionsTable)
        .where(
          and(
            eq(postReactionsTable.userId, req.userId),
            sql`${postReactionsTable.postId} = ANY(${sql.raw(`ARRAY[${postIds.join(",")}]::int[]`)})`
          )
        );
      myReactions.forEach(({ postId, emoji }) => {
        myReactionsMap[postId] = emoji;
      });
    }
  }

  res.json({
    items: posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      user: { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, bio: p.bio },
      content: p.content,
      mediaUrl: p.mediaUrl,
      createdAt: p.createdAt,
      reactions: reactionsMap[p.id] ?? [],
      myReaction: myReactionsMap[p.id] ?? null,
    })),
    total: totalRow.count,
    page,
    limit,
  });
});

router.post("/posts", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const body = CreatePostBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [post] = await db
    .insert(postsTable)
    .values({
      userId: req.userId!,
      content: body.data.content,
      mediaUrl: body.data.mediaUrl ?? null,
    })
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, post.userId)).limit(1);

  res.status(201).json({
    id: post.id,
    userId: post.userId,
    user: user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio } : null,
    content: post.content,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    reactions: [],
    myReaction: null,
  });
});

router.delete("/posts/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = DeletePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }
  const { id } = params.data;

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  if (post.userId !== req.userId && req.userRole !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.update(postsTable).set({ isActive: false }).where(eq(postsTable.id, id));
  res.sendStatus(204);
});

router.post("/posts/:id/react", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = ReactToPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }
  const { id } = params.data;

  const body = ReactToPostBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  // Check if user already reacted (to award points only on first reaction)
  const [existingReaction] = await db
    .select({ id: postReactionsTable.id })
    .from(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, id), eq(postReactionsTable.userId, req.userId!)))
    .limit(1);

  await db
    .insert(postReactionsTable)
    .values({ postId: id, userId: req.userId!, emoji: body.data.emoji })
    .onConflictDoUpdate({
      target: [postReactionsTable.postId, postReactionsTable.userId],
      set: { emoji: body.data.emoji },
    });

  // Award +1 point to post author on a brand-new reaction (not reaction changes)
  if (!existingReaction) {
    const [post] = await db
      .select({ userId: postsTable.userId })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);
    if (post && post.userId !== req.userId) {
      await Promise.all([
        db.insert(pointsLogTable).values({ userId: post.userId, amount: 1, reason: "post_reaction" }),
        db.update(usersTable).set({ points: sql`${usersTable.points} + 1` }).where(eq(usersTable.id, post.userId)),
      ]);
      // Check if engagement milestones for the post author have unlocked
      checkAndAwardReferralMilestones(post.userId).catch(() => {});
    }
  }

  res.sendStatus(204);
});

router.delete("/posts/:id/react", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = RemovePostReactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }
  const { id } = params.data;

  await db
    .delete(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, id), eq(postReactionsTable.userId, req.userId!)));

  res.sendStatus(204);
});

export default router;
