import { opportunityModel } from "./model/price";

// 가격 데이터 저장 함수
export async function savePriceData(
  binanceBid: number,
  binanceAsk: number,
  usdtToNtrn: number,
  ntrnToUsdt: number,
  ntrnAmount: number,
  isOpen?: boolean
) {
  try {
    const timestamp = Date.now();
    const opportunity = new opportunityModel({
      binanceBid,
      binanceAsk,
      usdtToNtrn,
      ntrnToUsdt,
      ntrnAmount,
      isOpen,
      timestamp,
    });
    await opportunity.save();
    console.log("price data is saved...");
  } catch (err) {
    console.error("Error saving price data", err);
  }
}
