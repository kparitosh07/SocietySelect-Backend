import { Router } from "express";
import {
  listMyNotifications,
  markOneRead,
  markAllRead,
} from "../controllers/notification.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(verifyToken, requireRole("STUDENT"));

router.get("/", listMyNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:notificationId/read", markOneRead);

export default router;