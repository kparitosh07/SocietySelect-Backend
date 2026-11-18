import User from "../models/user.model.js";
import Application from "../models/application.model.js";
import Task from "../models/task.model.js";
import mongoose from "mongoose";

export const getDashboardOverview = async (studentId) => {
  const student = await User.findById(studentId)
    .select(
      "fullName email studentNumber domain branch section rollNo year skills githubUsername githubUrl probationStatus createdAt"
    )
    .lean();

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    throw error;
  }

  const Attendance = mongoose.models.Attendance;

  const [application, domainTasks, attendanceLogs] = await Promise.all([
    Application.findOne({ student: studentId }).lean(),
    Task.find({ domain: student.domain }).sort({ deadline: 1 }).lean(),
    Attendance ? Attendance.find({ student: studentId }).lean() : [],
  ]);

  // 1. Attendance calculation from DB
  const presentCount = attendanceLogs.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const attendancePercentage = attendanceLogs.length
    ? Math.round((presentCount / attendanceLogs.length) * 100)
    : null;

  // 2. Task & Submission aggregation from DB
  const upcomingTasks = [];
  const recentSubmissions = [];
  let gradedSum = 0;
  let gradedCount = 0;

  for (const task of domainTasks) {
    const mySub = task.submissions?.find(
      (s) => String(s.student) === String(studentId)
    );

    if (mySub) {
      if (mySub.marksObtained !== null && mySub.marksObtained !== undefined) {
        gradedSum += mySub.marksObtained;
        gradedCount += 1;
      }
      recentSubmissions.push({
        taskId: task._id,
        taskTitle: task.title,
        status: mySub.status,
        marksObtained: mySub.marksObtained,
        maxMarks: task.maxMarks,
        mentorFeedback: mySub.mentorFeedback,
        submittedAt: mySub.submittedAt,
      });
    } else {
      upcomingTasks.push({
        taskId: task._id,
        title: task.title,
        description: task.description,
        deadline: task.deadline,
        maxMarks: task.maxMarks,
      });
    }
  }

  recentSubmissions.sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );

  const completedTasks = recentSubmissions.length;
  const totalTasks = domainTasks.length;
  const averageTaskScore = gradedCount
    ? Math.round(gradedSum / gradedCount)
    : null;

  return {
    student,
    kpis: {
      applicationStage: application?.stage || "NOT_APPLIED",
      probationStatus: student.probationStatus || "APPLICANT",
      attendancePercentage,
      totalTasks,
      completedTasks,
      pendingTasks: Math.max(0, totalTasks - completedTasks),
      averageTaskScore,
      interviewScore: application?.interview?.score ?? null,
    },
    application: application
      ? {
          id: application._id,
          societyName: application.societyName,
          domain: application.domain,
          stage: application.stage,
          interview: application.interview || null,
          submittedAt: application.createdAt,
          updatedAt: application.updatedAt,
        }
      : null,
    upcomingTasks,
    recentSubmissions,
  };
};