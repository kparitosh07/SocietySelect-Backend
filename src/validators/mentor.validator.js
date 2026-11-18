import { z } from "zod";

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Task title must be at least 3 characters")
    .max(150, "Task title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Task description must be at least 10 characters")
    .max(2000, "Task description cannot exceed 2000 characters"),
  domain: z
    .string()
    .trim()
    .min(2, "Domain is required")
    .optional(), 
  deadline: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid deadline date"),
  maxMarks: z
    .number()
    .int()
    .min(1, "Max marks must be at least 1")
    .max(1000, "Max marks cannot exceed 1000")
    .optional()
    .default(100),
});

export const gradeSubmissionSchema = z.object({
  status: z.enum(["GRADED", "REVISION_REQUESTED"]),
  marksObtained: z
    .number()
    .min(0, "Marks cannot be negative")
    .nullable()
    .optional(),
  mentorFeedback: z
    .string()
    .trim()
    .max(1000, "Feedback cannot exceed 1000 characters")
    .optional()
    .default(""),
});

export const updateStudentStatusSchema = z.object({
  probationStatus: z.enum([
    "APPLICANT",
    "ON_PROBATION",
    "SELECTED",
    "REJECTED",
  ]),
});