export type Color = "white" | "black";


export interface GameState {
  gameId: string;
  white: string;
  black: string;
  fen: string;
  moves: string[];
  turn: Color;
  status: "waiting" | "active" | "finished";
  drawOffered?: Color | null;
  whiteTime: number; // in milliseconds
  blackTime: number; // in milliseconds
  lastMoveAt: number;
}
export interface Move {
  from: string;
  to: string;
  promotion?: string;
}