import { z } from "zod";

export const submitTaskSchema = z.object({
    repoUrl: z.string().trim().url("Please enter a valid GitHub repository URL"),
    liveUrl: z
        .string()
        .trim()
        .url("Please enter a valid live deployment URL")
        .or(z.literal(""))
        .optional(),
    notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional(),
});