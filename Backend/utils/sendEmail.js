import nodeMailer from "nodemailer";

export const sendEmail = async ({ email, subject, message }) => {
    if (process.env.BREVO_API_KEY) {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                sender: { email: process.env.SMTP_MAIL },
                to: [{ email }],
                subject,
                htmlContent: message,
            }),
        });

        if (!response.ok) {
            let errorMessage = "Brevo email API request failed";

            try {
                const errorBody = await response.json();
                errorMessage = errorBody.message || errorBody.error || JSON.stringify(errorBody);
            } catch {
                errorMessage = await response.text();
            }

            throw new Error(errorMessage);
        }

        return;
    }

    const transporter = nodeMailer.createTransport({
        host: process.env.SMTP_HOST,
        service: process.env.SMTP_SERVICE,
        port: process.env.SMTP_PORT,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html: message,
    };

    await transporter.sendMail(mailOptions);
};
