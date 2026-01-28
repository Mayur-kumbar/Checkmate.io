import mongoose from "mongoose";
import { ENV } from "../config/env";

export const connectDB = async () => {
    try {
        await mongoose.connect(ENV.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
}   