import mongoose from "mongoose";

const interviewSubSchema = new mongoose.Schema(
  {
    scheduledAt: { type: Date, default: null },
    mode: { type: String, enum: ["ONLINE", "OFFLINE"], default: "ONLINE" },
    meetLinkOrVenue: { type: String, trim: true, default: "" },
    panelistName: { type: String, trim: true, default: "" },
    instructions: { type: String, trim: true, default: "" },
    feedback: { type: String, trim: true, default: "" },
    score: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    societyName: {
      type: String,
      required: true,
      trim: true,
      default: "Big Data Centre of Excellence",
    },
    domain: { type: String, required: true, trim: true, index: true },
    whyJoin: { type: String, required: true, trim: true, maxlength: 1000 },
    experience: { type: String, trim: true, default: "" },
    githubUrl: { type: String, trim: true, default: "" },
    portfolioUrl: { type: String, trim: true, default: "" },
    resumeUrl: { type: String, trim: true, default: "" },
    stage: {
      type: String,
      enum: [
        "APPLIED",
        "ASSESSMENT",
        "INTERVIEW_SCHEDULED",
        "PROBATION",
        "SELECTED",
        "REJECTED",
      ],
      default: "APPLIED",
    },
    interview: { type: interviewSubSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);