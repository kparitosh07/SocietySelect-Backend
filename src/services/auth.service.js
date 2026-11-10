import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import crypto from "node:crypto";
import Session from "../models/session.model.js";
import {generateAccessToken,generateRefreshToken} from "../utils/token.util.js";

export const registerStudent = async (data) => {

  const existingEmail = await User.findOne({
    email: data.email
  });

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

  const hashedPassword = await bcrypt.hash(data.password,12);

  const newStudent = await User.create({
    fullName: data.fullName,
    studentNumber: data.studentNumber,
    email: data.email,
    password: hashedPassword,
    role: "STUDENT"
  });

  return {
    id: newStudent._id,
    fullName: newStudent.fullName,
    studentNumber: newStudent.studentNumber,
    email: newStudent.email,
    role: newStudent.role,
    createdAt: newStudent.createdAt
  };
};

export const loginUser = async ({ email, password }) => {

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Your account is inactive");
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

  const session = await Session.create({
    userId: user._id,
    refreshTokenHash: "temporary",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken(
    user,
    session._id
  );

  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  session.refreshTokenHash = refreshTokenHash;
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