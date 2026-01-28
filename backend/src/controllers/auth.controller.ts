import { UserModel } from "../models/user.model";
import bcrypt from "bcrypt";
import { signToken } from "../utils/jwt";
import { Request, Response } from "express";

const handleSignup = async (req: Request, res: Response) => {

  const { username, email, password } = req.body;

  const existingUser = await UserModel.findOne({ username });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: "Username already taken"
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = new UserModel({ username, email, passwordHash });
  await newUser.save();

  const token = signToken(newUser._id.toString());
  res.status(201).json({
    success: true,
    token
  });

}

const handleLogin = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const user = await UserModel.findOne({ username });
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Invalid credentials"
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({
      success: false,
      error: "Invalid credentials"
    });
  }

  const token = signToken(user._id.toString());
  res.status(200).json({
    success: true,
    token
  });
}

export {
  handleSignup,
  handleLogin
}