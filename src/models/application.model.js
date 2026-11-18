import mongoose from "mongoose";

const evaluationScoresSubSchema = new mongoose.Schema(
  {
    communication: { type: Number, min: 0, max: 10, default: null },
    technical: { type: Number, min: 0, max: 10, default: null },
    confidence: { type: Number, min: 0, max: 10, default: null },
    problemSolving: { type: Number, min: 0, max: 10, default: null },
  },
  { _id: false }
);

const interviewSubSchema = new mongoose.Schema(
  {
    scheduledAt: { type: Date, default: null },
    mode: { type: String, enum: ["ONLINE", "OFFLINE"], default: "ONLINE" },
    meetLinkOrVenue: { type: String, trim: true, default: "" },
    panelistName: { type: String, trim: true, default: "" },
    instructions: { type: String, trim: true, default: "" },

    // Workflow tracking flags
    notificationsSent: { type: Boolean, default: false },
    participantsJoined: { type: Boolean, default: false },
    interviewConducted: { type: Boolean, default: false },
    interviewNotes: { type: String, trim: true, default: "" },

    // Evaluation & scoring
    scores: { type: evaluationScoresSubSchema, default: () => ({}) },
    score: { type: Number, min: 0, max: 100, default: null },
    feedback: { type: String, trim: true, default: "" },
    decision: {
      type: String,
      enum: [
        "SHORTLISTED",
        "REJECTED",
        "ON_HOLD",
        "FURTHER_EVALUATION",
        null,
      ],
      default: null,
    },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    evaluatedAt: { type: Date, default: null },
    resultPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
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