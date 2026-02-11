import { Request, Response } from "express";
import { GameModel } from "../models/game.model";
import { UserModel } from "../models/user.model";
import { AuthRequest } from "../middleware/auth.middleware";

// 1. Get User Profile by Username (Public)
export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ success: false, error: "Username is required" });
        }
        const user = await UserModel.findOne({ username: username as string }).select("username email wins losses draws createdAt");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Get User Games (Paginated)
export const getUserGames = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const query = {
            $or: [{ white: userId }, { black: userId }]
        } as any;

        const games = await GameModel.find(query)
            .sort({ createdAt: -1 } as any)
            .skip(skip)
            .limit(limit);

        const total = await GameModel.countDocuments(query);

        res.status(200).json({
            success: true,
            games,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Legacy or helper for games played (can be replaced by getUserGames)
export const handleGamesPlayed = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            })
        }

        const gamesPlayed = await GameModel.find({
            $or: [{ white: userId }, { black: userId }]
        });

        return res.status(200).json({
            success: true,
            data: gamesPlayed
        })
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message
        })
    }
}

