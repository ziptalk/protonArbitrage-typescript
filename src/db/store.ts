import { priceModel } from "./model/price";

// 가격 데이터 저장 함수
export async function savePriceData(
  binanceBid: number,
  binanceAsk: number,
  usdtToTon: number,
  tonToUsdt: number,
  gapAverage: number,
  gap: number
) {
  try {
    const price = new priceModel({
      binanceBid,
      binanceAsk,
      usdtToTon,
      tonToUsdt,
      gapAverage,
      gap,
    });
    await price.save();
    console.log("price data is saved...");
  } catch (err) {
    console.error("Error saving price data", err);
  }
}
