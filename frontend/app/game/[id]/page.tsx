"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { createSocket } from "@/lib/socket";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import Header from "@/components/Header";
import { toast } from "sonner";


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

  // Authorization state
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

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
    toast.success("Draw offer sent!");
  };

  const handleAcceptDraw = () => {
    socketRef.current?.emit("accept_draw", { gameId });
  };

  const handleRejectDraw = () => {
    socketRef.current?.emit("reject_draw", { gameId });
    toast.error("Draw rejected!");
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
    const authorize = async () => {
      try {
        const res = await api.get(`/game/${gameId}`);
        if (res.data.success) {
          // Get user data for header
          const userRes = await api.get("/auth/me");
          if (userRes.data.success) setUser(userRes.data.user);

          setIsAuthorizing(false);
          initSocket();
        }
      } catch (err: any) {
        console.error("Authorization failed:", err);
        setAuthError(err.response?.data?.error || "You are not authorized to view this game.");
        setIsAuthorizing(false);
      }
    };

    const initSocket = () => {
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

      socket.on("game_over", (data: any) => {
        toast.info(`Game over: ${data.result}`);
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
    };

    authorize();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [gameId, updateCapturedPieces, router]);

  const updatePlayerColor = (game: any, uId: string) => {
    if (game.white === uId) {
      setPlayerColor("white");
    } else if (game.black === uId) {
      setPlayerColor("black");
    }
  };

  const pieceSymbols: Record<string, string> = {
    p: "♟",
    n: "♞",
    b: "♝",
    r: "♜",
    q: "♛",
    k: "♚",
  };

  if (isAuthorizing) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Authorizing access...</h2>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-6 max-w-md">{authError}</p>
        <Link
          href="/lobby"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
        >
          Return to Lobby
        </Link>
      </div>
    );
  }

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
              onClick={handleOfferDraw}
              className="px-2 py-1.5 md:px-4 md:py-2 rounded-lg border border-gray-600 hover:border-gray-500 hover:bg-gray-800 transition-all duration-200 text-[10px] md:text-sm font-medium"
            >
              Draw
            </button>
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
            {drawOffered && drawOffered !== playerColor && (
              <div className="bg-blue-600/90 backdrop-blur-sm border border-blue-400 p-3 md:p-4 rounded-xl flex items-center justify-between shadow-lg animate-pulse">
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-lg md:text-xl">🤝</span>
                  <span className="font-semibold text-xs md:text-base">Opponent offers a draw</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAcceptDraw}
                    className="bg-green-500 hover:bg-green-600 px-3 py-1 md:px-4 md:py-1.5 rounded-lg font-bold text-xs md:text-sm transition-colors shadow-md"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleRejectDraw}
                    className="bg-red-500 hover:bg-red-600 px-3 py-1 md:px-4 md:py-1.5 rounded-lg font-bold text-xs md:text-sm transition-colors shadow-md"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Opponent Info Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-lg md:text-xl">
                  {playerColor === "white" ? "♚" : "♔"}
                </div>
                <div>
                  <div className="font-semibold text-xs md:text-base">{playerColor === "white" ? "Black Player" : "White Player"}</div>
                  <div className="text-[10px] md:text-sm text-gray-400">Rating: 1200</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base md:text-lg font-mono font-bold">
                  {playerColor === "white" ? timer.black : timer.white}
                </div>
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
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-lg md:text-xl">
                  {playerColor === "white" ? "♔" : "♚"}
                </div>
                <div>
                  <div className="font-semibold text-xs md:text-base flex items-center gap-1.5 md:gap-2">
                    You {playerColor && <span className="text-[8px] md:text-xs px-1.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-full">({playerColor})</span>}
                  </div>
                  <div className="text-[10px] md:text-sm text-gray-400">Rating: 1200</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base md:text-lg font-mono font-bold">
                  {playerColor === "white" ? timer.white : timer.black}
                </div>
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
                  {gameStatus === "Check!" ? (
                    <span className="text-red-500 font-bold animate-pulse">⚠️ Check!</span>
                  ) : (chessRef.current.turn() === "w" && playerColor === "white") ||
                    (chessRef.current.turn() === "b" && playerColor === "black")
                    ? "• Your move"
                    : "• Waiting..."}
                </span>
              )}
            </div>
          </div>


          {/* Right Side - Move History & Info */}
          <div className="lg:w-80 flex flex-col gap-4">
            {/* Game Info - Hide on smallest mobile to save space, or keep compact */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4">
              <h3 className="text-[10px] md:text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">Game Details</h3>
              <div className="space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="font-medium">10 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="font-medium">Standard</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="font-medium">Rated</span>
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

            {/* Quick Actions (Keep but style consistently) */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-3 md:p-4 mb-4 lg:mb-0">
              <h3 className="text-[10px] md:text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-2 py-2 bg-gray-700/50 hover:bg-gray-600 rounded-lg transition-colors text-[10px] md:text-xs font-medium">
                  Takeback
                </button>
                <button className="px-2 py-2 bg-gray-700/50 hover:bg-gray-600 rounded-lg transition-colors text-[10px] md:text-xs font-medium">
                  Analyze
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
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.5);
        }
      `}</style>
    </div>
  );
}
