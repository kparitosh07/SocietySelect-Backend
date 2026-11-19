import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Application from "../models/application.model.js";
import { createTaskAssignedNotifications } from "./notification.service.js";

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getVerifiedMentor = async (mentorId) => {
  const mentor = await User.findById(mentorId)
    .select("fullName email studentNumber domain domains branch year role")
    .lean();

  if (!mentor || mentor.role !== "MENTOR") {
    throw createServiceError("Mentor account not found", 404);
  }

  mentor.domains = Array.isArray(mentor.domains) && mentor.domains.length
    ? mentor.domains
    : (mentor.domain ? [mentor.domain] : []);

  if (!mentor.domains.length) {
    throw createServiceError("No domains are assigned to this mentor", 403);
  }
  mentor.domain = mentor.domains[0];

  return mentor;
};

// 1. GET /api/mentor/dashboard
export const getMentorDashboardData = async (mentorId) => {
  const mentor = await getVerifiedMentor(mentorId);

  const [students, domainTasks, upcomingInterviews] = await Promise.all([
    User.find({ role: "STUDENT", domain: mentor.domain, isActive: true })
      .select(
        "fullName email studentNumber domain branch section rollNo year skills githubUsername githubUrl probationStatus createdAt"
      )
      .sort({ createdAt: -1 })
      .lean(),
    Task.find({ domain: mentor.domain }).sort({ deadline: 1 }).lean(),
    Application.find({
      domain: mentor.domain,
      stage: "INTERVIEW_SCHEDULED",
      "interview.scheduledAt": { $ne: null },
    })
      .populate("student", "fullName email studentNumber branch year")
      .sort({ "interview.scheduledAt": 1 })
      .lean(),
  ]);

  const totalDomainTasks = domainTasks.length;

  // Map student progress from real task submissions
  const studentMap = new Map(students.map((s) => [String(s._id), s]));

  const studentProgress = students.map((student) => {
    let submittedCount = 0;
    let gradedSum = 0;
    let gradedCount = 0;

    for (const task of domainTasks) {
      const sub = task.submissions?.find(
        (s) => String(s.student) === String(student._id)
      );
      if (sub) {
        submittedCount += 1;
        if (sub.marksObtained !== null && sub.marksObtained !== undefined) {
          gradedSum += sub.marksObtained;
          gradedCount += 1;
        }
      }
    }

    const completionRate = totalDomainTasks
      ? Math.round((submittedCount / totalDomainTasks) * 100)
      : 0;

    const avgMarks = gradedCount ? Math.round(gradedSum / gradedCount) : null;

    return {
      id: student._id,
      fullName: student.fullName,
      email: student.email,
      studentNumber: student.studentNumber,
      domain: student.domain,
      branch: student.branch,
      year: student.year,
      probationStatus: student.probationStatus,
      completedTasks: submittedCount,
      totalTasks: totalDomainTasks,
      progressPercentage: completionRate,
      averageMarks: avgMarks,
    };
  });

  // Collect ungraded ("SUBMITTED") task submissions for Pending Reviews
  const pendingReviews = [];
  for (const task of domainTasks) {
    for (const sub of task.submissions || []) {
      if (sub.status === "SUBMITTED") {
        const stu = studentMap.get(String(sub.student));
        pendingReviews.push({
          taskId: task._id,
          taskTitle: task.title,
          studentId: sub.student,
          studentName: stu?.fullName || "Unknown Student",
          studentEmail: stu?.email || "",
          repoUrl: sub.repoUrl,
          liveUrl: sub.liveUrl,
          notes: sub.notes,
          submittedAt: sub.submittedAt,
        });
      }
    }
  }

  pendingReviews.sort(
    (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
  );

  // Format upcoming scheduled interviews from Application collection
  const schedule = upcomingInterviews.map((app) => ({
    applicationId: app._id,
    studentId: app.student?._id || null,
    studentName: app.student?.fullName || "Candidate",
    studentEmail: app.student?.email || "",
    domain: app.domain,
    scheduledAt: app.interview?.scheduledAt,
    mode: app.interview?.mode,
    meetLinkOrVenue: app.interview?.meetLinkOrVenue,
    panelistName: app.interview?.panelistName,
  }));

  const activeTasksCount = domainTasks.filter(
    (t) => new Date(t.deadline) >= new Date()
  ).length;

  return {
    mentor,
    stats: {
      assignedStudentsCount: students.length,
      pendingReviewsCount: pendingReviews.length,
      activeTasksCount,
      totalTasksCount: totalDomainTasks,
    },
    studentProgress,
    pendingReviews,
    schedule,
  };
};

// 2. GET /api/mentor/students
export const getAssignedStudents = async (mentorId, filters = {}) => {
  const mentor = await getVerifiedMentor(mentorId);

  const query = {
    role: "STUDENT",
    domain: mentor.domain,
    isActive: true,
  };

  if (
    filters.probationStatus &&
    ["APPLICANT", "ON_PROBATION", "SELECTED", "REJECTED"].includes(
      filters.probationStatus
    )
  ) {
    query.probationStatus = filters.probationStatus;
  }

  if (filters.search) {
    const regex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { fullName: regex },
      { email: regex },
      { studentNumber: regex },
      { rollNo: regex },
    ];
  }

  const [students, applications, domainTasks] = await Promise.all([
    User.find(query)
      .select(
        "fullName email studentNumber domain branch section rollNo year phone bio skills githubUsername githubUrl probationStatus createdAt"
      )
      .sort({ fullName: 1 })
      .lean(),
    Application.find({ domain: mentor.domain })
      .select("student societyName stage interview")
      .lean(),
    Task.find({ domain: mentor.domain })
      .select("title maxMarks submissions")
      .lean(),
  ]);

  const appByStudent = new Map(
    applications.map((app) => [String(app.student), app])
  );

  const enrichedStudents = students.map((student) => {
    const app = appByStudent.get(String(student._id)) || null;
    const submittedTasks = domainTasks.filter((t) =>
      t.submissions?.some((s) => String(s.student) === String(student._id))
    ).length;

    return {
      ...student,
      applicationStage: app?.stage || "NOT_APPLIED",
      societyName: app?.societyName || "Big Data Centre of Excellence",
      taskSummary: {
        submitted: submittedTasks,
        total: domainTasks.length,
      },
    };
  });

  return {
    domains: mentor.domains,
    domain: mentor.domains[0],
    totalStudents: enrichedStudents.length,
    students: enrichedStudents,
  };
};

// 3. GET /api/mentor/students/:studentId
export const getStudentDetailForMentor = async (mentorId, studentId) => {
  const mentor = await getVerifiedMentor(mentorId);

  const student = await User.findOne({
    _id: studentId,
    role: "STUDENT",
    domain: mentor.domain,
  })
    .select("-password")
    .lean();

  if (!student) {
    throw createServiceError("Student not found in your domain", 404);
  }

  const [application, tasks] = await Promise.all([
    Application.findOne({ student: studentId }).lean(),
    Task.find({ domain: mentor.domain }).sort({ deadline: 1 }).lean(),
  ]);

  const submissions = tasks.map((task) => {
    const sub =
      task.submissions?.find((s) => String(s.student) === String(studentId)) ||
      null;
    return {
      taskId: task._id,
      title: task.title,
      deadline: task.deadline,
      maxMarks: task.maxMarks,
      submission: sub,
    };
  });

  return {
    student,
    application,
    submissions,
  };
};

// 4. PATCH /api/mentor/students/:studentId/status
export const updateStudentProbationStatus = async (
  mentorId,
  studentId,
  probationStatus
) => {
  const mentor = await getVerifiedMentor(mentorId);

  const student = await User.findOneAndUpdate(
    { _id: studentId, role: "STUDENT", domain: mentor.domain },
    { $set: { probationStatus } },
    { new: true, runValidators: true }
  ).select(
    "fullName email studentNumber domain branch section rollNo year probationStatus"
  );

  if (!student) {
    throw createServiceError("Student not found in your domain", 404);
  }

  // Keep Application stage synchronized if an application exists
  const stageSyncMap = {
    ON_PROBATION: "PROBATION",
    SELECTED: "SELECTED",
    REJECTED: "REJECTED",
  };

  if (stageSyncMap[probationStatus]) {
    await Application.findOneAndUpdate(
      { student: studentId },
      { $set: { stage: stageSyncMap[probationStatus] } }
    );
  }

  return student;
};

// 5. POST /api/mentor/tasks
export const createDomainTask = async (mentorId, payload) => {
  const mentor = await getVerifiedMentor(mentorId);

  const task = await Task.create({
    title: payload.title,
    description: payload.description,
    domain: payload.domain || mentor.domain,
    deadline: new Date(payload.deadline),
    maxMarks: payload.maxMarks ?? 100,
    assignedBy: mentor._id,
  });

  await createTaskAssignedNotifications({
    mentorName: mentor.fullName,
    task,
  });

  return task;
};

// 6. GET /api/mentor/tasks
export const listDomainTasksWithSubmissions = async (mentorId) => {
  const mentor = await getVerifiedMentor(mentorId);

  const tasks = await Task.find({ domain: mentor.domain })
    .populate("assignedBy", "fullName email")
    .populate("submissions.student", "fullName email studentNumber branch year githubUrl")
    .sort({ createdAt: -1 })
    .lean();

  return {
    domains: mentor.domains,
    domain: mentor.domains[0] ,
    totalTasks: tasks.length,
    tasks,
  };
};

// 7. PATCH /api/mentor/tasks/:taskId/submissions/:studentId
export const gradeStudentSubmission = async (
  mentorId,
  taskId,
  studentId,
  payload
) => {
  const mentor = await getVerifiedMentor(mentorId);

  const task = await Task.findOne({ _id: taskId, domain: mentor.domain });
  if (!task) {
    throw createServiceError("Task not found in your domain", 404);
  }

  const submission = task.submissions.find(
    (s) => String(s.student) === String(studentId)
  );

  if (!submission) {
    throw createServiceError(
      "No submission found for this student on the specified task",
      404
    );
  }

  if (
    payload.marksObtained !== undefined &&
    payload.marksObtained !== null &&
    payload.marksObtained > task.maxMarks
  ) {
    throw createServiceError(
      `Marks obtained (${payload.marksObtained}) cannot exceed maxMarks (${task.maxMarks})`,
      400
    );
  }

  submission.status = payload.status;
  if (payload.marksObtained !== undefined) {
    submission.marksObtained = payload.marksObtained;
  }
  if (payload.mentorFeedback !== undefined) {
    submission.mentorFeedback = payload.mentorFeedback;
  }

  await task.save();

  return submission;
};