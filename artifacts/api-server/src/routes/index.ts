import { Router, type IRouter } from "express";
import healthRouter from "./health";
import keysRouter from "./keys";
import lookupRouter from "./lookup";
import authRouter from "./auth";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// lookup is protected by API key auth (not session)
router.use(lookupRouter);

// key management routes require admin session
router.use(requireAuth, keysRouter);

export default router;
