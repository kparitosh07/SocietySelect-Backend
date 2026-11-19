import mongoose from "mongoose";

const attendanceEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "PENDING"],
      default: "PENDING",
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    markedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const attendanceSessionSchema = new mongoose.Schema(
  {
    society: {
      type: String,
      trim: true,
      default: "SocietySelect",
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    dateLabel: {
      type: String,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      default: "",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    entries: {
      type: [attendanceEntrySchema],
      default: [],
    },
    summary: {
      total: { type: Number, default: 0 },
      present: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("AttendanceSession", attendanceSessionSchema);