import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

let ioInstance = null;

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://bdtech-6thg.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

      if (!rawToken) {
        return next(new Error("Unauthorized: Socket token missing"));
      }

      const secret =
        process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET;
      const decoded = jwt.verify(rawToken, secret);
      const userId = decoded.sub || decoded.id;

      const user = await User.findById(userId)
        .select("fullName role domain isActive")
        .lean();

      if (!user || !user.isActive) {
        return next(new Error("Unauthorized: User not found or inactive"));
      }

      socket.user = {
        id: String(user._id),
        fullName: user.fullName,
        role: user.role,
        domain: (user.domain || "").trim().toLowerCase(),
      };

      return next();
    } catch {
      return next(new Error("Unauthorized: Invalid or expired socket token"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role, domain } = socket.user;

    socket.join(`user:${id}`);
    socket.join(`role:${role}`);

    if (role === "STUDENT" && domain) {
      socket.join(`domain:${domain}`);
    }

    socket.on("disconnect", () => {
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => ioInstance;

export const emitToStudentsInDomain = (domain, eventName, payload) => {
  if (!ioInstance) return;
  const normalizedDomain = (domain || "").trim().toLowerCase();
  if (normalizedDomain) {
    ioInstance.to(`domain:${normalizedDomain}`).emit(eventName, payload);
  } else {
    ioInstance.to("role:STUDENT").emit(eventName, payload);
  }
};

export const emitToAllStudents = (eventName, payload) => {
  if (!ioInstance) return;
  ioInstance.to("role:STUDENT").emit(eventName, payload);
};