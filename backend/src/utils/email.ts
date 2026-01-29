import transporter from "./transporter";
import { ENV } from "../config/env";

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        await transporter.sendMail({
            from: `"Checkmate.io" <${ENV.EMAIL_USER}>`,
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error("Email send failed:", error);
        throw new Error("Could not send email");
    }
};
