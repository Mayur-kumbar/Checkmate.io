// src/routes/auth.routes.ts
import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// Signup flow
router.post("/signup/init", auth.handleSignupInit);
router.post("/signup/verify", auth.handleSignupVerify);
router.post("/signup/complete", auth.handleSignupComplete);
router.get("/check-username", auth.handleCheckUsername);

// Login
router.post("/login", auth.handleLogin);

// Protected routes
router.get("/me", protect, auth.getMe);
router.post("/logout", protect, auth.handleLogout);
router.post("/logout-all", protect, auth.handleLogoutAll);

// Password recovery
router.post("/forgot-password", auth.handleForgotPassword);
router.post("/reset-password", auth.handleResetPassword);

export default router;
