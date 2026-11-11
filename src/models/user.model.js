
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    studentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^[0-9]{3,20}$/
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: false,
      default: null,
      select: false
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
      select: false
    },

    authProvider: {
      type: String,
      enum: ["LOCAL", "GOOGLE", "BOTH"],
      default: "LOCAL"
    },

    role: {
      type: String,
      enum: ["STUDENT", "MENTOR", "ADMIN"],
      default: "STUDENT"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    lastLogin: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;