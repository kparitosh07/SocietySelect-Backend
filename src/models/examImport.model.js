import mongoose from "mongoose";

const examImportSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true, trim: true },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalRecords: { type: Number, required: true, min: 0 },
    successfulRecords: { type: Number, required: true, min: 0 },
    failedRecords: { type: Number, required: true, min: 0 },
    importedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("ExamImport", examImportSchema);