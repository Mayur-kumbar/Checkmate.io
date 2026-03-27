import { Router } from "express";
import * as aiController from "../controllers/ai.controller";

const router = Router();

// Expects { fen: string, difficulty: string }
router.post("/move", aiController.getAiMove);

export default router;
