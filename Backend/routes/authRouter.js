import { config } from 'dotenv';
config({ path: './config/config.env' });


import express from "express";
import { forgotPassword, getUser, login, logout, register, resetPassword, updatePassword, verifyOTP } from "../controllers/authController.js";
import { isAuthenticated } from '../middlewares/authMiddlewares.js';

const router = express.Router();

import nodeMailer from "nodemailer";

router.get("/test-smtp", async (req, res) => {
    try {
        const configDetails = {
            SMTP_HOST: process.env.SMTP_HOST || "NOT SET",
            SMTP_PORT: process.env.SMTP_PORT || "NOT SET",
            SMTP_SERVICE: process.env.SMTP_SERVICE || "NOT SET",
            SMTP_MAIL: process.env.SMTP_MAIL ? "SET" : "NOT SET",
            SMTP_PASSWORD: process.env.SMTP_PASSWORD ? "SET" : "NOT SET",
        };

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

        await transporter.verify();
        return res.json({
            success: true,
            message: "SMTP Transporter verified successfully!",
            config: configDetails
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "SMTP verification failed",
            error: err.message,
            config: {
                SMTP_HOST: process.env.SMTP_HOST || "NOT SET",
                SMTP_PORT: process.env.SMTP_PORT || "NOT SET",
                SMTP_SERVICE: process.env.SMTP_SERVICE || "NOT SET",
                SMTP_MAIL: process.env.SMTP_MAIL ? "SET" : "NOT SET",
                SMTP_PASSWORD: process.env.SMTP_PASSWORD ? "SET" : "NOT SET",
            }
        });
    }
});

router.post("/register", register);
router.post("/verify_otp", verifyOTP);
router.post("/login", login);
router.get("/logout",isAuthenticated, logout);
router.get("/me",isAuthenticated, getUser);
router.post("/password/forgot", forgotPassword);
router.put("/password/reset/:token", resetPassword);
router.put("/password/update",isAuthenticated , updatePassword);


export default router;