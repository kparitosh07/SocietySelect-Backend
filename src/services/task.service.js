import Task from "../models/task.model.js";
import User from "../models/user.model.js";

export const getTasksForStudent = async (studentId) => {
    const student = await User.findById(studentId).select("domain probationStatus").lean();
    if (!student) throw new Error("Student not found");

    const tasks = await Task.find({ domain: student.domain }).sort({ deadline: 1 }).lean();

    const formattedTasks = tasks.map(({ submissions, ...task }) => ({
        ...task,
        mySubmission:
            submissions.find((s) => String(s.student) === String(studentId)) || null,
    }));

    const completedCount = formattedTasks.filter((t) => Boolean(t.mySubmission)).length;
    const gradedSubmissions = formattedTasks
        .map((t) => t.mySubmission)
        .filter((s) => s && s.marksObtained !== null);

    const avgScore = gradedSubmissions.length
        ? Math.round(
            gradedSubmissions.reduce((sum, s) => sum + s.marksObtained, 0) /
            gradedSubmissions.length
        )
        : 0;

    return {
        probationStatus: student.probationStatus || "APPLICANT",
        domain: student.domain,
        totalTasks: formattedTasks.length,
        completedCount,
        avgScore,
        tasks: formattedTasks,
    };
};

export const submitStudentProject = async (taskId, studentId, payload) => {
    const task = await Task.findById(taskId);
    if (!task) {
        const error = new Error("Task not found");
        error.statusCode = 404;
        throw error;
    }

    const existingIdx = task.submissions.findIndex(
        (s) => String(s.student) === String(studentId)
    );

    if (existingIdx >= 0) {
        task.submissions[existingIdx].repoUrl = payload.repoUrl;
        task.submissions[existingIdx].liveUrl = payload.liveUrl || "";
        task.submissions[existingIdx].notes = payload.notes || "";
        task.submissions[existingIdx].status = "SUBMITTED";
        task.submissions[existingIdx].submittedAt = new Date();
    } else {
        task.submissions.push({
            student: studentId,
            repoUrl: payload.repoUrl,
            liveUrl: payload.liveUrl || "",
            notes: payload.notes || "",
        });
    }

    await task.save();
    return task.submissions.find((s) => String(s.student) === String(studentId));
};