import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js";

import profileRoutes from "./routes/profile.route.js";
import studentOverviewRoutes from "./routes/studentOverview.route.js";
import applicationRoutes from "./routes/application.route.js";
import taskRoutes from "./routes/task.route.js";

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

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to SocietySelect AI Backend"
  });
});

export default app;