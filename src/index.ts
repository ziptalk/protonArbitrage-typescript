import { getCurrentPriceDepthFutureBinanceWebsocket } from "./binance/websocket/futureWebsocket";
import { connectDB } from "./db/connect";
import { savePriceData } from "./db/store";
import { BINANCE } from "./interface/exchange";
import dotenv from "dotenv";
import { USDMClient } from "binance";
import { placeOrder } from "./binance/rest/placeOrder";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";

dotenv.config();
// MongoDB 연결
connectDB();

// WebSocket callback 함수
function handlePriceUpdate(
  symbol: string,
  binanceBidPrice: number,
  binanceAskPrice: number,
  usdtNtrnPrice: number,
  ntrnUsdtPrice: number,
) {
  if (binanceBidPrice === -1 || binanceAskPrice === -1 || !usdtNtrnPrice || !ntrnUsdtPrice) {
    return;
  }
  savePriceData(binanceBidPrice, binanceAskPrice, usdtNtrnPrice, ntrnUsdtPrice);
}

export async function init() {
  const binanceClient = new USDMClient({
    api_key: process.env.BINANCE_API_KEY as string,
    api_secret: process.env.BINANCE_API_SECRET as string,
  });
  const cosmosClient = await CosmWasmClient.connect(process.env.RPC_URL as string)
  console.log("init")

  return { binanceClient, cosmosClient }
}
async function swap(binanceClient: USDMClient, cosmosClient: any, tonAmount: number, isOpen: boolean, usdtAmount? : number) {
  if(isOpen){
    await Promise.all([placeOrder(binanceClient, tonAmount, 'BUY'), cosmosClient.swapTonToUSDT(tonAmount, 0)])
  }
  else if(usdtAmount){
    await Promise.all([placeOrder(binanceClient, tonAmount, 'SELL'), cosmosClient.swapUSDTToTon(usdtAmount, 0)])
  }
  else console.log("error")
}

(async () => {
  try {
    const { binanceClient, cosmosClient } = await init();
    console.log('Initialization successful');
    getCurrentPriceDepthFutureBinanceWebsocket(BINANCE, "NTRN",cosmosClient, handlePriceUpdate);
  } catch (error) {
    console.error('Initialization failed', error);
  }
})();