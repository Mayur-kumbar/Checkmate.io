import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "../config/env";
import { redis } from "../utils/redis";
import { UserModel, IUser } from "../models/user.model";

export interface AuthRequest extends Request {
    user?: IUser;
    sessionId?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Not logged in"
        });
    }

    try {
        const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
        const userId = await redis.get(`session:${decoded.sessionId}`);

        if (!userId) {
            res.clearCookie("token");
            return res.status(401).json({
                success: false,
                error: "Session expired or invalidated"
            });
        }

        const user = await UserModel.findById(userId).select("-passwordHash");
        if (!user) {
            res.clearCookie("token");
            return res.status(401).json({
                success: false,
                error: "User no longer exists"
            });
        }

        req.user = user;
        req.sessionId = decoded.sessionId;
        next();
    } catch (error) {
        res.clearCookie("token");
        return res.status(401).json({
            success: false,
            error: "Invalid session"
        });
    }
};
