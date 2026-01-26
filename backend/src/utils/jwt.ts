import jwt from "jsonwebtoken";
import { ENV } from "../config/env";


export function signToken(userId: string) {
  return jwt.sign({ userId }, ENV.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, ENV.JWT_SECRET) as { userId: string };
}