import AttendanceSession from "../models/attendance.model.js";
import User from "../models/user.model.js";
import { createAttendanceStartedNotifications } from "./notification.service.js";

const createHttpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const formatDateLabel = (dateObj) =>
  dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatTimeLabel = (dateObj) =>
  dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

const computeSummary = (entries) => {
  const total = entries.length;
  const present = entries.filter((e) => e.status === "PRESENT").length;
  const absent = total - present;
  const percentage = total ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, percentage };
};

export const getMentorAttendanceState = async (mentorId) => {
  const [allStudents, activeSession, closedSessions] = await Promise.all([
    User.find({ role: "STUDENT", isActive: true })
      .select("fullName rollNo studentNumber year branch domain")
      .sort({ fullName: 1 })
      .lean(),
    AttendanceSession.findOne({ status: "OPEN" })
      .populate("startedBy", "fullName")
      .lean(),
    AttendanceSession.find({ status: "CLOSED" })
      .populate("startedBy", "fullName")
      .sort({ closedAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const entryMap = new Map(
    (activeSession?.entries || []).map((entry) => [
      String(entry.student),
      entry.status,
    ])
  );

  const students = allStudents.map((stu, idx) => ({
    id: String(stu._id),
    name: stu.fullName,
    rollNo: stu.rollNo || stu.studentNumber || String(idx + 1),
    year: stu.year || "2nd Year",
    domain: stu.domain || "",
    status: activeSession
      ? entryMap.get(String(stu._id)) || "PENDING"
      : "ABSENT",
  }));

  const isOwnedByCurrentMentor = activeSession
    ? String(activeSession.startedBy?._id || activeSession.startedBy) ===
      String(mentorId)
    : false;

  return {
    session: activeSession
      ? {
          id: String(activeSession._id),
          isOpen: true,
          society: activeSession.society,
          date: activeSession.dateLabel,
          startTime: activeSession.startTime,
          startedBy: activeSession.startedBy?.fullName || "Mentor",
          isOwnedByCurrentMentor,
        }
      : {
          isOpen: false,
          date: "",
          startTime: "",
          startedBy: null,
          isOwnedByCurrentMentor: false,
        },
    students,
    history: closedSessions.map((s) => ({
      id: String(s._id),
      society: s.society,
      date: s.dateLabel,
      startTime: s.startTime,
      endTime: s.endTime,
      conductedBy: s.startedBy?.fullName || "Mentor",
      total: s.summary?.total ?? s.entries.length,
      present: s.summary?.present ?? 0,
      absent: s.summary?.absent ?? 0,
      percentage: s.summary?.percentage ?? 0,
    })),
  };
};

export const startAttendanceSession = async (mentorId, society = "SocietySelect") => {
  const existingOpen = await AttendanceSession.findOne({ status: "OPEN" })
    .populate("startedBy", "fullName")
    .lean();

  if (existingOpen) {
    const ownerName = existingOpen.startedBy?.fullName || "another mentor";
    throw createHttpError(
      409,
      `An attendance session is already active (${ownerName}). Close it before starting a new one.`
    );
  }

  const allStudents = await User.find({ role: "STUDENT", isActive: true })
    .select("_id")
    .lean();

  const now = new Date();
  const session = await AttendanceSession.create({
    society: society?.trim() || "SocietySelect",
    startedBy: mentorId,
    status: "OPEN",
    dateLabel: formatDateLabel(now),
    startTime: formatTimeLabel(now),
    startedAt: now,
    entries: allStudents.map((stu) => ({
      student: stu._id,
      status: "PENDING",
    })),
    summary: {
      total: allStudents.length,
      present: 0,
      absent: 0,
      percentage: 0,
    },
  });

  const mentorUser = await User.findById(mentorId).select("fullName").lean();
    await createAttendanceStartedNotifications({
        mentorName: mentorUser?.fullName || "A mentor",
        session,
    });

  return session;
};

export const markStudentAttendance = async (sessionId, mentorId, studentId, status) => {
  if (!["PRESENT", "ABSENT"].includes(status)) {
    throw createHttpError(400, "Status must be PRESENT or ABSENT");
  }

  const session = await AttendanceSession.findById(sessionId);
  if (!session) {
    throw createHttpError(404, "Attendance session not found");
  }

  if (session.status !== "OPEN") {
    throw createHttpError(400, "Session is already closed");
  }

  if (String(session.startedBy) !== String(mentorId)) {
    throw createHttpError(
      403,
      "Only the mentor who started this session can mark attendance"
    );
  }

  const idx = session.entries.findIndex(
    (e) => String(e.student) === String(studentId)
  );

  if (idx === -1) {
    session.entries.push({
      student: studentId,
      status,
      markedBy: mentorId,
      markedAt: new Date(),
    });
  } else {
    session.entries[idx].status = status;
    session.entries[idx].markedBy = mentorId;
    session.entries[idx].markedAt = new Date();
  }

  session.summary = computeSummary(session.entries);
  await session.save();

  return {
    sessionId: String(session._id),
    studentId: String(studentId),
    status,
    summary: session.summary,
  };
};

export const closeAttendanceSession = async (sessionId, mentorId) => {
  const session = await AttendanceSession.findById(sessionId);
  if (!session) {
    throw createHttpError(404, "Attendance session not found");
  }

  if (session.status !== "OPEN") {
    throw createHttpError(400, "Session is already closed");
  }

  if (String(session.startedBy) !== String(mentorId)) {
    throw createHttpError(
      403,
      "Only the mentor who started this session can close it"
    );
  }

  const now = new Date();
  session.entries = session.entries.map((entry) => ({
    ...entry.toObject(),
    status: entry.status === "PRESENT" ? "PRESENT" : "ABSENT",
  }));

  session.status = "CLOSED";
  session.closedBy = mentorId;
  session.endTime = formatTimeLabel(now);
  session.closedAt = now;
  session.summary = computeSummary(session.entries);

  await session.save();

  return {
    id: String(session._id),
    society: session.society,
    date: session.dateLabel,
    startTime: session.startTime,
    endTime: session.endTime,
    ...session.summary,
  };
};

export const getStudentAttendance = async (studentId) => {
  const sessions = await AttendanceSession.find({
    status: "CLOSED",
    "entries.student": studentId,
  })
    .sort({ closedAt: -1, createdAt: -1 })
    .lean();

  const records = sessions
    .map((s) => {
      const entry = s.entries.find((e) => String(e.student) === String(studentId));
      if (!entry) return null;

      const refDate = s.closedAt ? new Date(s.closedAt) : new Date(s.createdAt);
      const isoDate = refDate.toISOString().slice(0, 10);
      const day = refDate.toLocaleDateString("en-IN", { weekday: "long" });

      return {
        id: `${s._id}_${studentId}`,
        society: s.society || "SocietySelect",
        date: isoDate,
        day,
        time: s.startTime || "09:00 AM",
        status: entry.status === "PRESENT" ? "Present" : "Absent",
      };
    })
    .filter(Boolean);

  const total = records.length;
  const present = records.filter((r) => r.status === "Present").length;
  const absent = total - present;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  return {
    stats: {
      total,
      present,
      absent,
      percentage,
    },
    records,
  };
};