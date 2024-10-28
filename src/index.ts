import {connectDB} from "./db/connect";
import {init, swap} from "./arbitrage";
import {savePriceData} from "./db/store";
import {BINANCE} from "./interface/exchange";
import {getCurrentPriceDepthFutureBinanceWebsocket} from "./binance/websocket/futureWebsocket";
import AstroClient from "./astroport/swap";

let usdcAmount: number = 0;
let isTrading = false;

async function main() {
  const { binanceClient, astroClient } = await init();

  await connectDB(); // MongoDB 연결
  const handlePriceUpdate = async (
      binanceBidPrice: number,
      binanceAskPrice: number,
      usdtNtrnPrice: number,
      ntrnUsdtPrice: number,
      ntrnAmount: number,
  ) => {
    const timestamp = Date.now();

    // 유효성 검증
    if ([binanceBidPrice, binanceAskPrice, usdtNtrnPrice, ntrnUsdtPrice].includes(-1) ||
        [usdtNtrnPrice, ntrnUsdtPrice].some(Number.isNaN)) {
      return;
    }

    // 거래 중이면 다른 거래 대기
    if (isTrading) {
      return;
    }
    // 첫 번째 거래 조건: TON을 USDT로 스왑
    if (ntrnUsdtPrice - binanceAskPrice > 0.0005 && usdcAmount === 0) {
      console.log("Open",binanceBidPrice, binanceAskPrice, usdtNtrnPrice, ntrnUsdtPrice, ntrnAmount, timestamp);
      isTrading = true;
      await swap(binanceClient, astroClient, ntrnAmount, true);
      await savePriceData(
          binanceBidPrice,
          binanceAskPrice,
          usdtNtrnPrice,
          ntrnUsdtPrice,
          ntrnAmount,
          true,
      )
      // 잔액이 업데이트될 때까지 대기
      usdcAmount = await waitForBalanceUpdate(astroClient);
      console.log("USDC balance updated: " + usdcAmount);
      isTrading = false;
    }
    // 두 번째 거래 조건: USDT를 TON으로 스왑
    else if (usdtNtrnPrice - binanceBidPrice < 0.0001 && usdcAmount > 0) {
      console.log("Close",binanceBidPrice, binanceAskPrice, usdtNtrnPrice, ntrnUsdtPrice, ntrnAmount, timestamp);
      isTrading = true;
      await swap(binanceClient, astroClient, ntrnAmount, false, usdcAmount);
      await savePriceData(
          binanceBidPrice,
          binanceAskPrice,
          usdtNtrnPrice,
          ntrnUsdtPrice,
          ntrnAmount,
          false,
      )
      usdcAmount = 0;
      isTrading = false;
    }
    else {
      // 평소 데이터 저장
      await savePriceData(
          binanceBidPrice,
          binanceAskPrice,
          usdtNtrnPrice,
          ntrnUsdtPrice,
          ntrnAmount,
      );
    }
  };

  getCurrentPriceDepthFutureBinanceWebsocket(BINANCE, astroClient, 100, handlePriceUpdate);
}

main().then(console.error)

async function waitForBalanceUpdate(astroClient: AstroClient, checkInterval: number = 3000): Promise<number> {
  return new Promise<number>((resolve) => {  // Specify the Promise resolves with a number
    const intervalId = setInterval(async () => {
      const usdcAmount = await astroClient.fetchBalance();
      if (usdcAmount > 0) {
        clearInterval(intervalId);
        resolve(usdcAmount);  // Resolve with the updated balance
      }
    }, checkInterval);
  });
}