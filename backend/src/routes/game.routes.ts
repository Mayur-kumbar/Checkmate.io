import { Router } from "express";
import * as gameController from "../controllers/game.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/:id", protect, gameController.getGameById);

export default router;
