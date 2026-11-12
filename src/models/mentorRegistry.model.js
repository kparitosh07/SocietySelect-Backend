import mongoose from "mongoose";

const mentorRegistrySchema = new mongoose.Schema(
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
      trim: true,
      match: /^[^\s@]+@akgec\.ac\.in$/
    },

    admissionYear: {
      type: Number,
      required: true
    },

    graduationYear: {
      type: Number,
      required: true
    },

    branch: {
      type: String,
      default: null,
      trim: true
    },

    section: {
      type: String,
      default: null,
      trim: true
    },

    isEligible: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const MentorRegistry = mongoose.model(
  "MentorRegistry",
  mentorRegistrySchema
);

export default MentorRegistry;