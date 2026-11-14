import mongoose from "mongoose";

const submissionSubSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    repoUrl: { type: String, required: true, trim: true },
    liveUrl: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    status: {
        type: String,
        enum: ["SUBMITTED", "GRADED", "REVISION_REQUESTED"],
        default: "SUBMITTED",
    },
    marksObtained: { type: Number, default: null },
    mentorFeedback: { type: String, trim: true, default: "" },
    submittedAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        domain: { type: String, required: true, trim: true, index: true },
        deadline: { type: Date, required: true },
        maxMarks: { type: Number, default: 100 },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        submissions: [submissionSubSchema],
    },
    { timestamps: true }
);

export default mongoose.model("Task", taskSchema);