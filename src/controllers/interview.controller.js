import * as interviewService from "../services/interview.service.js";

export const getCandidates = async (req, res) => {
  try {
    const { status, search, domain, allDomains } = req.query;
    const data = await interviewService.listInterviewCandidates(req.user.id, {
      status,
      search,
      domain,
      allDomains,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const scheduleInterview = async (req, res) => {
  try {
    const application = await interviewService.scheduleCandidateInterview(
      req.user.id,
      req.params.applicationId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Interview scheduled successfully",
      application,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateWorkflow = async (req, res) => {
  try {
    const application = await interviewService.updateInterviewWorkflow(
      req.params.applicationId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Interview workflow updated",
      application,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const evaluateCandidate = async (req, res) => {
  try {
    const application = await interviewService.evaluateCandidateInterview(
      req.user.id,
      req.params.applicationId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: "Evaluation saved successfully",
      application,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const publishResult = async (req, res) => {
  try {
    const application = await interviewService.publishInterviewResult(
      req.params.applicationId
    );
    return res.status(200).json({
      success: true,
      message: `Interview result published (${application.interview.decision})`,
      application,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};