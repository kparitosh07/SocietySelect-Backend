import mongoose from "mongoose";

const examResultSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    marksObtained: { type: Number, min: 0, default: 0 },
    totalMarks: { type: Number, required: true, min: 1 },
    submissionStatus: {
      type: String,
      enum: ["SUBMITTED", "NOT_SUBMITTED"],
      default: "NOT_SUBMITTED",
    },
    resultStatus: {
      type: String,
      enum: ["PASSED", "FAILED", "PENDING"],
      default: "PENDING",
    },
    submittedAt: { type: Date, default: null },
    importedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("ExamResult", examResultSchema);