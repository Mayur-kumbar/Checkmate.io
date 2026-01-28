// src/routes/auth.routes.ts
import { Router } from "express";
import { handleLogin, handleSignup } from "../controllers/auth.controller";


const router = Router();

router.post("/signup", handleSignup);

router.post("/login", handleLogin);

export default router;
