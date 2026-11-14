import mongoose from "mongoose";
import User from "../models/user.model.js";

export const getDashboardOverview = async (studentId) => {
    const student = await User.findById(studentId)
        .select("fullName email studentNumber domain branch year skills githubUsername probationStatus")
        .lean();

    if (!student) {
        throw new Error("Student not found");
    }

    const Application = mongoose.models.Application;
    const Task = mongoose.models.Task;
    const Attendance = mongoose.models.Attendance;

    const [application, domainTasks, attendanceLogs] = await Promise.all([
        Application ? Application.findOne({ student: studentId }).lean() : null,
        Task ? Task.find({ domain: student.domain }).lean() : [],
        Attendance ? Attendance.find({ student: studentId }).lean() : [],
    ]);

    const presentCount = attendanceLogs.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
    ).length;
    const attendancePercentage = attendanceLogs.length
        ? Math.round((presentCount / attendanceLogs.length) * 100)
        : 100;

    const completedTasks = domainTasks.filter((t) =>
        t.submissions?.some((s) => String(s.student) === String(studentId))
    ).length;

    return {
        student,
        kpis: {
            applicationStage: application?.stage || "NOT_APPLIED",
            probationStatus: student.probationStatus || "APPLICANT",
            attendancePercentage,
            totalTasks: domainTasks.length,
            completedTasks,
            pendingTasks: Math.max(0, domainTasks.length - completedTasks),
        },
    };
};