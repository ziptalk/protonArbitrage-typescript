import mongoose from "mongoose";

interface IPrice extends Document {
  binanceBid: number;
  binanceAsk: number;
  usdtToNtrn: number;
  ntrnToUsdt: number;
}

const priceSchema = new mongoose.Schema({
  binanceBid: { type: Number, required: true },
  binanceAsk: { type: Number, required: true },
  usdtNtrn: { type: Number, required: true },
  ntrnToUsdt: { type: Number, required: true },
});

export const priceModel = mongoose.model<IPrice>("Price", priceSchema);
