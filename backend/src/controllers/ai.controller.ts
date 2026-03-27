import { Request, Response } from "express";
import { getBestMove } from "../services/ai.service";

export const getAiMove = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fen, difficulty = "medium" } = req.body;

    if (!fen) {
      return res.status(400).json({ success: false, error: "FEN string is required." });
    }

    const bestMove = await getBestMove(fen, difficulty);

    return res.json({ success: true, bestMove });
  } catch (error: any) {
    console.error("AI Engine Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to communicate with chess engine.", 
      details: error.message 
    });
  }
};
