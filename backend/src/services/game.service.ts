import { Chess } from "chess.js";
import { redis } from "../utils/redis";
import { GameState } from "../types/game";
import { GameModel } from "../models/game.model";

export class GameService {

  static async createGame(gameId: string, whiteUserId: string): Promise<GameState> {
    const chess = new Chess();

    const game: GameState = {
      gameId,
      white: whiteUserId,
      black: "",
      fen: chess.fen(),
      moves: [],
      turn: "white",
      status: "waiting",
      lastMoveAt: Date.now(),
    };

    await redis.set(`game:${gameId}`, JSON.stringify(game));
    return game;
  }

  static async getGame(gameId: string): Promise<GameState | null> {
    const data = await redis.get(`game:${gameId}`);
    return data ? JSON.parse(data) : null;
  }

  static async updateGame(gameId: string, game: GameState) {
    await redis.set(`game:${gameId}`, JSON.stringify(game));
  }

  static makeMove(
    game: GameState,
    move: any,
  ): { updatedGame: GameState; chess: Chess } | null {

    const chess = new Chess(game.fen);
    let result;

    try {
      result = chess.move(move);
    } catch {
      return null;
    }

    if (!result) return null;

    const isFinished = chess.isGameOver();

    const updatedGame: GameState = {
      ...game,
      fen: chess.fen(),
      moves: [...game.moves, result.san],
      turn: chess.turn() === "w" ? "white" : "black",
      status: isFinished ? "finished" : "active",
      lastMoveAt: Date.now(),
    };

    return { updatedGame, chess };
  }

  static async persistFinishedGame(game: GameState, chess: Chess) {
    let result = "1/2-1/2";
    if (chess.isCheckmate()) {
      result = chess.turn() === "w" ? "0-1" : "1-0";
    }

    await GameModel.create({
      gameId: game.gameId,
      white: game.white,
      black: game.black,
      moves: game.moves,
      result,
      reason: chess.isCheckmate() ? "checkmate" : "draw",
    });

    await redis.del(`player:${game.white}`);
    await redis.del(`player:${game.black}`);
    await redis.del(`game:${game.gameId}`);
  }

  static async persistResignedGame(game: GameState, resignedBy: "white" | "black") {
    const result = resignedBy === "white" ? "0-1" : "1-0";

    await GameModel.create({
      gameId: game.gameId,
      white: game.white,
      black: game.black,
      moves: game.moves,
      result,
      reason: "resignation",
    });

    await redis.del(`player:${game.white}`);
    await redis.del(`player:${game.black}`);
    await redis.del(`game:${game.gameId}`);
  }

  static async persistDrawGame(game: GameState, drawBy: "white" | "black") {
    const result = "1/2-1/2";
    const reason = drawBy === "white" ? "white_draw" : "black_draw";

    await GameModel.create({
      gameId: game.gameId,
      white: game.white,
      black: game.black,
      moves: game.moves,
      result,
      reason,
    });

    await redis.del(`player:${game.white}`);
    await redis.del(`player:${game.black}`);
    await redis.del(`game:${game.gameId}`);
  }

  static async persistAbandonedGame(game: GameState, abandonedBy: "white" | "black") {
    const result = abandonedBy === "white" ? "0-1" : "1-0";

    await GameModel.create({
      gameId: game.gameId,
      white: game.white,
      black: game.black,
      moves: game.moves,
      result,
      reason: "abandonment",
    });

    await redis.del(`player:${game.white}`);
    await redis.del(`player:${game.black}`);
    await redis.del(`game:${game.gameId}`);
  }
}
