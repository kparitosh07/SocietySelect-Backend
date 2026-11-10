import { registerStudent } from "../services/auth.service.js";
import { loginUser } from "../services/auth.service.js";

export const signup = async (req, res) => {
    try {
        const student = await registerStudent(req.body);

        return res.status(201).json({
            success: true,
            message: "Student registered successfully",
            data: student
        });

    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];

            return res.status(409).json({
                success: false,
                message: `${field || "Account"} already exists`
            });
        }

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Internal server error"
        });
    }
};

export const login = async (req, res) => {
    try {
        const result = await loginUser(req.body);

        const isProduction = process.env.NODE_ENV === "production";

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/api/auth"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",

            accessToken: result.accessToken,

            user: result.user
        });

    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.message
        });
    }
};
