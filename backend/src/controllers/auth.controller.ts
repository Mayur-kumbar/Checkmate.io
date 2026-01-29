import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/user.model";
import { ENV } from "../config/env";
import { redis } from "../utils/redis";
import { sendEmail } from "../utils/email";
import { AuthRequest } from "../middleware/auth.middleware";
import { signToken } from "../utils/jwt";

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

const cookieOptions: any = {
  httpOnly: true,
  secure: false, // Force false for local http testing
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL * 1000,
};

// Helper to create session and set cookie
const createSession = async (res: Response, userId: string) => {
  const sessionId = crypto.randomUUID();

  // Store session: session:ID -> userId
  await redis.set(`session:${sessionId}`, userId, { EX: SESSION_TTL });

  // Track session for "logout everywhere": user_sessions:userId -> Set of sessionIds
  await redis.sAdd(`user_sessions:${userId}`, sessionId);
  await redis.expire(`user_sessions:${userId}`, SESSION_TTL);

  const token = signToken(sessionId);
  res.cookie("token", token, cookieOptions);

  return sessionId;
};

// 1. Email-First Signup: INIT
export const handleSignupInit = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });

    const existingUser = await UserModel.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ success: false, error: "Account already exists with this email" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store code in redis for 10 mins
    await redis.set(`verify:${email.toLowerCase()}`, code, { EX: 600 });

    await sendEmail(
      email,
      "Verify your Checkmate.io Account",
      `<h1>Your verification code is: ${code}</h1><p>Code expires in 10 minutes.</p>`
    );

    res.status(200).json({ success: true, message: "Verification code sent to email" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Email-First Signup: VERIFY
export const handleSignupVerify = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: "Email and code are required" });

    const savedCode = await redis.get(`verify:${email.toLowerCase()}`);
    if (!savedCode || savedCode !== code) {
      return res.status(400).json({ success: false, error: "Invalid or expired verification code" });
    }

    // Generate a temporary completion token
    const completeToken = crypto.randomBytes(32).toString("hex");
    await redis.set(`complete_token:${completeToken}`, email.toLowerCase(), { EX: 1800 }); // 30 mins

    res.status(200).json({ success: true, completeToken });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Email-First Signup: COMPLETE
export const handleSignupComplete = async (req: Request, res: Response) => {
  try {
    const { completeToken, username, password } = req.body;
    if (!completeToken || !username || !password) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const email = await redis.get(`complete_token:${completeToken}`);
    if (!email) {
      return res.status(400).json({ success: false, error: "Signup session expired" });
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ success: false, error: "Username must be alphanumeric (only letters and numbers)" });
    }

    const existingUsername = await UserModel.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ success: false, error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Upsert user (might have been partially created in init if we chose to)
    const user = await UserModel.findOneAndUpdate(
      { email },
      {
        username,
        passwordHash,
        isVerified: true,
        authProvider: "local"
      },
      { upsert: true, new: true }
    );

    await createSession(res, user._id.toString());
    await redis.del(`complete_token:${completeToken}`);
    await redis.del(`verify:${email}`);

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 4. LOGIN: Email or Username
export const handleLogin = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: "Identifier and password are required" });
    }

    const user = await UserModel.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user || user.authProvider !== "local" || !user.isVerified) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash!);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    await createSession(res, user._id.toString());

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 5. GET ME
export const getMe = async (req: AuthRequest, res: Response) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

// 6. LOGOUT SINGLE
export const handleLogout = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, user } = req;
    if (sessionId) {
      await redis.del(`session:${sessionId}`);
      if (user) {
        await redis.sRem(`user_sessions:${user._id}`, sessionId);
      }
    }
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 7. LOGOUT EVERYWHERE
export const handleLogoutAll = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const sessions = await redis.sMembers(`user_sessions:${userId}`);

    for (const sid of sessions) {
      await redis.del(`session:${sid}`);
    }
    await redis.del(`user_sessions:${userId}`);

    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out from all devices" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 8. FORGOT PASSWORD
export const handleForgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email: email.toLowerCase(), isVerified: true });

    if (!user) {
      // Don't reveal if user exists or not for security, but in this context maybe return success
      return res.status(200).json({ success: true, message: "If an account exists, a reset link has been sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In a real app, send a link. Here just send the token as a "code" for simplicity or a full link if requested.
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetToken}`;

    await sendEmail(
      user.email,
      "Password Reset Request",
      `<h1>Reset your password</h1><p>Click <a href="${resetUrl}">here</a> to reset. Link expires in 1 hour.</p>`
    );

    res.status(200).json({ success: true, message: "Reset link sent to email" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 9. RESET PASSWORD
export const handleResetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid or expired reset token" });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Optionally, invalidate all sessions on password change
    const sessions = await redis.sMembers(`user_sessions:${user._id}`);
    for (const sid of sessions) {
      await redis.del(`session:${sid}`);
    }
    await redis.del(`user_sessions:${user._id}`);

    res.status(200).json({ success: true, message: "Password updated successfully. Please log in again." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 10. CHECK USERNAME AVAILABILITY
export const handleCheckUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ success: false, error: "Username query parameter is required" });
    }

    const usernameRegex = /^[a-zA-Z0-9]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ success: false, error: "Username must be alphanumeric" });
    }

    const user = await UserModel.findOne({ username });
    if (user) {
      return res.status(200).json({ success: true, available: false });
    }

    res.status(200).json({ success: true, available: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};