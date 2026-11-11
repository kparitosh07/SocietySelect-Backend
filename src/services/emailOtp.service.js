import crypto from "node:crypto";
import User from "../models/user.model.js";
import EmailOtp from "../models/emailOtp.model.js";
import { sendEmail } from "../config/email.config.js";
import { generateOTP, hashOTP, compareOTP } from "../utils/otp.util.js";

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;
const MAX_ATTEMPTS = 5;

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

export const sendVerificationOTP = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw createError("Account not found", 404);
    }
    if (user.isVerified) {
        throw createError("Email is already verified", 409);
    }

    const existingOTP = await EmailOtp.findOne({ email });
    if (
        existingOTP &&
        existingOTP.resendAvailableAt > new Date()
    ) {
        throw createError(
            "Please wait before requesting another OTP",
            429
        );
    }

    const otp = generateOTP();

    const otpHash = hashOTP(otp);

    const now = Date.now();

    await EmailOtp.findOneAndUpdate(
        { email },
        {
            $set: {
                otpHash,
                expiresAt: new Date(now + OTP_EXPIRY),
                resendAvailableAt: new Date(now + RESEND_COOLDOWN),
                attempts: 0
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true
        }
    );

    try {
        await sendEmail({
            to: email,
            subject: "Verify your SocietySelect AI account",
            text: `Your OTP is ${otp}. It expires in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
                <h2>SocietySelect AI</h2>
                <p>Your email verification code is:</p>

                <h1 style="
                    letter-spacing: 8px;
                    background: #f3f4f6;
                    padding: 16px;
                    text-align: center;
                ">${otp}</h1>

                <p>This code expires in 5 minutes.</p>
                <p>If you did not request this code, please ignore this email.</p>
                </div>
            `
        });

    } catch (error) {

        await EmailOtp.deleteOne({
            email,
            otpHash
        });

        console.error("OTP email delivery failed:", error.message);

        throw createError(
            "Unable to send verification email. Please try again.",
            503
        );
    }

    return {
        message: "Verification OTP sent successfully"
    };
};

export const verifyEmailOTP = async (email, enteredOTP) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw createError("Account not found", 404);
    }
    if (user.isVerified) {
        throw createError("Email is already verified", 409);
    }

    const otpRecord = await EmailOtp.findOne({ email })
        .select("+otpHash");

    if (!otpRecord) {
        throw createError("OTP not found. Request a new OTP.", 404);
    }

    if (otpRecord.expiresAt <= new Date()) {
        await EmailOtp.deleteOne({ _id: otpRecord._id });

        throw createError("OTP has expired. Request a new OTP.", 400);
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
        await EmailOtp.deleteOne({ _id: otpRecord._id });

        throw createError(
            "Maximum verification attempts exceeded. Request a new OTP.",
            429
        );
    }

    const isValid = compareOTP(
        enteredOTP,
        otpRecord.otpHash
    );

    if (!isValid) {

        const updatedOTP = await EmailOtp.findOneAndUpdate(
            {
                _id: otpRecord._id,
                attempts: otpRecord.attempts,
                expiresAt: { $gt: new Date() }
            },
            {
                $inc: { attempts: 1 }
            },
            { new: true }
        );

        if (!updatedOTP || updatedOTP.attempts >= MAX_ATTEMPTS) {
            await EmailOtp.deleteOne({ _id: otpRecord._id });

            throw createError(
                "Maximum verification attempts exceeded. Request a new OTP.",
                429
            );
        }

        throw createError("Invalid OTP", 400);
    }

    const updatedUser = await User.findOneAndUpdate(
        {
            _id: user._id,
            isVerified: false
        },
        {
            $set: { isVerified: true }
        },
        { new: true }
    );

    if (!updatedUser) {
        throw createError("Account verification failed", 409);
    }

    await EmailOtp.deleteOne({
        _id: otpRecord._id
    });

    return {
        message: "Email verified successfully",
        isVerified: true
    };
};