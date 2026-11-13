
import { z } from "zod";

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100, "Name is too long"),

  studentNumber: z
    .string()
    .trim()
    .min(3, "Student number must contain at least 3 digits")
    .max(20, "Student number is too long")
    .regex(
      /^[0-9]+$/,
      "Student number must contain numbers only"
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .refine(
      (email) => email.endsWith("@akgec.ac.in"),
      "Only official AKGEC email addresses are allowed"
    ),

  domain: z
    .string()
    .trim()
    .min(2, "Please select your domain")
    .max(50, "Domain is too long"),

  emailVerificationToken: z
    .string()
    .min(1, "Please verify your email first"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters"),

  confirmPassword: z.string(),

  role: z.enum(["STUDENT", "MENTOR"])
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  }
);

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .refine(
      (email) => email.endsWith("@akgec.ac.in"),
      "Use your official AKGEC email address"
    ),

  password: z
    .string()
    .min(1, "Password is required"),

  role: z.enum(["STUDENT", "MENTOR"])
});

export const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine(
      email => email.endsWith("@akgec.ac.in"),
      "Only official AKGEC email addresses are allowed"
    ),

  otp: z
    .string()
    .regex(/^[0-9]{6}$/, "OTP must contain exactly 6 digits")
});

export const resendOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine(
      email => email.endsWith("@akgec.ac.in"),
      "Only official AKGEC email addresses are allowed"
    )
});

export const googleAuthSchema = z.object({
  idToken: z
    .string()
    .min(1, "Google ID token is required"),

  role: z.enum(["STUDENT", "MENTOR"]),

  studentNumber: z
    .string()
    .trim()
    .regex(
      /^[0-9]{3,20}$/,
      "Student number must contain 3 to 20 digits only"
    )
    .optional(),
  domain: z
    .string()
    .trim()
    .min(2, "Please enter your domain")
    .max(50, "Domain is too long")
    .optional()
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .refine(
      (email) => email.endsWith("@akgec.ac.in"),
      "Use your official AKGEC email address"
    ),
  role: z.enum(["STUDENT", "MENTOR"]),
});

export const verifyResetOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .refine(
      (email) => email.endsWith("@akgec.ac.in"),
      "Only official AKGEC email addresses are allowed"
    ),
  otp: z.string().regex(/^[0-9]{6}$/, "OTP must contain exactly 6 digits"),
});

export const resetPasswordSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .refine(
        (email) => email.endsWith("@akgec.ac.in"),
        "Only official AKGEC email addresses are allowed"
      ),
    role: z.enum(["STUDENT", "MENTOR"]),
    resetToken: z.string().min(1, "Reset verification token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must not exceed 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });