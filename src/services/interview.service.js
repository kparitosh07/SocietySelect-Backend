import crypto from "node:crypto";
import Application from "../models/application.model.js";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";

const createServiceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const generateJitsiLink = (candidateName = "Candidate") => {
  const roomId = crypto.randomUUID();
  const slug = candidateName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `https://meet.jit.si/SocietySelect-${slug || "candidate"}-${roomId}`;
};

const deriveInterviewStatus = (application) => {
  const iv = application.interview;
  if (iv?.score !== null && iv?.score !== undefined && iv?.decision) {
    return "COMPLETED";
  }
  if (iv?.scheduledAt) {
    return "SCHEDULED";
  }
  return "NOT_SCHEDULED";
};

// 1. GET /api/interviews
export const listInterviewCandidates = async (mentorId, filters = {}) => {
  const mentor = await User.findById(mentorId)
    .select("fullName domain domains role")
    .lean();

  if (!mentor || mentor.role !== "MENTOR") {
    throw createServiceError("Mentor account not found", 404);
  }

  const mentorDomains = Array.isArray(mentor.domains) && mentor.domains.length
    ? mentor.domains
    : (mentor.domain ? [mentor.domain] : []);
  if (!mentorDomains.length) throw createServiceError("No domains are assigned to this mentor", 403);

  const requestedDomain = filters.domain;
  if (requestedDomain && !mentorDomains.includes(requestedDomain)) {
    throw createServiceError("You do not have access to this domain", 403);
  }
  const appQuery = { domain: requestedDomain || { $in: mentorDomains } };

  const [applications, domainTasks] = await Promise.all([
    Application.find(appQuery)
      .populate(
        "student",
        "fullName email studentNumber domain branch section rollNo year phone skills githubUsername githubUrl probationStatus"
      )
      .sort({ updatedAt: -1 })
      .lean(),
    Task.find({ domain: appQuery.domain })
      .select("domain maxMarks submissions")
      .lean(),
  ]);

  let candidates = applications
    .filter((app) => Boolean(app.student))
    .map((app) => {
      const studentId = String(app.student._id);
      const status = deriveInterviewStatus(app);

      // Compute average task score from DB submissions if available
      const gradedMarks = [];
      for (const task of domainTasks) {
        const sub = task.submissions?.find(
          (s) => String(s.student) === studentId && s.marksObtained !== null
        );
        if (sub) gradedMarks.push(sub.marksObtained);
      }

      const taskAvgScore = gradedMarks.length
        ? Math.round(
            gradedMarks.reduce((a, b) => a + b, 0) / gradedMarks.length
          )
        : null;

      return {
        applicationId: app._id,
        studentId: app.student._id,
        fullName: app.student.fullName,
        email: app.student.email,
        studentNumber: app.student.studentNumber,
        branch: app.student.branch,
        section: app.student.section,
        rollNo: app.student.rollNo,
        year: app.student.year,
        domain: app.domain,
        societyName: app.societyName,
        stage: app.stage,
        probationStatus: app.student.probationStatus,
        githubUrl: app.githubUrl || app.student.githubUrl || "",
        portfolioUrl: app.portfolioUrl || "",
        resumeUrl: app.resumeUrl || "",
        taskAverageScore: taskAvgScore,
        interviewStatus: status, // "NOT_SCHEDULED" | "SCHEDULED" | "COMPLETED"
        interview: app.interview || {},
      };
    });

  if (filters.status) {
    const normalizedFilter = filters.status.toUpperCase().replace(/\s+/g, "_");
    if (["NOT_SCHEDULED", "SCHEDULED", "COMPLETED"].includes(normalizedFilter)) {
      candidates = candidates.filter(
        (c) => c.interviewStatus === normalizedFilter
      );
    }
  }

  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    candidates = candidates.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.studentNumber.includes(q) ||
        (c.branch && c.branch.toLowerCase().includes(q))
    );
  }

  const stats = {
    totalShortlisted: candidates.length,
    scheduled: candidates.filter((c) => c.interviewStatus === "SCHEDULED")
      .length,
    completed: candidates.filter((c) => c.interviewStatus === "COMPLETED")
      .length,
    notScheduled: candidates.filter(
      (c) => c.interviewStatus === "NOT_SCHEDULED"
    ).length,
  };

  return {
    domains: mentorDomains,
    domain: requestedDomain || "ALL",
    stats,
    candidates,
  };
};

