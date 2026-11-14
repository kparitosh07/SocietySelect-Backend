import { Router } from "express";
import { getOverview } from "../controllers/studentOverview.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(verifyToken, requireRole("STUDENT"));
router.get("/overview", getOverview);

export default router;