import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const mongoURI = `mongodb://127.0.0.1:27017/proton`;

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected...");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
