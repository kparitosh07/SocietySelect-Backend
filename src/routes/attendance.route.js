import { Router } from "express";
import {
  getMentorState,
  startSession,
  markAttendance,
  closeSession,
  getMyAttendance,
} from "../controllers/attendance.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(verifyToken);

router.get("/mentor", requireRole("MENTOR"), getMentorState);
router.post("/sessions/start", requireRole("MENTOR"), startSession);
router.patch(
  "/sessions/:sessionId/students/:studentId",
  requireRole("MENTOR"),
  markAttendance
);
router.post(
  "/sessions/:sessionId/close",
  requireRole("MENTOR"),
  closeSession
);

router.get("/me", requireRole("STUDENT"), getMyAttendance);

export default router;