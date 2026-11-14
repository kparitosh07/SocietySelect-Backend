import * as profileService from "../services/profile.service.js";

export const getMyProfile = async (req, res, next) => {
    try {
        const user = await profileService.getStudentProfile(req.user.id);
        res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

export const updateMyProfile = async (req, res, next) => {
    try {
        const user = await profileService.updateStudentProfile(req.user.id, req.body);
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user,
        });
    } catch (err) {
        next(err);
    }
};

export const changeMyPassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        await profileService.updateStudentPassword(req.user.id, currentPassword, newPassword);
        res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        next(err);
    }
};