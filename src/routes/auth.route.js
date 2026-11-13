import express from "express";
import {signup,login,refreshToken,verifyOTP,resendOTP,googleLogin,forgotPassword,verifyResetOTP,resetPassword} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {signupSchema,loginSchema,verifyOtpSchema,resendOtpSchema,googleAuthSchema,forgotPasswordSchema,verifyResetOtpSchema,resetPasswordSchema} from "../validators/auth.validator.js";
import {otpRequestLimiter,otpVerifyLimiter} from "../middleware/otpRateLimit.middleware.js";

const router = express.Router();

router.post("/signup",validate(signupSchema),signup);

router.post("/login",validate(loginSchema),login);

router.post("/google",validate(googleAuthSchema),googleLogin);

router.post("/refresh", refreshToken);

router.post("/verify-otp",otpVerifyLimiter,validate(verifyOtpSchema),verifyOTP);

router.post("/resend-otp",otpRequestLimiter,validate(resendOtpSchema),resendOTP);

router.post("/send-otp",otpRequestLimiter,validate(resendOtpSchema),resendOTP);

router.post("/forgot-password", otpRequestLimiter, validate(forgotPasswordSchema), forgotPassword);

router.post("/verify-reset-otp", otpVerifyLimiter, validate(verifyResetOtpSchema), verifyResetOTP);

router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;