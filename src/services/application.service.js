import Application from "../models/application.model.js";

export const createOrUpdateApplication = async (studentId, payload) => {
  const existing = await Application.findOne({ student: studentId });

  if (existing && existing.stage !== "APPLIED") {
    const error = new Error(
      `Application is already in ${existing.stage} stage and cannot be edited.`
    );
    error.statusCode = 400;
    throw error;
  }

  const application = await Application.findOneAndUpdate(
    { student: studentId },
    {
      $set: {
        student: studentId,
        societyName: payload.societyName || "Big Data Centre of Excellence",
        domain: payload.domain,
        whyJoin: payload.whyJoin,
        experience: payload.experience || "",
        githubUrl: payload.githubUrl || "",
        portfolioUrl: payload.portfolioUrl || "",
        resumeUrl: payload.resumeUrl || "",
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  return application;
};

export const getMyApplicationStatus = async (studentId) => {
  const application = await Application.findOne({ student: studentId })
    .populate("student", "fullName email studentNumber domain branch year")
    .lean();

  if (!application) {
    return { hasApplied: false, stage: "NOT_APPLIED", application: null };
  }

  return { hasApplied: true, stage: application.stage, application };
};

export const getMyInterviewDetails = async (studentId) => {
  const application = await Application.findOne({ student: studentId })
    .select("societyName domain stage interview updatedAt")
    .lean();

  if (!application) {
    return { scheduled: false, interview: null };
  }

  return {
    scheduled: Boolean(application.interview?.scheduledAt),
    stage: application.stage,
    domain: application.domain,
    interview: application.interview || null,
  };
};