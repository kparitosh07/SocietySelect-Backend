import mongoose from "mongoose";

const examAssignmentSchema = new mongoose.Schema(
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
    assignedAt: { type: Date, default: Date.now },
    invitationStatus: {
      type: String,
      enum: ["ASSIGNED", "NOTIFIED"],
      default: "ASSIGNED",
    },
    participationStatus: {
      type: String,
      enum: ["PENDING", "APPEARED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

examAssignmentSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model("ExamAssignment", examAssignmentSchema);