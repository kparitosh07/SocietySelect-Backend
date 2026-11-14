import { Router } from "express";
import {
  submitApplication,
  getTrackingStatus,
  getInterviewSlot,
} from "../controllers/application.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { submitApplicationSchema } from "../validators/application.validator.js";

const router = Router();

router.use(verifyToken, requireRole("STUDENT"));

router.post("/", validate(submitApplicationSchema), submitApplication);
router.get("/my-status", getTrackingStatus);
router.get("/interview", getInterviewSlot);

export default router;