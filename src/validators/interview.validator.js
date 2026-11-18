import { z } from "zod";

export const scheduleInterviewSchema = z.object({
  scheduledAt: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid interview date/time"),
  mode: z
    .string()
    .trim()
    .transform((val) => val.toUpperCase())
    .pipe(z.enum(["ONLINE", "OFFLINE"])),
  panelistName: z
    .string()
    .trim()
    .min(2, "Interviewer / Panelist name is required")
    .max(100, "Interviewer name is too long"),
  meetLinkOrVenue: z
    .string()
    .trim()
    .max(500, "Meeting link or venue is too long")
    .optional()
    .default(""),
  instructions: z
    .string()
    .trim()
    .max(1000, "Instructions cannot exceed 1000 characters")
    .optional()
    .default(""),
});

export const updateInterviewWorkflowSchema = z.object({
  notificationsSent: z.boolean().optional(),
  participantsJoined: z.boolean().optional(),
  interviewConducted: z.boolean().optional(),
  interviewNotes: z
    .string()
    .trim()
    .max(3000, "Interview notes cannot exceed 3000 characters")
    .optional(),
});

export const evaluateCandidateSchema = z.object({
  scores: z.object({
    communication: z.number().min(0).max(10),
    technical: z.number().min(0).max(10),
    confidence: z.number().min(0).max(10),
    problemSolving: z.number().min(0).max(10),
  }),
  feedback: z
    .string()
    .trim()
    .max(2000, "Feedback cannot exceed 2000 characters")
    .optional()
    .default(""),
  interviewNotes: z
    .string()
    .trim()
    .max(3000, "Interview notes cannot exceed 3000 characters")
    .optional(),
  decision: z
    .string()
    .trim()
    .transform((val) => {
      const normalized = val.toUpperCase().replace(/\s+/g, "_");
      if (normalized === "SHORTLIST") return "SHORTLISTED";
      if (normalized === "HOLD") return "ON_HOLD";
      if (normalized === "REJECT") return "REJECTED";
      if (normalized === "FURTHER_EVALUATION_REQUIRED") return "FURTHER_EVALUATION";
      return normalized;
    })
    .pipe(
      z.enum(["SHORTLISTED", "REJECTED", "ON_HOLD", "FURTHER_EVALUATION"])
    ),
});