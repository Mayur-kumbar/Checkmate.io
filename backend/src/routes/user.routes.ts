import { Router } from "express";
import { getUserProfile, getUserGames, handleGamesPlayed } from "../controllers/user.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.get("/profile/:username", getUserProfile);
router.get("/:userId/games", getUserGames);
router.post("/games-played", protect, handleGamesPlayed);

export default router;