// 2. PATCH /api/interviews/:studentOrAppId/schedule
export const scheduleCandidateInterview = async (
  mentorId,
  targetId,
  payload
) => {
  const mentor = await User.findById(mentorId).select("fullName domain domains role").lean();
  if (!mentor || mentor.role !== "MENTOR") {
    throw createServiceError("Mentor account not found", 404);
  }
  const mentorDomains = Array.isArray(mentor.domains) && mentor.domains.length
    ? mentor.domains
    : (mentor.domain ? [mentor.domain] : []);

  // Find by Application _id first; if not found, find by Student User _id
  let application = await Application.findById(targetId).populate(
    "student",
    "fullName email studentNumber domain"
  );

  if (!application) {
    const student = await User.findOne({ _id: targetId, role: "STUDENT", domain: { $in: mentorDomains } });
    if (!student) {
      throw createServiceError("Candidate or application not found", 404);
    }

    application = await Application.findOneAndUpdate(
      { student: student._id },
      {
        $setOnInsert: {
          student: student._id,
          domain: student.domain,
          whyJoin: "Scheduled directly by mentor",
        },
      },
      { upsert: true, new: true }
    ).populate("student", "fullName email studentNumber domain");
  }

  if (!application || !mentorDomains.includes(application.domain)) {
    throw createServiceError("Candidate is outside your assigned domains", 403);
  }

  const meetingLink =
    payload.mode === "ONLINE"
      ? payload.meetLinkOrVenue || generateJitsiLink(application.student?.fullName)
      : payload.meetLinkOrVenue || "Offline Campus Venue";

  application.stage = "INTERVIEW_SCHEDULED";
  application.interview = {
    scheduledAt: new Date(payload.scheduledAt),
    mode: payload.mode,
    meetLinkOrVenue: meetingLink,
    panelistName: payload.panelistName || mentor.fullName,
    instructions: payload.instructions || "",
    notificationsSent: false,
    participantsJoined: false,
    interviewConducted: false,
    interviewNotes: "",
    scores: {
      communication: null,
      technical: null,
      confidence: null,
      problemSolving: null,
    },
    score: null,
    feedback: "",
    decision: null,
    evaluatedBy: null,
    evaluatedAt: null,
    resultPublished: false,
    publishedAt: null,
  };

  await application.save();

  return application;
};

// 3. PATCH /api/interviews/:applicationId/workflow
export const updateInterviewWorkflow = async (applicationId, payload) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw createServiceError("Application not found", 404);
  }

  if (!application.interview?.scheduledAt) {
    throw createServiceError(
      "Schedule the interview before updating workflow steps",
      400
    );
  }

  if (payload.notificationsSent !== undefined) {
    application.interview.notificationsSent = payload.notificationsSent;
  }

  if (payload.participantsJoined !== undefined) {
    if (payload.participantsJoined && !application.interview.notificationsSent) {
      throw createServiceError(
        "Mark notifications sent before confirming participants joined",
        400
      );
    }
    application.interview.participantsJoined = payload.participantsJoined;
  }

  if (payload.interviewNotes !== undefined) {
    application.interview.interviewNotes = payload.interviewNotes;
  }

  if (payload.interviewConducted !== undefined) {
    if (payload.interviewConducted && !application.interview.participantsJoined) {
      throw createServiceError(
        "Confirm both participants joined before marking interview conducted",
        400
      );
    }
    application.interview.interviewConducted = payload.interviewConducted;
  }

  await application.save();
  return application;
};

// 4. PATCH /api/interviews/:applicationId/evaluate
export const evaluateCandidateInterview = async (
  mentorId,
  applicationId,
  payload
) => {
  const application = await Application.findById(applicationId);
  if (!application) {
    throw createServiceError("Application not found", 404);
  }

  const { communication, technical, confidence, problemSolving } =
    payload.scores;

  // Average of the 4 criteria (each out of 10), scaled out of 100
  const totalScore = Math.round(
    ((communication + technical + confidence + problemSolving) / 4) * 10
  );

  application.interview.scores = {
    communication,
    technical,
    confidence,
    problemSolving,
  };
  application.interview.score = totalScore;
  application.interview.feedback = payload.feedback || "";
  if (payload.interviewNotes !== undefined) {
    application.interview.interviewNotes = payload.interviewNotes;
  }
  application.interview.interviewConducted = true;
  application.interview.decision = payload.decision;
  application.interview.evaluatedBy = mentorId;
  application.interview.evaluatedAt = new Date();
  application.interview.resultPublished = false;

  await application.save();
  return application;
};

// 5. PATCH /api/interviews/:applicationId/publish
export const publishInterviewResult = async (applicationId) => {
  const application = await Application.findById(applicationId).populate(
    "student",
    "fullName email probationStatus"
  );

  if (!application) {
    throw createServiceError("Application not found", 404);
  }

  if (
    application.interview?.score === null ||
    !application.interview?.decision
  ) {
    throw createServiceError(
      "Save the candidate's evaluation before publishing the result",
      400
    );
  }

  application.interview.resultPublished = true;
  application.interview.publishedAt = new Date();

  const decision = application.interview.decision;

  if (decision === "SHORTLISTED") {
    application.stage = "PROBATION";
    await User.findByIdAndUpdate(application.student._id, {
      $set: { probationStatus: "ON_PROBATION" },
    });
  } else if (decision === "REJECTED") {
    application.stage = "REJECTED";
    await User.findByIdAndUpdate(application.student._id, {
      $set: { probationStatus: "REJECTED" },
    });
  }

  await application.save();
  return application;
};