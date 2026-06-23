import { generateVerificationOtpEmailTemplate } from "./emailTemplates.js";
import { sendEmail } from "./sendEmail.js";


export async function sendVerificationCode(verificationCode,email,res){
    try {
       const message = generateVerificationOtpEmailTemplate(verificationCode);
       await sendEmail({
        email: email,
        subject: "verification code (Bookworm Library management system)",
        message,
       });
       res.status(200)
       .json({
        success: true,
        message: "Verificaion code send successfully."
       })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Verification code failed to send."
        })
    }
}