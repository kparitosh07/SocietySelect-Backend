import { Router } from "express";
import {
  getMentorState,
  startSession,
  markAttendance,
  closeSession,
  getMyAttendance,
  getActiveAttendanceSession,
  markMyAttendance,
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
router.get("/active",requireRole("STUDENT"),getActiveAttendanceSession);
router.post("/sessions/:sessionId/mark-present",requireRole("STUDENT"),markMyAttendance);
router.get("/me", requireRole("STUDENT"), getMyAttendance);

export default router;