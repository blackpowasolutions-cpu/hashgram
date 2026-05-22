import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import reelsRouter from "./reels";
import postsRouter from "./posts";
import storeRouter from "./store";
import leaderboardRouter from "./leaderboard";
import messagesRouter from "./messages";
import adminRouter from "./admin";
import storageRouter from "./storage";
import referralsRouter from "./referrals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(reelsRouter);
router.use(postsRouter);
router.use(storeRouter);
router.use(leaderboardRouter);
router.use(messagesRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(referralsRouter);

export default router;
