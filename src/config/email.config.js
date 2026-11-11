import { BrevoClient } from "@getbrevo/brevo";

const apiKey = process.env.BREVO_API_KEY;

if (!apiKey) {
    throw new Error("BREVO_API_KEY is missing. Check your .env file.");
}

const brevo = new BrevoClient({apiKey});

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const result = await brevo.transactionalEmails.sendTransacEmail({
            sender: {
                name: process.env.MAIL_FROM_NAME || "SocietySelect AI",
                email: process.env.MAIL_FROM
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text
        });

        return result;
    } catch (error) {
        console.error("Brevo email error:", error);
        const emailError = new Error(
            "Unable to send verification email."
        );
        emailError.statusCode = 503;
        throw emailError;
    }
};
