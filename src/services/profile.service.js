import bcrypt from "bcrypt";
import User from "../models/user.model.js";

export const getStudentProfile = async (userId) => {
    const user = await User.findById(userId).select("-password");
    if (!user) {
        const error = new Error("Student profile not found");
        error.statusCode = 404;
        throw error;
    }
    return user;
};

export const updateStudentProfile = async (userId, updateData) => {
    const allowedFields = [
        "fullName",
        "domain",
        "branch",
        "year",
        "phone",
        "bio",
        "skills",
        "githubUsername",
    ];

    const sanitizedUpdate = {};
    for (const key of allowedFields) {
        if (updateData[key] !== undefined) {
            sanitizedUpdate[key] = updateData[key];
        }
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { $set: sanitizedUpdate },
        { new: true, runValidators: true }
    ).select("-password");

    return user;
};

export const updateStudentPassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId).select("+password");
    if (!user || !user.password) {
        throw new Error("Account uses Google Sign-In or has no password set");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new Error("Incorrect current password");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return true;
};