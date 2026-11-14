import * as taskService from "../services/task.service.js";

export const listMyTasks = async (req, res, next) => {
    try {
        const data = await taskService.getTasksForStudent(req.user.id);
        res.status(200).json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};

export const submitTask = async (req, res, next) => {
    try {
        const submission = await taskService.submitStudentProject(
            req.params.taskId,
            req.user.id,
            req.body
        );
        res.status(200).json({
            success: true,
            message: "Project submitted successfully",
            submission,
        });
    } catch (err) {
        next(err);
    }
};