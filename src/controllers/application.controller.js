import * as applicationService from "../services/application.service.js";

export const submitApplication = async (req, res, next) => {
  try {
    const application = await applicationService.createOrUpdateApplication(
      req.user.id,
      req.body
    );
    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
    });
  } catch (err) {
    next(err);
  }
};

export const getTrackingStatus = async (req, res, next) => {
  try {
    const data = await applicationService.getMyApplicationStatus(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const getInterviewSlot = async (req, res, next) => {
  try {
    const data = await applicationService.getMyInterviewDetails(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};