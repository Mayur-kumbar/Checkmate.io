"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import Header from "@/components/Header";
import { toast } from "sonner";

function AIGameWrapper() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const difficulty = searchParams.get("difficulty") || "medium";
  const playerColorParam = (searchParams.get("color") as "white" | "black") || "white";

  const [playerColor] = useState<"white" | "black">(playerColorParam);

  // Chess Instance (Ref for logic, state for rendering)
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [isInitializing, setIsInitializing] = useState(true);

  // Interaction State
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const [isAiThinking, setIsAiThinking] = useState(false);

  // UI State
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  });
  const [gameStatus, setGameStatus] = useState<string>("");
  const [user, setUser] = useState<any>(null);

  const pieceSymbols: Record<string, string> = {
    p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚",
  };

  const updateCapturedPieces = useCallback(() => {
    const initialPieces = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const currentBoard = chessRef.current.board();
    const currentPieces: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

    currentBoard.forEach(row => {
      row.forEach(square => {
        if (square) {
          currentPieces[square.type] = (currentPieces[square.type] || 0) + 1;
        }
      });
    });

    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];

    Object.keys(initialPieces).forEach(pieceType => {
      const missing = (initialPieces as any)[pieceType] * 2 - (currentPieces[pieceType] || 0);
      for (let i = 0; i < missing; i++) {
        if (i % 2 === 0) whiteCaptured.push(pieceType);
        else blackCaptured.push(pieceType);
      }
    });

    setCapturedPieces({ white: whiteCaptured, black: blackCaptured });
  }, []);

  const getMoveOptions = useCallback((square: string) => {
    const moves = chessRef.current.moves({
      square: square as any,
      verbose: true,
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          chessRef.current.get(move.to as any) &&
          chessRef.current.get(move.to as any)?.color !== chessRef.current.get(square as any)?.color
            ? "radial-gradient(circle, rgba(239, 68, 68, 0.5) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(59, 130, 246, 0.5) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });

    newSquares[square] = { background: "rgba(59, 130, 246, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }, []);

  const checkGameStatus = () => {
    if (chessRef.current.isCheckmate()) {
      setGameStatus("Checkmate!");
      const winner = chessRef.current.turn() === "w" ? "Black" : "White";
      toast.success(`${winner} wins by Checkmate! Redirecting...`);
      setTimeout(() => router.push("/lobby"), 3500);
    } else if (chessRef.current.isCheck()) {
      setGameStatus("Check!");
    } else if (chessRef.current.isDraw()) {
      setGameStatus("Draw");
      toast.info("Game drawn! Redirecting...");
      setTimeout(() => router.push("/lobby"), 3500);
    } else if (chessRef.current.isStalemate()) {
      setGameStatus("Stalemate");
      toast.info("Game drawn by stalemate! Redirecting...");
      setTimeout(() => router.push("/lobby"), 3500);
    } else {
      setGameStatus("");
    }
  };

  const makeCustomMove = (move: any) => {
    try {
      const result = chessRef.current.move(move);
      setFen(chessRef.current.fen());
      setMoveHistory(prev => [...prev, `${result.from}-${result.to}`]);
      updateCapturedPieces();
      checkGameStatus();
      return result;
    } catch (e) {
      return null;
    }
  };

  const executeAiMove = async () => {
    if (chessRef.current.isGameOver() || isAiThinking) return;

    setIsAiThinking(true);
    const startTime = Date.now();

    try {
      const res = await api.post("/ai/move", {
        fen: chessRef.current.fen(),
        difficulty
      });

      if (res.data.success && res.data.bestMove) {
        const uciMove = res.data.bestMove;
        
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove.substring(4, 5) : undefined;
        
        const elapsedTime = Date.now() - startTime;
        // Enforce a minimum delay so the AI doesn't feel instantaneous/robotic
        const delayRemaining = Math.max(0, 800 - elapsedTime);

        setTimeout(() => {
           makeCustomMove({ from, to, promotion });
           setIsAiThinking(false);
        }, delayRemaining);

      } else {
        toast.error("AI engine failed to yield a move.");
        setIsAiThinking(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error processing AI move.");
      setIsAiThinking(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ai_game_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.fen) {
            chessRef.current.load(parsed.fen);
            setFen(parsed.fen);
            setMoveHistory(parsed.moveHistory || []);
          }
        } catch (e) {}
      }
    }
    updateCapturedPieces();
    setIsInitializing(false);
  }, [updateCapturedPieces]);

  useEffect(() => {
    if (!isInitializing && typeof window !== "undefined") {
      localStorage.setItem("ai_game_state", JSON.stringify({ fen, moveHistory }));
    }
  }, [fen, moveHistory, isInitializing]);

  useEffect(() => {
    if (isInitializing) return;
    const turn = chessRef.current.turn() === "w" ? "white" : "black";
    if (turn !== playerColor && !chessRef.current.isGameOver()) {
       executeAiMove();
    }
  }, [fen, playerColor, isInitializing]);

  useEffect(() => {
     api.get("/auth/me").then(res => {
        if(res.data.success) {
           setUser(res.data.user);
        } else {
           router.push("/login");
        }
     }).catch(() => router.push("/login"));
  }, [router]);

  const onSquareClick = ({ square }: any) => {
    if (isAiThinking || chessRef.current.isGameOver()) return;

    if (!moveFrom) {
      const pieceOnSquare = chessRef.current.get(square as any);
      const turn = chessRef.current.turn() === "w" ? "white" : "black";
      if (pieceOnSquare && playerColor === turn && pieceOnSquare.color === (playerColor === "white" ? "w" : "b")) {
        const hasOptions = getMoveOptions(square);
        if (hasOptions) setMoveFrom(square);
      }
      return;
    }

    try {
      const move = makeCustomMove({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      if (move) {
        setMoveFrom(null);
        setOptionSquares({});
      } else {
        const hasOptions = getMoveOptions(square);
        setMoveFrom(hasOptions ? square : null);
      }
    } catch (e) {
      const pieceOnSquare = chessRef.current.get(square as any);
      const turn = chessRef.current.turn() === "w" ? "white" : "black";
      if (pieceOnSquare && playerColor === turn && pieceOnSquare.color === (playerColor === "white" ? "w" : "b")) {
        const hasOptions = getMoveOptions(square);
        setMoveFrom(hasOptions ? square : null);
      } else {
        setMoveFrom(null);
        setOptionSquares({});
      }
    }
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }: any) => {
    if (!targetSquare || isAiThinking || chessRef.current.isGameOver()) return false;

    const turn = chessRef.current.turn() === "w" ? "white" : "black";
    if (playerColor !== turn) return false;

    try {
      const move = makeCustomMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move) {
        setMoveFrom(null);
        setOptionSquares({});
        return true;
      }
    } catch (e) {
      console.log("Illegal drag move locally");
    }
    return false;
  };

  const handleResign = () => {
    if (confirm("Are you sure you want to resign against the AI?")) {
      toast.info("You resigned.");
      router.push("/lobby");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col">
      <Header
        user={user}
        isGamePage
        leftActions={
          <Link href="/lobby" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
            <div className="text-xl md:text-2xl">←</div>
          </Link>
        }
        rightActions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleResign}
              className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg border border-red-600/50 hover:border-red-500 hover:bg-red-900/20 text-red-400 transition-all duration-200 text-[10px] md:text-sm font-medium"
            >
              Resign
            </button>
          </div>
        }
      />

      {/* Main Game Area */}
      <main className="flex-1 container mx-auto px-2 sm:px-4 py-4 md:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 max-w-7xl mx-auto">
          {/* Left Side - Game Board */}
          <div className="flex-1 flex flex-col gap-3 md:gap-4">
            {/* Opponent Info Card */}
            <div className={`bg-gray-800/50 backdrop-blur-sm border ${isAiThinking ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'border-gray-700'} rounded-xl p-3 md:p-4 flex items-center justify-between transition-all duration-300`}>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-teal-700 to-emerald-600 flex items-center justify-center text-lg md:text-xl">
                  {playerColor === "white" ? "♚" : "♔"}
                </div>
                <div>
                  <div className="font-semibold text-xs md:text-base flex items-center gap-2">
                    Stockfish AI
                    <span className="text-[10px] px-2 py-0.5 bg-gray-700 rounded-full capitalize text-teal-400">{difficulty}</span>
                  </div>
                  <div className="text-[10px] md:text-sm text-gray-400">
                    {isAiThinking ? <span className="text-teal-400 animate-pulse">Thinking...</span> : "Waiting"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex gap-0.5 mt-0.5 justify-end">
                  {(playerColor === "white" ? capturedPieces.black : capturedPieces.white).slice(0, 8).map((piece, i) => (
                    <span key={i} className="text-[10px] md:text-xs opacity-60">{pieceSymbols[piece]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chess Board Container */}
            <div className="relative w-full aspect-square max-w-[600px] mx-auto group">
              <div className="w-full h-full shadow-2xl rounded-lg overflow-hidden border-2 md:border-4 border-gray-700">
                <Chessboard
                  options={{
                    id: "game-board-ai",
                    position: fen,
                    onPieceDrop: onPieceDrop,
                    onSquareClick: onSquareClick,
                    squareStyles: optionSquares,
                    boardOrientation: playerColor || "white",
                    animationDurationInMs: 200,
                    darkSquareStyle: { backgroundColor: "#4a5568" },
                    lightSquareStyle: { backgroundColor: "#cbd5e0" },
                  }}
                />
              </div>
            </div>

            {/* Player Info Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg md:text-xl">
                  {playerColor === "white" ? "♔" : "♚"}
                </div>
                <div>
                  <div className="font-semibold text-xs md:text-base flex items-center gap-1.5 md:gap-2">
                    You {playerColor && <span className="text-[8px] md:text-xs px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-full capitalize">({playerColor})</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex gap-0.5 mt-0.5 justify-end">
                  {(playerColor === "white" ? capturedPieces.white : capturedPieces.black).slice(0, 8).map((piece, i) => (
                    <span key={i} className="text-[10px] md:text-xs opacity-60">{pieceSymbols[piece]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Turn Indicator */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-2 md:p-3 flex items-center justify-center gap-2 md:gap-3">
              <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${chessRef.current.turn() === "w" ? "bg-white border-2 border-gray-400" : "bg-gray-900 border-2 border-gray-600"}`} />
              <span className="font-medium text-xs md:text-sm">
                {chessRef.current.turn() === "w" ? "White's Turn" : "Black's Turn"}
              </span>
              {playerColor && (
                <span className="text-[10px] md:text-sm text-gray-400">
                  {gameStatus === "Check!" || gameStatus === "Checkmate!" ? (
                    <span className="text-red-500 font-bold animate-pulse">⚠️ {gameStatus}</span>
                  ) : (chessRef.current.turn() === "w" && playerColor === "white") ||
                    (chessRef.current.turn() === "b" && playerColor === "black")
                    ? "• Your move"
                    : "• Waiting for AI..."}
                </span>
              )}
            </div>
          </div>

          {/* Right Side - Move History & Info */}
          <div className="lg:w-80 flex flex-col gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4">
              <h3 className="text-[10px] md:text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">Match Details</h3>
              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="font-medium">Player vs AI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Difficulty:</span>
                  <span className="font-medium capitalize text-teal-400">{difficulty}</span>
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4 flex flex-col flex-1 min-h-[200px] lg:min-h-0">
              <h3 className="text-[10px] md:text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">Move History</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[300px] md:max-h-none pr-1">
                {moveHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-8">
                    Waiting for first move...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {moveHistory.map((move, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs py-1.5 px-2 hover:bg-gray-700/30 rounded transition-colors"
                      >
                        <span className="text-gray-500 w-4 font-mono">{index % 2 === 0 ? Math.floor(index / 2) + 1 + "." : ""}</span>
                        <span className="font-mono font-medium">{move}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(55, 65, 81, 0.1); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(107, 114, 128, 0.3); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(107, 114, 128, 0.5); }
      `}</style>
    </div>
  );
}

export default function AIGamePage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen flex items-center justify-center text-white bg-gray-900 border-t border-teal-500">
         <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="text-4xl">🤖</div>
            <div className="font-bold tracking-widest uppercase text-sm text-teal-500">Initializing Engine</div>
         </div>
       </div>
    }>
       <AIGameWrapper />
    </Suspense>
  );
}
