
import crypto from "node:crypto";
import User from "../models/user.model.js";
import EmailOtp from "../models/emailOtp.model.js";
import { sendEmail } from "../config/email.config.js";
import {
    generateOTP,
    hashOTP,
    compareOTP
} from "../utils/otp.util.js";

const OTP_EXPIRY = 5 * 60 * 1000;
const RESEND_COOLDOWN = 60 * 1000;
const VERIFICATION_TOKEN_EXPIRY = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizeEmail = (email) =>
    email.trim().toLowerCase();

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

export const sendVerificationOTP = async (email) => {
    email = normalizeEmail(email);

    if (!email.endsWith("@akgec.ac.in")) {
        throw createError("Use your official AKGEC email", 400);
    }

    const existingUser = await User.findOne({ email });

    if (existingUser?.isVerified) {
        throw createError("Email is already registered", 409);
    }

    const existingOTP = await EmailOtp.findOne({ email });

    if (
        existingOTP &&
        existingOTP.resendAvailableAt > new Date()
    ) {
        throw createError(
            "Please wait before requesting another OTP",429
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
                attempts: 0,
                verifiedAt: null,
                verificationTokenHash: null
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
            subject: "SocietySelect AI - Email Verification",
            text: `Your OTP is ${otp}. It expires in 5 minutes.`,
            html: `
        <div style="font-family:Arial;max-width:500px;margin:auto">
          <h2>SocietySelect AI</h2>
          <p>Your email verification code is:</p>
          <h1 style="letter-spacing:8px">${otp}</h1>
          <p>This OTP expires in 5 minutes.</p>
        </div>
      `
        });
    } catch (error) {
        await EmailOtp.deleteOne({ email, otpHash });

        console.error("OTP delivery failed:", error.message);

        throw createError(
            "Unable to send OTP. Please try again.",
            503
        );
    }

    return {
        message: "OTP sent successfully"
    };
};

export const verifyEmailOTP = async (email, enteredOTP) => {
    email = normalizeEmail(email);

    const existingUser = await User.findOne({ email });

    if (existingUser?.isVerified) {
        throw createError("Email is already registered", 409);
    }

    const otpRecord = await EmailOtp.findOne({ email })
        .select("+otpHash");

    if (!otpRecord) {
        throw createError("OTP not found. Request a new OTP.", 404);
    }

    if (otpRecord.verifiedAt) {
        throw createError("Email is already verified. Complete signup.", 409);
    }

    if (otpRecord.expiresAt <= new Date()) {
        await EmailOtp.deleteOne({ _id: otpRecord._id });

        throw createError("OTP expired. Request a new OTP.", 400);
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
        await EmailOtp.deleteOne({ _id: otpRecord._id });

        throw createError(
            "Maximum attempts exceeded. Request a new OTP.",
            429
        );
    }

    const isValid = compareOTP(
        enteredOTP,
        otpRecord.otpHash
    );

    if (!isValid) {
        const updated = await EmailOtp.findOneAndUpdate(
            {
                _id: otpRecord._id,
                attempts: otpRecord.attempts,
                verifiedAt: null,
                expiresAt: { $gt: new Date() }
            },
            { $inc: { attempts: 1 } },
            { new: true }
        );

        if (!updated || updated.attempts >= MAX_ATTEMPTS) {
            await EmailOtp.deleteOne({ _id: otpRecord._id });

            throw createError(
                "Maximum attempts exceeded. Request a new OTP.",
                429
            );
        }

        throw createError("Invalid OTP", 400);
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const updatedRecord = await EmailOtp.findOneAndUpdate(
        {
            _id: otpRecord._id,
            attempts: otpRecord.attempts,
            verifiedAt: null,
            expiresAt: { $gt: new Date() }
        },
        {
            $set: {
                verifiedAt: new Date(),
                verificationTokenHash: hashToken(verificationToken),
                expiresAt: new Date(
                    Date.now() + VERIFICATION_TOKEN_EXPIRY
                )
            }
        },
        { new: true }
    );

    if (!updatedRecord) {
        throw createError("OTP verification failed. Try again.", 409);
    }

    return {
        message: "Email verified successfully",
        isVerified: true,
        verificationToken
    };
};

export const consumeEmailVerificationToken = async (
    email,
    verificationToken
) => {
    email = normalizeEmail(email);

    if (!verificationToken) {
        throw createError("Please verify your email first", 403);
    }

    const record = await EmailOtp.findOneAndDelete({
        email,
        verificationTokenHash: hashToken(verificationToken),
        verifiedAt: { $ne: null },
        expiresAt: { $gt: new Date() }
    });

    if (!record) {
        throw createError(
            "Email verification expired or invalid. Verify again.",
            403
        );
    }

    return true;
};
