import jwt from "jsonwebtoken";
import { ENV } from "../config/env";

export function signToken(sessionId: string) {
  return jwt.sign({ sessionId }, ENV.JWT_SECRET, { expiresIn: "7d" });
}