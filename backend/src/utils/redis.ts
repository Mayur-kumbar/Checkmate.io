import { createClient } from "redis";
import { ENV } from "../config/env";

export const redis = createClient({
  url: ENV.REDIS_URL
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.connect();
