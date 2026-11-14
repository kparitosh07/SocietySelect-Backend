import { Router } from "express";
import { listMyTasks, submitTask } from "../controllers/task.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { submitTaskSchema } from "../validators/task.validator.js";

const router = Router();

router.use(verifyToken, requireRole("STUDENT"));

router.get("/my-tasks", listMyTasks);
router.post("/:taskId/submit", validate(submitTaskSchema), submitTask);

export default router;