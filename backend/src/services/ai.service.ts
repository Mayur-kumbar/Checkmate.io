import { spawn } from "child_process";

/**
 * Communicates with the local Stockfish binary via UCI protocol
 * to determine the best move for a given FEN and difficulty.
 */
export const getBestMove = (fen: string, difficulty: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Map difficulty to engine strength parameters
    let uciCommand = "go depth 3"; // Default medium
    
    switch (difficulty.toLowerCase()) {
      case "easy":
        uciCommand = "go depth 1"; // Fast, naive moves
        break;
      case "medium":
        uciCommand = "go depth 3";
        break;
      case "hard":
        uciCommand = "go depth 6";
        break;
      case "expert":
        uciCommand = "go depth 10"; // Deep, stronger analysis
        break;
      default:
        uciCommand = "go depth 3";
    }

    try {
      // Spawn Stockfish process (assumes 'stockfish' is available in system PATH)
      const enginePath = process.env.STOCKFISH_PATH || "/usr/games/stockfish";
      const engine = spawn(enginePath);
      let bestMove = "";
      let errorData = "";

      engine.stdout.on("data", (data) => {
        const output = data.toString();
        // The UCI protocol responds with "bestmove [move]" once analysis completes
        const match = output.match(/bestmove\s+(\S+)/);
        if (match) {
          bestMove = match[1];
          // Kill the process once we have the move to free resources
          engine.kill();
        }
      });

      engine.stderr.on("data", (data) => {
        errorData += data.toString();
        console.error(`Stockfish stderr: ${data.toString()}`);
      });

      engine.on("error", (err) => {
        engine.kill();
        reject(err);
      });

      engine.on("close", (code) => {
        if (bestMove) {
          resolve(bestMove);
        } else {
          reject(new Error(`Engine closed without providing a best move. Details: ${errorData}`));
        }
      });

      // UCI Communication
      engine.stdin.write("uci\n");
      engine.stdin.write(`position fen ${fen}\n`);
      engine.stdin.write(`${uciCommand}\n`);
      
      // Fallback timeout inside the promise to prevent hanging requests
      setTimeout(() => {
        if (!bestMove) {
          engine.kill();
          reject(new Error("Engine timed out while calculating move."));
        }
      }, 15000); // 15 seconds max timeout

    } catch (error) {
      reject(error);
    }
  });
};
