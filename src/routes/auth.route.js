import express from "express";
import {signup,login,refreshToken,verifyOTP,resendOTP,googleLogin} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {signupSchema,loginSchema,verifyOtpSchema,resendOtpSchema,googleAuthSchema} from "../validators/auth.validator.js";
import {otpRequestLimiter,otpVerifyLimiter} from "../middleware/otpRateLimit.middleware.js";

const router = express.Router();

router.post("/signup",otpRequestLimiter,validate(signupSchema),signup);

router.post("/login",validate(loginSchema),login);

router.post("/google",validate(googleAuthSchema),googleLogin);

router.post("/refresh", refreshToken);

router.post("/verify-otp",otpVerifyLimiter,validate(verifyOtpSchema),verifyOTP);

router.post("/resend-otp",otpRequestLimiter,validate(resendOtpSchema),resendOTP);

export default router;