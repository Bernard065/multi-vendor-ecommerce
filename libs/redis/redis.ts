import "dotenv/config";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  connectTimeout: 10000,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis error:", err));
redis.on("reconnecting", () => console.log("Reconnecting to Redis..."));

process.on("SIGINT", async () => {
  await redis.quit();
  console.log("Redis connection closed");
  process.exit(0);
});

export default redis;