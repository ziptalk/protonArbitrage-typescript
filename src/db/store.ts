import { priceModel } from "./model/price";

// 가격 데이터 저장 함수
export async function savePriceData(
  binanceBid: number,
  binanceAsk: number,
  usdtToNtrn: number,
  ntrnToUsdt: number,
) {
  try {
    const price = new priceModel({
      binanceBid,
      binanceAsk,
      usdtToNtrn,
      ntrnToUsdt,
    });
    await price.save();
    console.log("price data is saved...");
  } catch (err) {
    console.error("Error saving price data", err);
  }
}
