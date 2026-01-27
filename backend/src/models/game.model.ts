import mongoose from "mongoose";

const GameSchema = new mongoose.Schema(
  {
    gameId: { type: String, unique: true },

    white: { type: String, required: true },
    black: { type: String, required: true },

    moves: { type: [String], default: [] }, // SAN moves

    result: {
      type: String,
      enum: ["1-0", "0-1", "1/2-1/2"],
      required: true
    },

    reason: { type: String }, // checkmate, draw, resign, timeout
  },
  { timestamps: true }
);

export const GameModel = mongoose.model("Game", GameSchema);
