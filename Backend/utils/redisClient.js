import Redis from "ioredis";
import { config } from "dotenv";

config({ path: "./config/config.env" });

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

console.log(`[Redis] Initializing client connection to ${redisUrl}...`);

const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Retry connection after a delay
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redisClient.on("connect", () => {
  console.log("⚡ [Redis] Client connected successfully!");
});

redisClient.on("error", (err) => {
  console.error("🚨 [Redis] Client connection error:", err.message);
});

export default redisClient;
