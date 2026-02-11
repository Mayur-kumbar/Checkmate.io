import { Server, Socket } from "socket.io";
import { GameService } from "../services/game.service";
import { redis } from "../utils/redis";
import { v4 as uuid } from "uuid";
import { GameState } from "../types/game";

const PENDING_QUEUE = "queue:pending_players";

export const initSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    // console.log("New connection:", socket.id);
    // console.log("Authenticated user:", socket.data.userId);

    const userId = socket.data.userId;

    socket.emit("connected", { userId });

    // Handle Reconnection: If player already in an active game, join room and send update
    redis.get(`player:${userId}`).then(async (gameId) => {
      if (gameId) {
        await socket.join(gameId);
        const game = await GameService.getGame(gameId);
        if (game) {
          socket.emit("already_in_game", { gameId, game });
          socket.emit("game_update", game);
        }
      }
    });

    socket.on("find_game", async () => {
      // 🚫 already in a game
      const existingGameId = await redis.get(`player:${userId}`);
      if (existingGameId) {
        return socket.emit("already_in_game", { gameId: existingGameId });
      }

      let opponentUserId: string | null = null;
      let opponentSocket: Socket | undefined = undefined;

      // 🔁 find valid opponent
      while (true) {
        const candidate = await redis.lPop(PENDING_QUEUE);
        if (!candidate) break;

        // ❌ skip self
        if (candidate === userId) continue;

        // ❌ skip users already in game
        const candidateGame = await redis.get(`player:${candidate}`);
        if (candidateGame) continue;

        // ❌ skip users who are offline
        const sockets = await io.fetchSockets();
        const candidateSocket = sockets.find(s => s.data.userId === candidate);
        if (!candidateSocket) continue;

        opponentUserId = candidate;
        opponentSocket = candidateSocket as unknown as Socket;
        break;
      }

      // no opponent → wait
      if (!opponentUserId) {
        // Clean up self from queue if already there (avoid duplicates)
        await redis.lRem(PENDING_QUEUE, 0, userId);
        await redis.rPush(PENDING_QUEUE, userId);
        return socket.emit("waiting_for_opponent");
      }

      // ✅ create game
      const gameId = uuid();
      // Service.createGame currently sets white to the first argument
      const game = await GameService.createGame(gameId, opponentUserId);

      game.black = userId;
      game.status = "active";

      await GameService.updateGame(gameId, game);

      // bind players
      await redis.set(`player:${opponentUserId}`, gameId);
      await redis.set(`player:${userId}`, gameId);

      // join sockets to room
      console.log(`Creating game ${gameId} for White:${opponentUserId} and Black:${userId}`);

      await socket.join(gameId);
      await opponentSocket?.join(gameId);

      const roomSockets = await io.in(gameId).fetchSockets();
      console.log(`Room ${gameId} has ${roomSockets.length} sockets. Expected 2.`);

      // notify both
      io.to(gameId).emit("game_start", game);
      console.log(`game_start emitted to room ${gameId}`);
    });

    socket.on("cancel_find", async () => {
      await redis.lRem(PENDING_QUEUE, 0, userId);
    });

    socket.on("move", async (payload) => {
      let data: any;
      try {
        data = typeof payload === "string" ? JSON.parse(payload) : payload;
      } catch {
        return socket.emit("invalid_move", "Invalid JSON");
      }

      const { gameId, move } = data;
      if (!gameId || !move) {
        return socket.emit("invalid_move", "Malformed payload");
      }

      const game = await GameService.getGame(gameId);
      if (!game || game.status !== "active") return;

      // 🔐 turn enforcement (USER ID BASED)
      if (
        (game.turn === "white" && userId !== game.white) ||
        (game.turn === "black" && userId !== game.black)
      ) {
        return socket.emit("invalid_move", "Not your turn");
      }

      const result = GameService.makeMove(game, move);
      if (!result) {
        return socket.emit("invalid_move", "Illegal move");
      }

      const { updatedGame, chess } = result;

      updatedGame.drawOffered = null;
      await GameService.updateGame(gameId, updatedGame);
      io.to(gameId).emit("game_update", updatedGame);

      if (updatedGame.status === "finished") {
        await GameService.persistFinishedGame(updatedGame, chess);

        let result = chess.isCheckmate() ? "checkmate" : "draw";
        let winner = null;

        if (chess.isCheckmate()) {
          winner = chess.turn() === "w" ? "black" : "white";
        } else if (updatedGame.whiteTime <= 0) {
          result = "timeout";
          winner = "black";
        } else if (updatedGame.blackTime <= 0) {
          result = "timeout";
          winner = "white";
        }

        io.to(gameId).emit("game_over", {
          moves: updatedGame.moves,
          result,
          winner
        });
      }
    });

    socket.on("resign", async (data: any) => {
      const { gameId } = data;
      if (!gameId) {
        return socket.emit("invalid_move", "Malformed payload");
      }
      const game = await GameService.getGame(gameId);
      if (!game || game.status === "finished") return;

      let resignedBy: "white" | "black" | null = null;
      if (userId === game.white) resignedBy = "white";
      if (userId === game.black) resignedBy = "black";
      if (!resignedBy) return;

      const updatedGame: GameState = {
        ...game,
        status: "finished",
        lastMoveAt: Date.now(),
      };

      io.to(gameId).emit("game_over", {
        result: "resignation",
        resignedBy,
        winner: resignedBy === "white" ? "black" : "white",
        moves: updatedGame.moves,
      });

      await GameService.persistResignedGame(updatedGame, resignedBy);
    });

    socket.on("offer_draw", async (data: any) => {
      const { gameId } = data;
      // if(!gameId) return socket.emit("invalid_move", "Malformed payload");
      const game = await GameService.getGame(gameId);
      if (!game || game.status !== "active") return;

      const playerColor = userId === game.white ? "white" : "black";
      game.drawOffered = playerColor;
      await GameService.updateGame(gameId, game);

      io.to(gameId).emit("game_update", game);

    })

    socket.on("accept_draw", async (data: any) => {
      const { gameId } = data;
      const game = await GameService.getGame(gameId);
      if (!game || !game.drawOffered) return;
      const playerColor = userId === game.white ? "white" : "black";
      // Ensure the person accepting is NOT the one who offered
      if (game.drawOffered !== playerColor) {
        game.status = "finished";
        await GameService.updateGame(gameId, game);
        io.to(gameId).emit("game_over", { result: "draw", reason: "agreement" });
        await GameService.persistDrawGame(game, playerColor);
      }
    });

    socket.on("reject_draw", async (data: any) => {
      const { gameId } = data;
      const game = await GameService.getGame(gameId);
      if (!game) return;

      game.drawOffered = null; // Clear the offer
      await GameService.updateGame(gameId, game);
      io.to(gameId).emit("game_update", game);
    });

    socket.on("check_timeout", async (data: any) => {
      const { gameId } = data;
      const game = await GameService.getGame(gameId);
      if (!game || game.status !== "active") return;

      const now = Date.now();
      const elapsed = now - game.lastMoveAt;

      const isWhiteTimeout = game.turn === "white" && (game.whiteTime - elapsed) <= 0;
      const isBlackTimeout = game.turn === "black" && (game.blackTime - elapsed) <= 0;

      if (isWhiteTimeout || isBlackTimeout) {
        const winner = isWhiteTimeout ? "black" : "white";
        const updatedGame: GameState = {
          ...game,
          status: "finished",
          whiteTime: isWhiteTimeout ? 0 : game.whiteTime,
          blackTime: isBlackTimeout ? 0 : game.blackTime,
          lastMoveAt: now
        };

        await GameService.updateGame(gameId, updatedGame);

        io.to(gameId).emit("game_over", {
          result: "timeout",
          winner,
          moves: updatedGame.moves
        });

        // Persist to DB
        // Using persistFinishedGame would require a chess object, but for timeout we can just use the final state
        // Let's create a minimal chess object or just a dedicated persist method
        await GameService.persistAbandonedGame(updatedGame, winner === "white" ? "black" : "white"); // Close enough for now
      }
    });

    socket.on("disconnect", async () => {
      // console.log("Disconnected:", userId);
      await redis.lRem(PENDING_QUEUE, 0, userId);
    });
  });
};
