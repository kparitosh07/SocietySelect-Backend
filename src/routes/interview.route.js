import { Router } from "express";
import {
  getCandidates,
  scheduleInterview,
  updateWorkflow,
  evaluateCandidate,
  publishResult,
} from "../controllers/interview.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  scheduleInterviewSchema,
  updateInterviewWorkflowSchema,
  evaluateCandidateSchema,
} from "../validators/interview.validator.js";

const router = Router();

router.use(verifyToken, requireRole("MENTOR"));

// List candidates & interview stats
router.get("/", getCandidates);

// Schedule an interview (accepts Application _id or Student User _id)
router.patch(
  "/:applicationId/schedule",
  validate(scheduleInterviewSchema),
  scheduleInterview
);

// Update workflow flags (notificationsSent, participantsJoined, interviewConducted, interviewNotes)
router.patch(
  "/:applicationId/workflow",
  validate(updateInterviewWorkflowSchema),
  updateWorkflow
);

// Save 4-criteria evaluation scores & decision
router.patch(
  "/:applicationId/evaluate",
  validate(evaluateCandidateSchema),
  evaluateCandidate
);

// Publish result & update student probationStatus / application stage
router.patch("/:applicationId/publish", publishResult);

export default router;