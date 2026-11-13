import mongoose from "mongoose";

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    otpHash: {
      type: String,
      required: true,
      select: false
    },

    expiresAt: {
      type: Date,
      required: true
    },

    attempts: {
      type: Number,
      default: 0
    },

    resendAvailableAt: {
      type: Date,
      required: true
    },
    
    verificationTokenHash: {
      type: String,
      default: null,
      select: false
    },

    verifiedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

emailOtpSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

emailOtpSchema.index(
  { email: 1 },
  { unique: true }
);

const EmailOtp = mongoose.model("EmailOtp", emailOtpSchema);

export default EmailOtp;