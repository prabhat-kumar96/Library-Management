import * as Sentry from "@sentry/node";
import { config } from "dotenv";

// Load environment variables before Sentry initialization
config({ path: "./config/config.env" });

Sentry.init({
  dsn: process.env.SENTRY_BACKEND_DSN,
  tracesSampleRate: 1.0,
});
