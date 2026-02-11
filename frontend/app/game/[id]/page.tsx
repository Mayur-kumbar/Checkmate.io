"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { createSocket } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";


export default function GamePage() {
  const { id } = useParams();
  const gameId = id as string;

  const socketRef = useRef<any>(null);
  const router = useRouter();

  // Game State
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);

  // Chess Instance (Ref for logic, state for rendering)
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());

  // Interaction State
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

  // UI State
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  });
  const [gameStatus, setGameStatus] = useState<string>("");
  const [timer, setTimer] = useState({ white: "10:00", black: "10:00" });
  const [drawOffered, setDrawOffered] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const gameRef = useRef<any>(null);

  // Helper to get captured pieces
  const updateCapturedPieces = useCallback(() => {
    const initialPieces = {
      p: 8, n: 2, b: 2, r: 2, q: 1, k: 1,
    };

    const currentBoard = chessRef.current.board();
    const currentPieces: Record<string, number> = {
      p: 0, n: 0, b: 0, r: 0, q: 0, k: 0,
    };

    currentBoard.forEach(row => {
      row.forEach(square => {
        if (square) {
          const piece = square.type;
          currentPieces[piece] = (currentPieces[piece] || 0) + 1;
        }
      });
    });

    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];

    Object.keys(initialPieces).forEach(pieceType => {
      const missing = (initialPieces as any)[pieceType] * 2 - (currentPieces[pieceType] || 0);
      // Simplified: just add missing pieces (would need color tracking for real implementation)
      for (let i = 0; i < missing; i++) {
        if (i % 2 === 0) whiteCaptured.push(pieceType);
        else blackCaptured.push(pieceType);
      }
    });

    setCapturedPieces({ white: whiteCaptured, black: blackCaptured });
  }, []);

  // Helper to highlight moves
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

  // UI Event: Square Click (v5 signature uses { piece, square })
  const onSquareClick = ({ square }: any) => {
    console.log("Square clicked:", square);

    // 1. If we haven't selected a 'from' square yet
    if (!moveFrom) {
      const pieceOnSquare = chessRef.current.get(square as any);
      // Check if it's the correct turn and player color
      const turn = chessRef.current.turn() === "w" ? "white" : "black";
      if (pieceOnSquare && playerColor === turn && pieceOnSquare.color === (playerColor === "white" ? "w" : "b")) {
        const hasOptions = getMoveOptions(square);
        if (hasOptions) setMoveFrom(square);
      }
      return;
    }

    // 2. We already have a 'from' square, so this click is a 'to' square or a re-selection
    try {
      const move = chessRef.current.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      if (move) {
        // Success!
        setFen(chessRef.current.fen());
        setMoveHistory(prev => [...prev, `${move.from}-${move.to}`]);
        updateCapturedPieces();
        setMoveFrom(null);
        setOptionSquares({});
        socketRef.current?.emit("move", {
          gameId,
          move: { from: moveFrom, to: square, promotion: "q" },
        });
      } else {
        // Not a valid move for this piece, check if it's another piece of ours
        const hasOptions = getMoveOptions(square);
        setMoveFrom(hasOptions ? square : null);
      }
    } catch (e) {
      // Exception means illegal move, check if we clicked a different piece of ours
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

  // UI Event: Piece Drop (Drag & Drop, v5 signature uses { piece, sourceSquare, targetSquare })
  const onPieceDrop = ({ sourceSquare, targetSquare }: any) => {
    console.log("Piece dropped:", { sourceSquare, targetSquare });

    if (!targetSquare) return false;

    const turn = chessRef.current.turn() === "w" ? "white" : "black";
    if (playerColor !== turn) {
      console.log("Not your turn", { playerColor, turn });
      return false;
    }

    try {
      const move = chessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (move) {
        setFen(chessRef.current.fen());
        setMoveHistory(prev => [...prev, `${move.from}-${move.to}`]);
        updateCapturedPieces();
        setMoveFrom(null);
        setOptionSquares({});
        socketRef.current?.emit("move", {
          gameId,
          move: { from: sourceSquare, to: targetSquare, promotion: "q" },
        });
        return true;
      }
    } catch (e) {
      console.log("Illegal drag move locally");
    }
    return false;
  };

  const handleResign = () => {
    if (confirm("Are you sure you want to resign?")) {
      socketRef.current?.emit("resign", { gameId });
      router.push("/lobby");
    }
  };

  const handleOfferDraw = () => {
    socketRef.current?.emit("offer_draw", { gameId });
    alert("Draw offer sent!");
  };

  const handleAcceptDraw = () => {
    socketRef.current?.emit("accept_draw", { gameId });
  };

  const handleRejectDraw = () => {
    socketRef.current?.emit("reject_draw", { gameId });
    alert("Draw rejected!");
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameRef.current || gameRef.current.status !== "active") return;

      const turn = gameRef.current.turn;
      const now = Date.now();
      const elapsed = now - gameRef.current.lastMoveAt;

      const whiteRemaining = turn === "white"
        ? Math.max(0, gameRef.current.whiteTime - elapsed)
        : gameRef.current.whiteTime;

      const blackRemaining = turn === "black"
        ? Math.max(0, gameRef.current.blackTime - elapsed)
        : gameRef.current.blackTime;

      setTimer({
        white: formatTime(whiteRemaining),
        black: formatTime(blackRemaining),
      });

      if (whiteRemaining <= 0 || blackRemaining <= 0) {
        // Technically the server should handle this, but we can nudge it
        socketRef.current?.emit("check_timeout", { gameId });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameId]);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("connected", (data: { userId: string }) => {
      console.log("User identification received:", data.userId);
      userIdRef.current = data.userId;
      if (gameRef.current) updatePlayerColor(gameRef.current, data.userId);
    });

    socket.on("game_update", (game: any) => {
      console.log("Game update received", { fen: game.fen, turn: game.turn });
      gameRef.current = game;

      // Update timers immediately on sync
      setTimer({
        white: formatTime(game.whiteTime),
        black: formatTime(game.blackTime),
      });

      // Load current state into chess engine
      chessRef.current.load(game.fen);
      setFen(game.fen);
      updateCapturedPieces();

      // Update game status
      if (chessRef.current.isCheckmate()) {
        setGameStatus("Checkmate!");
      } else if (chessRef.current.isCheck()) {
        setGameStatus("Check!");
      } else if (chessRef.current.isDraw()) {
        setGameStatus("Draw");
      } else if (chessRef.current.isStalemate()) {
        setGameStatus("Stalemate");
      } else {
        setGameStatus("");
      }

      if (userIdRef.current) updatePlayerColor(game, userIdRef.current);
      setDrawOffered(game.drawOffered || null);
    });

    const updatePlayerColor = (game: any, uId: string) => {
      if (game.white === uId) {
        setPlayerColor("white");
      } else if (game.black === uId) {
        setPlayerColor("black");
      }
    };

    socket.on("game_over", (data: any) => {
      alert(`Game over: ${data.result}`);
      router.push("/lobby");
    });

    socket.on("invalid_move", (msg: string) => {
      console.error("Server rejected move:", msg);
      // Revert local state if server says no
      if (gameRef.current) {
        chessRef.current.load(gameRef.current.fen);
        setFen(gameRef.current.fen);
      }
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [gameId, updateCapturedPieces]);

  const pieceSymbols: Record<string, string> = {
    p: "♟",
    n: "♞",
    b: "♝",
    r: "♜",
    q: "♛",
    k: "♚",
  };

  if (!localStorage.getItem("token")) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/lobby" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="text-2xl">←</div>
              <div className="hidden sm:block text-sm text-gray-400">Back to Lobby</div>
            </Link>
            <div className="h-6 w-px bg-gray-700"></div>
            <div className="flex items-center gap-2">
              <div className="text-2xl">♔</div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Game #{gameId?.slice(0, 8)}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOfferDraw}
              className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 text-sm"
            >
              Offer Draw
            </button>
            <button
              onClick={handleResign}
              className="px-4 py-2 rounded-lg border border-red-600 hover:border-red-500 hover:bg-red-900/20 text-red-400 transition-all duration-200 text-sm"
            >
              Resign
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="container mx-auto px-4 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          {/* Left Side - Game Board */}
          <div className="flex-1 flex flex-col gap-4">
            {drawOffered && drawOffered !== playerColor && (
              <div className="bg-blue-600/90 backdrop-blur-sm border border-blue-400 p-4 rounded-xl flex items-center justify-between shadow-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <span className="font-semibold">Opponent offers a draw</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptDraw}
                    className="bg-green-500 hover:bg-green-600 px-4 py-1.5 rounded-lg font-bold transition-colors shadow-md"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleRejectDraw}
                    className="bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg font-bold transition-colors shadow-md"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
            {/* Opponent Info Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xl">
                  {playerColor === "white" ? "♚" : "♔"}
                </div>
                <div>
                  <div className="font-semibold">{playerColor === "white" ? "Black Player" : "White Player"}</div>
                  <div className="text-sm text-gray-400">Rating: 1200</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold">
                  {playerColor === "white" ? timer.black : timer.white}
                </div>
                {/* Captured pieces by opponent (Opponent color) */}
                <div className="flex gap-0.5 mt-1 justify-end">
                  {(playerColor === "white" ? capturedPieces.black : capturedPieces.white).slice(0, 8).map((piece, i) => (
                    <span key={i} className="text-xs opacity-60">{pieceSymbols[piece]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chess Board */}
            <div className="relative">
              {gameStatus && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-gray-900/95 backdrop-blur-sm border-2 border-yellow-500 rounded-2xl px-8 py-4 shadow-2xl">
                  <div className="text-3xl font-bold text-yellow-400 text-center">{gameStatus}</div>
                </div>
              )}
              <div className="w-full max-w-[600px] mx-auto shadow-2xl rounded-xl overflow-hidden border-4 border-gray-700">
                <Chessboard
                  options={{
                    id: "game-board",
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
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-xl">
                  {playerColor === "white" ? "♔" : "♚"}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    You {playerColor && <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded-full">({playerColor})</span>}
                  </div>
                  <div className="text-sm text-gray-400">Rating: 1200</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-mono font-bold">
                  {playerColor === "white" ? timer.white : timer.black}
                </div>
                {/* Captured pieces by you (Your color) */}
                <div className="flex gap-0.5 mt-1 justify-end">
                  {(playerColor === "white" ? capturedPieces.white : capturedPieces.black).slice(0, 8).map((piece, i) => (
                    <span key={i} className="text-xs opacity-60">{pieceSymbols[piece]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Turn Indicator */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-3 flex items-center justify-center gap-3">
              <div className={`w-3 h-3 rounded-full ${chessRef.current.turn() === "w" ? "bg-white border-2 border-gray-400" : "bg-gray-900 border-2 border-gray-600"}`} />
              <span className="font-medium">
                {chessRef.current.turn() === "w" ? "White's Turn" : "Black's Turn"}
              </span>
              {playerColor && (
                <span className="text-sm text-gray-400">
                  {(chessRef.current.turn() === "w" && playerColor === "white") ||
                    (chessRef.current.turn() === "b" && playerColor === "black")
                    ? "• Your move"
                    : "• Waiting..."}
                </span>
              )}
            </div>
          </div>


          {/* Right Side - Move History & Info */}
          <div className="lg:w-80 flex flex-col gap-4">
            {/* Game Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">GAME INFO</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Time Control:</span>
                  <span className="font-medium">10 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Variant:</span>
                  <span className="font-medium">Standard</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Rated:</span>
                  <span className="font-medium">Yes</span>
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 flex-1">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">MOVE HISTORY</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto custom-scrollbar">
                {moveHistory.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No moves yet
                  </div>
                ) : (
                  moveHistory.map((move, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm py-1.5 px-2 hover:bg-gray-700/30 rounded transition-colors"
                    >
                      <span className="text-gray-500 w-8">{Math.floor(index / 2) + 1}.</span>
                      <span className="font-mono">{move}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">ACTIONS</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm">
                  Request Takeback
                </button>
                <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm">
                  Analyze Game
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
}