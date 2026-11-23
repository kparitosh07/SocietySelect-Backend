import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js";

import profileRoutes from "./routes/profile.route.js";
import studentOverviewRoutes from "./routes/studentOverview.route.js";
import applicationRoutes from "./routes/application.route.js";
import taskRoutes from "./routes/task.route.js";
import mentorRoutes from "./routes/mentor.route.js";
import interviewRoutes from "./routes/interview.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import notificationRoutes from "./routes/notification.route.js";
import examRoutes, { studentExamRouter } from "./routes/exam.routes.js";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173",
      "https://bdtech-6thg.vercel.app",
      process.env.CLIENT_URL
    ].filter(Boolean),
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/student", studentOverviewRoutes);
app.use("/api/application", applicationRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/mentor", mentorRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/student/exams", studentExamRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to SocietySelect AI Backend"
  });
});

app.use((err, req, res, next) => {
  console.error("API Error:", err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;