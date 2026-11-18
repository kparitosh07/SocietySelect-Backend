import { Router } from "express";
import {
  getDashboard,
  getStudents,
  getStudentById,
  updateStudentStatus,
  createTask,
  listDomainTasks,
  gradeSubmission,
} from "../controllers/mentor.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createTaskSchema,
  gradeSubmissionSchema,
  updateStudentStatusSchema,
} from "../validators/mentor.validator.js";

const router = Router();

router.use(verifyToken, requireRole("MENTOR"));

// Dashboard overview & stats
router.get("/dashboard", getDashboard);

// Assigned students management
router.get("/students", getStudents);
router.get("/students/:studentId", getStudentById);
router.patch(
  "/students/:studentId/status",
  validate(updateStudentStatusSchema),
  updateStudentStatus
);

// Domain tasks & submission reviews
router.get("/tasks", listDomainTasks);
router.post("/tasks", validate(createTaskSchema), createTask);
router.patch(
  "/tasks/:taskId/submissions/:studentId",
  validate(gradeSubmissionSchema),
  gradeSubmission
);

export default router;