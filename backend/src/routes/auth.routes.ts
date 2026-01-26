// src/routes/auth.routes.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";
import { signToken } from "../utils/jwt";

const router = Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await UserModel.findOne({ username });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user._id.toString());
  res.json({ token });
});

export default router;
