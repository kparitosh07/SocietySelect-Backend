import * as attendanceService from "../services/attendance.service.js";

export const getMentorState = async (req, res, next) => {
  try {
    const data = await attendanceService.getMentorAttendanceState(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const startSession = async (req, res, next) => {
  try {
    const session = await attendanceService.startAttendanceSession(
      req.user.id,
      req.body?.society
    );
    res.status(201).json({
      success: true,
      message: "Attendance session started",
      session: {
        id: String(session._id),
        isOpen: true,
        society: session.society,
        date: session.dateLabel,
        startTime: session.startTime,
        isOwnedByCurrentMentor: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const normalizedStatus = String(req.body?.status || "").toUpperCase();
    const result = await attendanceService.markStudentAttendance(
      req.params.sessionId,
      req.user.id,
      req.params.studentId,
      normalizedStatus
    );
    res.status(200).json({
      success: true,
      message: "Attendance updated",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const closeSession = async (req, res, next) => {
  try {
    const record = await attendanceService.closeAttendanceSession(
      req.params.sessionId,
      req.user.id
    );
    res.status(200).json({
      success: true,
      message: "Attendance session closed",
      record,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.getStudentAttendance(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};