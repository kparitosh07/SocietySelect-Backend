import { Router } from "express";
import { uploadResultFile } from "../middleware/upload.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
  assignStudentsToExam,
  getExamStudents,
  importExamResults,
  getExamResults,
  getExamSummary,
  getStudentExams,
  getStudentExamById,
  getStudentExamResult,
} from "../controllers/exam.controller.js";

const router = Router();

router.use(verifyToken, requireRole("MENTOR"));

// Student endpoints (mounted at /api/student/exams)
export const studentExamRouter = Router();
studentExamRouter.use(verifyToken, requireRole("STUDENT"));
studentExamRouter.get("/", getStudentExams);
studentExamRouter.get("/:id", getStudentExamById);
studentExamRouter.get("/:id/result", getStudentExamResult);

// Mentor endpoints (mounted at /api/exams)
router.post("/", createExam);
router.get("/", getExams);
router.get("/:id", getExamById);
router.put("/:id", updateExam);
router.delete("/:id", deleteExam);
router.post("/:id/assign", assignStudentsToExam);
router.get("/:id/students", getExamStudents);
router.post("/:id/results/import", uploadResultFile, importExamResults);
router.get("/:id/results", getExamResults);
router.get("/:id/summary", getExamSummary);

export default router;