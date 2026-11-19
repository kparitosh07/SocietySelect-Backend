import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["TASK_ASSIGNED", "ATTENDANCE_STARTED"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
      taskTitle: { type: String, default: "" },
      domain: { type: String, default: "" },
      deadline: { type: Date, default: null },
      maxMarks: { type: Number, default: null },
      sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AttendanceSession",
        default: null,
      },
      society: { type: String, default: "" },
      date: { type: String, default: "" },
      startTime: { type: String, default: "" },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);