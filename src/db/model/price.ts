import mongoose from "mongoose";

interface IPrice extends Document {
  binanceBid: number;
  binanceAsk: number;
  usdtNtrnPrice: number;
  tonToUsdt: number;
}

const priceSchema = new mongoose.Schema({
  binanceBid: { type: Number, required: true },
  binanceAsk: { type: Number, required: true },
  usdtNtrnPrice: { type: Number, required: true },
  tonToUsdt: { type: Number, required: true },
});

export const priceModel = mongoose.model<IPrice>("Price", priceSchema);
