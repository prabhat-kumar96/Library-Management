import "./instrument.js"; // 👈 Always load this first line alone!
import express from "express";
import { config } from "dotenv";
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { connectDB } from './database/db.js';
import { errorMiddleware } from './middlewares/errorMiddlewares.js';
import fileUpload from "express-fileupload";
import * as Sentry from "@sentry/node";

// Routers
import authRouter from './routes/authRouter.js';
import bookRouter from './routes/bookRouter.js';
import borrowRouter from './routes/borrowRouter.js';
import userRouter from './routes/userRouter.js';
import requestRouter from './routes/requestRouter.js';
import paymentRouter from './routes/paymentRouter.js';
import aiRouter from './routes/aiRouter.js';

// Services
import { notifyUsers } from './services/notifyUsers.js';
import { removeUnverifiedAccounts } from './services/removeUnverifiedAccounts.js';

import { stripeWebhookHandler } from './controllers/paymentController.js';

config({ path: './config/config.env' });

export const app = express();

// Middlewares
const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));
app.use(cookieParser());

// Stripe Webhooks (must be defined BEFORE express.json() to get the raw body)
app.post("/api/v1/payment/webhook", express.raw({ type: 'application/json' }), stripeWebhookHandler);
app.post("/api/payments/webhook", express.raw({ type: 'application/json' }), stripeWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
}));

// Test route to verify Sentry is capturing exceptions
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// API Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/book", bookRouter);
app.use("/api/v1/borrow", borrowRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/request", requestRouter);
app.use("/api/v1/payment", paymentRouter);
app.use("/api/payments", paymentRouter);


// 🤖 AI Librarian & Recommendation Engine Routers
app.use("/api/ai", aiRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/user", aiRouter);
app.use("/api/v1/user", aiRouter);

// Initialization
notifyUsers();
removeUnverifiedAccounts();
connectDB();

// Sentry error handler must be registered before any other error middleware
Sentry.setupExpressErrorHandler(app);

app.use(errorMiddleware);