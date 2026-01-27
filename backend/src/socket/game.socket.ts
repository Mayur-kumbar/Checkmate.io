import { Server, Socket } from "socket.io";
import { GameService } from "../services/game.service";
import { redis } from "../utils/redis";
import { v4 as uuid } from "uuid";
import { GameState } from "../types/game";

const PENDING_QUEUE = "queue:pending_players";

export const initSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("New connection:", socket.id);
    console.log("Authenticated user:", socket.data.userId);

    const userId = socket.data.userId;

    socket.emit("connected", { userId });

    // Handle Reconnection: If player already in an active game, join room and send update
    redis.get(`player:${userId}`).then(async (gameId) => {
      if (gameId) {
        socket.join(gameId);
        const game = await GameService.getGame(gameId);
        if (game) {
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

      // 🔁 find valid opponent
      while (true) {
        const candidate = await redis.lPop(PENDING_QUEUE);
        if (!candidate) break;

        // ❌ skip self
        if (candidate === userId) continue;

        // ❌ skip users already in game
        const candidateGame = await redis.get(`player:${candidate}`);
        if (candidateGame) continue;

        opponentUserId = candidate;
        break;
      }

      // no opponent → wait
      if (!opponentUserId) {
        await redis.rPush(PENDING_QUEUE, userId);
        return socket.emit("waiting_for_opponent");
      }

      // ✅ create game
      const gameId = uuid();
      const game = await GameService.createGame(gameId, opponentUserId);

      game.black = userId;
      game.status = "active";

      await GameService.updateGame(gameId, game);

      // bind players
      await redis.set(`player:${opponentUserId}`, gameId);
      await redis.set(`player:${userId}`, gameId);

      // join sockets to room
      socket.join(gameId);

      const opponentSocket = [...io.sockets.sockets.values()]
        .find(s => s.data.userId === opponentUserId);

      opponentSocket?.join(gameId);

      io.to(gameId).emit("game_start", game);
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

      await GameService.updateGame(gameId, updatedGame);
      io.to(gameId).emit("game_update", updatedGame);

      if (updatedGame.status === "finished") {
        await GameService.persistFinishedGame(updatedGame, chess);

        io.to(gameId).emit("game_over", {
          moves: updatedGame.moves,
          result: chess.isCheckmate() ? "checkmate" : "draw",
        });
      }
    });

    socket.on("resign", async ({ payload }) => {
      let data: any;
      try {
        data = typeof payload === "string" ? JSON.parse(payload) : payload;
      } catch {
        return socket.emit("invalid_move", "Invalid JSON");
      }

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

    socket.on("disconnect", async () => {
      console.log("Disconnected:", userId);

      // await redis.lRem(PENDING_QUEUE, 0, userId);

      // const gameId = await redis.get(`player:${userId}`);
      // if (!gameId) return;

      // const game = await GameService.getGame(gameId);
      // if (!game || game.status === "finished") return;

      // let abandonedBy: "white" | "black" | null = null;
      // if (userId === game.white) abandonedBy = "white";
      // if (userId === game.black) abandonedBy = "black";
      // if (!abandonedBy) return;

      // const updatedGame: GameState = {
      //   ...game,
      //   status: "finished",
      //   lastMoveAt: Date.now(),
      // };

      // io.to(gameId).emit("game_over", {
      //   result: "abandonment",
      //   abandonedBy,
      //   winner: abandonedBy === "white" ? "black" : "white",
      //   moves: updatedGame.moves,
      // });

      // await GameService.persistAbandonedGame(updatedGame, abandonedBy);
    });
  });
};
