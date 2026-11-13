import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.route.js";

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

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to SocietySelect AI Backend"
  });
});

export default app;