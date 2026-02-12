import { Response } from "express";
import { GameService } from "../services/game.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const getGameById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id.toString();

        if (!userId) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        const game = await GameService.getGame(id as string);

        if (!game) {
            return res.status(404).json({ success: false, error: "Game not found" });
        }

        // Check if user is part of the game
        if (game.white !== userId && game.black !== userId) {
            return res.status(403).json({ success: false, error: "Forbidden: You are not a participant in this game" });
        }

        res.status(200).json({
            success: true,
            game: {
                gameId: game.gameId,
                white: game.white,
                black: game.black,
                status: game.status,
                turn: game.turn,
                fen: game.fen,
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};
