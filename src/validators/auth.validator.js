
import { z } from "zod";
// import { DOMAINS } from "../constants/domains.js";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

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
    .min(1, "Domain is required")
    .max(100, "Domain cannot exceed 100 characters"),
  // domain: z.enum(DOMAINS).optional(),
  // domains: z.array(z.enum(DOMAINS))
  //   .min(1, "Select at least one domain")
  //   .max(DOMAINS.length)
  //   .refine((values) => new Set(values).size === values.length, "Choose each domain only once")
  //   .optional(),

  emailVerificationToken: z
    .string()
    .min(1, "Please verify your email first"),

  password: passwordSchema,

  confirmPassword: z.string(),

  role: z.enum(["STUDENT", "MENTOR"])
})
  // .refine(
  //   (data) => data.role === "MENTOR" ? Array.isArray(data.domains) && data.domains.length > 0 && !data.domain : Boolean(data.domain) && !data.domains,
  //   { message: "Students must select one domain; mentors must select one or more domains", path: ["domain"] }
  // )
  .refine(
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
    .min(1, "Domain is required")
    .max(100, "Domain cannot exceed 100 characters")
    .optional(),
  // domain: z.enum(DOMAINS).optional(),
  // domains: z.array(z.enum(DOMAINS))
  //   .min(1)
  //   .max(DOMAINS.length)
  //   .refine((values) => new Set(values).size === values.length, "Choose each domain only once")
  //   .optional(),
})
// .refine(
//   (data) => {
//     if (!data.studentNumber && !data.domain && !data.domains) return true;
//     if (data.role === "STUDENT") return !data.domains && Boolean(data.domain);
//     return Array.isArray(data.domains) && data.domains.length > 0 && !data.domain;
//   },
//   { message: "Select one domain for students or one or more domains for mentors", path: ["domain"] }
// );

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
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });