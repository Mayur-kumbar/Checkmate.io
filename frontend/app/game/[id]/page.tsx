"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { createSocket } from "@/lib/socket";
import { useParams } from "next/navigation";

export default function GamePage() {
  const { id } = useParams();
  const gameId = id as string;

  const socketRef = useRef<any>(null);
  
  // Game State
  const [playerColor, setPlayerColor] = useState<"white" | "black" | null>(null);
  
  // Chess Instance (Ref for logic, state for rendering)
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());

  // Interaction State
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

  const userIdRef = useRef<string | null>(null);
  const gameRef = useRef<any>(null);

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
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    });

    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
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
      
      // Load current state into chess engine
      chessRef.current.load(game.fen);
      setFen(game.fen);

      if (userIdRef.current) updatePlayerColor(game, userIdRef.current);
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
      window.location.href = "/lobby" 
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
  }, [gameId]);

  return (
    <div className="flex flex-col items-center mt-10 space-y-4">
      <div className="text-xl font-bold p-2 bg-gray-100 rounded-md">
        {playerColor ? `Playing as ${playerColor}` : "Spectating / Loading..."}
      </div>

      <div className="w-[600px] max-w-[95vw] shadow-2xl rounded-lg overflow-hidden border-4 border-gray-800">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop,
            onSquareClick,
            squareStyles: optionSquares,
            boardOrientation: playerColor || "white",
            animationDurationInMs: 200,
          }}
        />
      </div>

      <div className="text-lg font-medium flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${chessRef.current.turn() === "w" ? "bg-white border border-gray-400" : "bg-black"}`} />
        <span>{chessRef.current.turn() === "w" ? "White's Turn" : "Black's Turn"}</span>
      </div>
    </div>
  );
}
