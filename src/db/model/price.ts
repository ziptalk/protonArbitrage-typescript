import mongoose from "mongoose";

interface IPrice extends Document {
  binanceBid: number;
  binanceAsk: number;
  usdtToTon: number;
  tonToUsdt: number;
  gapAverage: number;
  gap: number;
}

const priceSchema = new mongoose.Schema({
  binanceBid: { type: Number, required: true },
  binanceAsk: { type: Number, required: true },
  usdtToTon: { type: Number, required: true },
  tonToUsdt: { type: Number, required: true },
  gapAverage: { type: Number, required: true },
  gap: { type: Number, required: true },
});

export const priceModel = mongoose.model<IPrice>("Price", priceSchema);
