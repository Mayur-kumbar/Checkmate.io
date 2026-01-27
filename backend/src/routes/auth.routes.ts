// src/routes/auth.routes.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";
import { signToken } from "../utils/jwt";

const router = Router();

router.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await UserModel.findOne({ username });
  if (existingUser)
    return res.status(400).json({ error: "Username already taken" });
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = new UserModel({ username, passwordHash });
  await newUser.save();
  const token = signToken(newUser._id.toString());
  res.json({ token });
});

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
