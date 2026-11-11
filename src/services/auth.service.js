import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import crypto from "node:crypto";
import Session from "../models/session.model.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.util.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

const hashRefreshToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const createAuthSession = async (user) => {
  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: "temporary",
    expiresAt: new Date(Date.now() + SESSION_DURATION)
  });

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken(
    user,
    session._id
  );

  session.refreshTokenHash = hashRefreshToken(refreshToken);

  await session.save();

  user.lastLogin = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      studentNumber: user.studentNumber,
      email: user.email,
      role: user.role
    }
  };
};

export const registerStudent = async (data) => {
  const email = data.email.toLowerCase().trim();

  const existingEmail = await User.findOne({ email });

  if (existingEmail) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const existingStudent = await User.findOne({
    studentNumber: data.studentNumber
  });

  if (existingStudent) {
    const error = new Error("Student number already registered");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    const newStudent = await User.create({
      fullName: data.fullName,
      studentNumber: data.studentNumber,
      email,
      password: hashedPassword,
      authProvider: "LOCAL",
      role: "STUDENT",
      isVerified: false
    });

    return {
      id: newStudent._id,
      fullName: newStudent.fullName,
      studentNumber: newStudent.studentNumber,
      email: newStudent.email,
      role: newStudent.role,
      createdAt: newStudent.createdAt
    };

  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error(
        "Email or student number already registered"
      );
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({
    email: email.toLowerCase().trim()
  }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Your account is inactive");
  }

  if (!user.password) {
    const error = new Error("This account uses Google sign-in. Please continue with Google.");
    error.statusCode = 400;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  if (!user.isVerified) {
    const error = new Error(
      "Please verify your college email before logging in"
    );
    error.statusCode = 403;
    throw error;
  }

  return createAuthSession(user);
};

export const googleAuthUser = async ({
  idToken,
  studentNumber
}) => {

  if (!process.env.GOOGLE_CLIENT_ID) {
    const error = new Error(
      "Google OAuth is not configured"
    );
    error.statusCode = 500;
    throw error;
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    payload = ticket.getPayload();

  } catch {
    const error = new Error("Invalid or expired Google ID token");
    error.statusCode = 401;
    throw error;
  }

  if (
    !payload ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    const error = new Error(
      "Google email must be verified"
    );
    error.statusCode = 403;
    throw error;
  }

  const email = payload.email.toLowerCase().trim();

  if (!email.endsWith("@akgec.ac.in")) {
    const error = new Error(
      "Please use your official AKGEC Google account"
    );
    error.statusCode = 403;
    throw error;
  }

  let user = await User.findOne({
    googleId: payload.sub
  }).select("+googleId");

  if (user) {

    if (user.email !== email) {
      throw new Error("Google account mismatch");
    }

    if (!user.isActive || !user.isVerified) {
      throw new Error("Your account is unavailable");
    }

    return createAuthSession(user);
  }

  user = await User.findOne({ email }).select("+googleId");

  if (user) {

    if (user.role !== "STUDENT") {
      const error = new Error(
        "Please contact an administrator to link Google sign-in"
      );
      error.statusCode = 403;
      throw error;
    }

    if (!user.isActive) {
      throw new Error("Your account is inactive");
    }

    if (!user.isVerified) {
      const error = new Error(
        "Please verify your email using OTP before linking Google"
      );
      error.statusCode = 403;
      throw error;
    }

    if (user.googleId && user.googleId !== payload.sub) {
      const error = new Error(
        "Another Google account is already linked"
      );
      error.statusCode = 409;
      throw error;
    }

    user.googleId = payload.sub;
    user.authProvider = user.password ? "BOTH" : "GOOGLE";

    await user.save();

    return createAuthSession(user);
  }

  if (!studentNumber) {
    return {
      requiresStudentNumber: true,
      googleProfile: {
        fullName: payload.name || "",
        email
      }
    };
  }

  if (!/^[0-9]{3,20}$/.test(studentNumber)) {
    const error = new Error(
      "Student number must contain 3 to 20 digits"
    );
    error.statusCode = 400;
    throw error;
  }

  const existingStudent = await User.findOne({
    studentNumber
  });

  if (existingStudent) {
    const error = new Error(
      "Student number already registered"
    );
    error.statusCode = 409;
    throw error;
  }

  try {
    user = await User.create({
      fullName: payload.name || email.split("@")[0],
      studentNumber,
      email,
      googleId: payload.sub,
      authProvider: "GOOGLE",
      role: "STUDENT",
      isActive: true,
      isVerified: true
    });

  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error(
        "Email, Google account or student number already registered"
      );
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
  return createAuthSession(user);
};

export const refreshUserToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  let decoded;

  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      { algorithms: ["HS256"] }
    );
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (decoded.type !== "refresh" || !decoded.sub || !decoded.sid) {
    throw new Error("Invalid refresh token");
  }

  const session = await Session.findOne({
    _id: decoded.sid,
    userId: decoded.sub,
    expiresAt: { $gt: new Date() }
  }).select("+refreshTokenHash");

  if (!session) {
    throw new Error("Session expired or not found");
  }

  const oldTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  if (session.refreshTokenHash !== oldTokenHash) {
    throw new Error("Refresh token has already been used");
  }

  const user = await User.findById(decoded.sub);

  if (!user || !user.isActive || !user.isVerified) {
    throw new Error("Account is unavailable");
  }

  const newAccessToken = generateAccessToken(user);

  const newRefreshToken = generateRefreshToken(user, session._id);

  const newTokenHash = crypto
    .createHash("sha256")
    .update(newRefreshToken)
    .digest("hex");

  const updatedSession = await Session.findOneAndUpdate(
    {
      _id: session._id,
      userId: user._id,
      refreshTokenHash: oldTokenHash,
      expiresAt: { $gt: new Date() }
    },
    {
      $set: {
        refreshTokenHash: newTokenHash,
        expiresAt: new Date(
          Date.now() + SESSION_DURATION 
        )
      }
    },
    { new: true }
  );

  if (!updatedSession) {
    throw new Error("Refresh token has already been used");
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
};