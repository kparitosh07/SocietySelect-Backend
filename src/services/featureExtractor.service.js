import User from "../models/user.model.js";
import Application from "../models/application.model.js";
import Task from "../models/task.model.js";
import ExamResult from "../models/examResult.model.js";

const extractGithubUsername = (username, ...urls) => {
  if (username && username.trim()) {
    return username.trim().replace(/^@/, "");
  }

  for (const url of urls) {
    if (!url) continue;
    const match = url.match(/github\.com\/([A-Za-z0-9-]+)(?:\/|$|\?)/i);
    if (match?.[1]) return match[1];
  }

  return null;
};

const computeGithubActivityScore = async ({
  githubUsername,
  userGithubUrl,
  appGithubUrl,
}) => {
  const handle = extractGithubUsername(githubUsername, userGithubUrl, appGithubUrl);
  if (!handle) return null;

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "SocietySelect-Backend",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };

  const [profileRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${handle}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    }),
    fetch(`https://api.github.com/users/${handle}/events/public?per_page=100`, {
      headers,
      signal: AbortSignal.timeout(5000),
    }),
  ]);

  if (!profileRes.ok) return null;

  const profile = await profileRes.json();
  const events = eventsRes.ok ? await eventsRes.json() : [];

  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentEvents = Array.isArray(events)
    ? events.filter((e) => new Date(e.created_at).getTime() >= cutoff)
    : [];

  const pushAndPrCount = recentEvents.filter((e) =>
    ["PushEvent", "PullRequestEvent", "CreateEvent"].includes(e.type)
  ).length;

  const activityPoints = Math.min(pushAndPrCount / 30, 1) * 50;
  const repoPoints = Math.min((profile.public_repos || 0) / 15, 1) * 35;
  const followerPoints = Math.min((profile.followers || 0) / 20, 1) * 15;

  return Number((activityPoints + repoPoints + followerPoints).toFixed(2));
};

const getExamScore = async (studentId) => {
  const results = await ExamResult.find({
    studentId,
    submissionStatus: "SUBMITTED",
  })
    .select("marksObtained totalMarks")
    .lean();

  if (results.length === 0) return null;

  const validScores = results
    .filter((r) => typeof r.marksObtained === "number" && r.totalMarks > 0)
    .map((r) => Math.min((r.marksObtained / r.totalMarks) * 100, 100));

  if (validScores.length === 0) return null;

  const avg = validScores.reduce((sum, val) => sum + val, 0) / validScores.length;
  return Number(avg.toFixed(2));
};

const getInterviewScore = (application) => {
  const interview = application?.interview;
  if (!interview) return null;

  if (typeof interview.score === "number") {
    return interview.score;
  }

  const s = interview.scores;
  if (!s) return null;

  const parts = [s.communication, s.technical, s.confidence, s.problemSolving];
  if (parts.every((val) => typeof val === "number")) {
    const sum = parts.reduce((acc, val) => acc + val, 0);
    return Number(((sum / 40) * 100).toFixed(2));
  }

  return null;
};

const getTaskMetrics = async (studentId, domain) => {
  if (!domain) {
    return { task_completion: null, project_score: null };
  }

  const tasks = await Task.find({ domain }).select("maxMarks submissions").lean();
  if (tasks.length === 0) {
    return { task_completion: null, project_score: null };
  }

  let completedCount = 0;
  const gradedPercentages = [];

  for (const task of tasks) {
    const sub = task.submissions.find(
      (entry) => entry.student.toString() === studentId.toString()
    );
    if (!sub) continue;

    if (sub.status === "SUBMITTED" || sub.status === "GRADED") {
      completedCount += 1;
    }

    if (
      sub.status === "GRADED" &&
      typeof sub.marksObtained === "number" &&
      task.maxMarks > 0
    ) {
      const pct = Math.min((sub.marksObtained / task.maxMarks) * 100, 100);
      gradedPercentages.push(pct);
    }
  }

  const task_completion = Number(((completedCount / tasks.length) * 100).toFixed(2));
  const project_score =
    gradedPercentages.length > 0
      ? Number(
          (
            gradedPercentages.reduce((sum, val) => sum + val, 0) /
            gradedPercentages.length
          ).toFixed(2)
        )
      : null;

  return { task_completion, project_score };
};

export const buildStudentFeatureVector = async (studentId, overrides = {}) => {
  const [student, application] = await Promise.all([
    User.findById(studentId).lean(),
    Application.findOne({ student: studentId }).lean(),
  ]);

  if (!student || student.role !== "STUDENT") {
    const err = new Error("Student not found");
    err.statusCode = 404;
    throw err;
  }

  const domain = student.domain || application?.domain;

  const [taskMetrics, computedGithubScore, computedExamScore] = await Promise.all([
    getTaskMetrics(studentId, domain),
    typeof overrides.github_activity_score === "number"
      ? overrides.github_activity_score
      : computeGithubActivityScore({
          githubUsername: student.githubUsername,
          userGithubUrl: student.githubUrl,
          appGithubUrl: application?.githubUrl,
        }),
    typeof overrides.exam_score === "number"
      ? overrides.exam_score
      : getExamScore(studentId),
  ]);

  const features = {
    exam_score: computedExamScore,
    interview_score: overrides.interview_score ?? getInterviewScore(application),
    project_score: overrides.project_score ?? taskMetrics.project_score,
    task_completion: overrides.task_completion ?? taskMetrics.task_completion,
    github_activity_score: computedGithubScore,
  };

  const missingFields = Object.entries(features)
    .filter(([, val]) => typeof val !== "number" || Number.isNaN(val))
    .map(([key]) => key);

  if (missingFields.length > 0) {
    const err = new Error(
      `Cannot generate prediction; missing scores: ${missingFields.join(", ")}`
    );
    err.statusCode = 422;
    err.missingFields = missingFields;
    throw err;
  }

  return features;
};