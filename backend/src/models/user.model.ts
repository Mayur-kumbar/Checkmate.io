// src/models/user.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string | null;
  authProvider: "local" | "google";
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpire?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  passwordHash: {
    type: String,
    default: null,
  },

  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  verificationCode: {
    type: String,
    default: null,
  },

  verificationCodeExpire: {
    type: Date,
    default: null,
  },

  resetPasswordToken: {
    type: String,
    default: null,
  },

  resetPasswordExpire: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const UserModel = mongoose.model<IUser>("User", UserSchema);
