import { z } from "zod";

export const submitApplicationSchema = z.object({
  societyName: z.string().trim().min(2, "Society name is required").optional(),
  domain: z.string().trim().min(2, "Domain is required"),
  whyJoin: z
    .string()
    .trim()
    .min(20, "Please write at least 20 characters on why you want to join")
    .max(1000, "Response cannot exceed 1000 characters"),
  experience: z.string().trim().max(1000).optional(),
  githubUrl: z.string().trim().url("Invalid GitHub URL").or(z.literal("")).optional(),
  portfolioUrl: z.string().trim().url("Invalid Portfolio URL").or(z.literal("")).optional(),
  resumeUrl: z.string().trim().url("Invalid Resume URL").or(z.literal("")).optional(),
});