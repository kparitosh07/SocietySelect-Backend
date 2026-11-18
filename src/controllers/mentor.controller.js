import * as mentorService from "../services/mentor.service.js";

export const getDashboard = async (req, res) => {
  try {
    const data = await mentorService.getMentorDashboardData(req.user.id);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStudents = async (req, res) => {
  try {
    const { search, status } = req.query;
    const data = await mentorService.getAssignedStudents(req.user.id, {
      search,
      probationStatus: status,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const data = await mentorService.getStudentDetailForMentor(
      req.user.id,
      req.params.studentId
    );
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateStudentStatus = async (req, res) => {
  try {
    const student = await mentorService.updateStudentProbationStatus(
      req.user.id,
      req.params.studentId,
      req.body.probationStatus
    );
    return res.status(200).json({
      success: true,
      message: "Student probation status updated successfully",
      student,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createTask = async (req, res) => {
  try {
    const task = await mentorService.createDomainTask(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: "Task created and assigned to domain successfully",
      task,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const listDomainTasks = async (req, res) => {
  try {
    const data = await mentorService.listDomainTasksWithSubmissions(req.user.id);
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    const submission = await mentorService.gradeStudentSubmission(
      req.user.id,
      req.params.taskId,
      req.params.studentId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Submission reviewed successfully",
      submission,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};