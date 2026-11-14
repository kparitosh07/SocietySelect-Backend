import { z } from "zod";

export const updateProfileSchema = z.object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    domain: z.string().trim().min(2, "Domain is required").optional(),
    branch: z.string().trim().optional(),
    year: z.string().trim().optional(),
    phone: z
        .string()
        .trim()
        .regex(/^([0-9]{10})?$/, "Phone number must be 10 digits")
        .optional(),
    bio: z.string().trim().max(300, "Bio cannot exceed 300 characters").optional(),
    skills: z.array(z.string().trim()).optional(),
    githubUsername: z.string().trim().optional(),
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Confirm password is required"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "New passwords do not match",
        path: ["confirmPassword"],
    });