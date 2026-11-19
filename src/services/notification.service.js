import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { getIO } from "../socket/io.socket.js";

const formatClientNotification = (doc) => ({
  id: String(doc._id),
  type: doc.type,
  title: doc.title,
  message: doc.message,
  meta: doc.meta || {},
  isRead: Boolean(doc.isRead),
  createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
});

export const createTaskAssignedNotifications = async ({
  mentorName,
  task,
}) => {
  const normalizedDomain = (task.domain || "").trim();
  const filter = {
    role: "STUDENT",
    isActive: true,
    ...(normalizedDomain
      ? { domain: new RegExp(`^${normalizedDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
      : {}),
  };

  const students = await User.find(filter).select("_id").lean();
  if (!students.length) return [];

  const docs = await Notification.insertMany(
    students.map((stu) => ({
      recipient: stu._id,
      type: "TASK_ASSIGNED",
      title: "New Task Assigned",
      message: `${mentorName} assigned "${task.title}" (${task.domain})`,
      meta: {
        taskId: task._id,
        taskTitle: task.title,
        domain: task.domain,
        deadline: task.deadline || null,
        maxMarks: task.maxMarks ?? null,
      },
      isRead: false,
    }))
  );

  const io = getIO();
  if (io) {
    for (const doc of docs) {
      io.to(`user:${doc.recipient}`).emit(
        "task:assigned",
        formatClientNotification(doc)
      );
    }
  }

  return docs;
};

export const createAttendanceStartedNotifications = async ({
  mentorName,
  session,
}) => {
  const students = await User.find({ role: "STUDENT", isActive: true })
    .select("_id")
    .lean();
  if (!students.length) return [];

  const docs = await Notification.insertMany(
    students.map((stu) => ({
      recipient: stu._id,
      type: "ATTENDANCE_STARTED",
      title: "Attendance Portal Opened",
      message: `${mentorName} started an attendance session for ${session.society} (${session.startTime})`,
      meta: {
        sessionId: session._id,
        society: session.society,
        date: session.dateLabel,
        startTime: session.startTime,
      },
      isRead: false,
    }))
  );

  const io = getIO();
  if (io) {
    for (const doc of docs) {
      io.to(`user:${doc.recipient}`).emit(
        "attendance:started",
        formatClientNotification(doc)
      );
    }
  }

  return docs;
};

export const getStudentNotifications = async (studentId, limit = 40) => {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ recipient: studentId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: studentId, isRead: false }),
  ]);

  return {
    unreadCount,
    notifications: items.map(formatClientNotification),
  };
};

export const markNotificationAsRead = async (studentId, notificationId) => {
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: studentId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  ).lean();

  if (!updated) {
    const err = new Error("Notification not found");
    err.statusCode = 404;
    throw err;
  }

  const unreadCount = await Notification.countDocuments({
    recipient: studentId,
    isRead: false,
  });

  return {
    notification: formatClientNotification(updated),
    unreadCount,
  };
};

export const markAllNotificationsAsRead = async (studentId) => {
  await Notification.updateMany(
    { recipient: studentId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { unreadCount: 0 };
};