import mongoose from "mongoose";

const priceSchema = new mongoose.Schema({
  binanceBid: { type: Number, required: true },
  binanceAsk: { type: Number, required: true },
  usdtToNtrn: { type: Number, required: true },
  ntrnToUsdt: { type: Number, required: true },
  isOpen: { type: Boolean, required: false },
  ntrnAmount: { type: Number, required: true },
  timestamp: { type: Number, required: true },
});

export const opportunityModel = mongoose.model("opportunities", priceSchema);
