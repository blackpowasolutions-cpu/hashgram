import { Router, type IRouter, type Request, type Response } from "express";
import { eq, or, and, desc, sql, lt } from "drizzle-orm";
import { db, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import { GetConversationMessagesParams, SendMessageParams, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/messages/conversations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;

  const conversations = await db
    .select({
      id: conversationsTable.id,
      user1Id: conversationsTable.user1Id,
      user2Id: conversationsTable.user2Id,
      createdAt: conversationsTable.createdAt,
    })
    .from(conversationsTable)
    .where(or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId)))
    .orderBy(desc(conversationsTable.createdAt));

  const result = await Promise.all(
    conversations.map(async (conv) => {
      const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;

      const [otherUser] = await db
        .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio })
        .from(usersTable)
        .where(eq(usersTable.id, otherUserId))
        .limit(1);

      const [lastMsg] = await db
        .select({ content: messagesTable.content, createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const [unreadRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conv.id),
            sql`${messagesTable.senderId} != ${userId}`,
            sql`${messagesTable.readAt} IS NULL`
          )
        );

      return {
        id: conv.id,
        otherUser: otherUser ?? null,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: lastMsg?.createdAt?.toISOString() ?? null,
        unreadCount: unreadRow.count,
        createdAt: conv.createdAt,
      };
    })
  );

  res.json(result);
});

router.get("/messages/conversations/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }
  const { id } = params.data;
  const userId = req.userId!;

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, id),
        or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId))
      )
    )
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const before = req.query.before ? parseInt(req.query.before as string, 10) : undefined;

  const msgs = await db
    .select({
      id: messagesTable.id,
      conversationId: messagesTable.conversationId,
      senderId: messagesTable.senderId,
      content: messagesTable.content,
      createdAt: messagesTable.createdAt,
      readAt: messagesTable.readAt,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
    })
    .from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(
      before
        ? and(eq(messagesTable.conversationId, id), lt(messagesTable.id, before))
        : eq(messagesTable.conversationId, id)
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  await db
    .update(messagesTable)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messagesTable.conversationId, id),
        sql`${messagesTable.senderId} != ${userId}`,
        sql`${messagesTable.readAt} IS NULL`
      )
    );

  res.json(
    msgs.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      sender: { id: m.senderId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, bio: m.bio },
      content: m.content,
      createdAt: m.createdAt,
      readAt: m.readAt,
    }))
  );
});

router.post("/messages/conversations/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }
  const { id } = params.data;
  const userId = req.userId!;

  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.id, id),
        or(eq(conversationsTable.user1Id, userId), eq(conversationsTable.user2Id, userId))
      )
    )
    .limit(1);

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({ conversationId: id, senderId: userId, content: body.data.content })
    .returning();

  const [sender] = await db
    .select({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl, bio: usersTable.bio })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    sender: sender ?? null,
    content: msg.content,
    createdAt: msg.createdAt,
    readAt: msg.readAt,
  });
});

export default router;
