import { Router } from "express";
import { authenticate, requireMentorPrivilege } from "../middlewares/auth.middleware.js";
import { uploadResultFile } from "../middleware/upload.middleware.js";
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

router.use(authenticate);

// Student endpoints (mounted at /api/student/exams)
export const studentExamRouter = Router();
studentExamRouter.use(authenticate);
studentExamRouter.get("/", getStudentExams);
studentExamRouter.get("/:id", getStudentExamById);
studentExamRouter.get("/:id/result", getStudentExamResult);

// Mentor endpoints (mounted at /api/exams)
router.post("/", requireMentorPrivilege, createExam);
router.get("/", requireMentorPrivilege, getExams);
router.get("/:id", requireMentorPrivilege, getExamById);
router.put("/:id", requireMentorPrivilege, updateExam);
router.delete("/:id", requireMentorPrivilege, deleteExam);
router.post("/:id/assign", requireMentorPrivilege, assignStudentsToExam);
router.get("/:id/students", requireMentorPrivilege, getExamStudents);
router.post("/:id/results/import", requireMentorPrivilege, uploadResultFile, importExamResults);
router.get("/:id/results", requireMentorPrivilege, getExamResults);
router.get("/:id/summary", requireMentorPrivilege, getExamSummary);

export default router;