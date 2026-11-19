import * as notificationService from "../services/notification.service.js";

export const listMyNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query?.limit) || 40, 100);
    const data = await notificationService.getStudentNotifications(
      req.user.id,
      limit
    );
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const markOneRead = async (req, res, next) => {
  try {
    const data = await notificationService.markNotificationAsRead(
      req.user.id,
      req.params.notificationId
    );
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    const data = await notificationService.markAllNotificationsAsRead(
      req.user.id
    );
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};