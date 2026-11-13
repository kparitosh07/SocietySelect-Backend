import { registerStudent, loginUser, googleAuthUser, refreshUserToken } from "../services/auth.service.js";

import { sendVerificationOTP, verifyEmailOTP, sendPasswordResetOTP, verifyPasswordResetOTP } from "../services/emailOtp.service.js";

import { resetUserPassword } from "../services/auth.service.js";

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

const setRefreshCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: SESSION_DURATION,
    path: "/api/auth"
  });
};

export const signup = async (req, res) => {
  try {
    const student = await registerStudent(req.body);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: student
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or student number already registered"
      });
    }

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken: result.accessToken,
      user: result.user
    });

  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const result = await googleAuthUser(req.body);

    if (result.requiresStudentNumber) {
      return res.status(200).json({
        success: true,
        requiresStudentNumber: true,
        message:
          "Please provide your student number to complete registration.",
        googleProfile: result.googleProfile
      });
    }

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      accessToken: result.accessToken,
      user: result.user
    });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;

    const result = await refreshUserToken(oldRefreshToken);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: result.accessToken
    });

  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyEmailOTP(email, otp);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await sendVerificationOTP(email);

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;
    const result = await sendPasswordResetOTP(email, role);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyPasswordResetOTP(email, otp);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const result = await resetUserPassword(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};