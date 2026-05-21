import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, or, and, gte, sql } from "drizzle-orm";
import { db, usersTable, pointsLogTable } from "@workspace/db";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { signToken, getLevel } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { username, displayName, email, password } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.email, email), eq(usersTable.username, username)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Username or email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ username, displayName, email, passwordHash, role: "user" })
    .returning();

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      website: user.website,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      points: user.points,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ error: "Account is suspended" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });

  // Award 5 points for first login of the day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [loginToday] = await db
    .select({ id: pointsLogTable.id })
    .from(pointsLogTable)
    .where(
      and(
        eq(pointsLogTable.userId, user.id),
        eq(pointsLogTable.reason, "login"),
        gte(pointsLogTable.createdAt, todayStart)
      )
    )
    .limit(1);

  if (!loginToday) {
    await Promise.all([
      db.insert(pointsLogTable).values({ userId: user.id, amount: 5, reason: "login" }),
      db.update(usersTable).set({ points: sql`${usersTable.points} + 5` }).where(eq(usersTable.id, user.id)),
    ]);
    user.points += 5;
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      website: user.website,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      points: user.points,
      createdAt: user.createdAt,
    },
  });
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!))
    .limit(1);

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
    bio: user.bio,
    website: user.website,
    role: user.role,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    points: user.points,
    createdAt: user.createdAt,
  });
});

export default router;
