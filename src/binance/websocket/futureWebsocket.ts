import WebSocket from "ws";
import { Exchange } from "../../interface/exchange";
import { getPrice } from "../../astroport/getPrice";
import {init} from "../../index";

// 새로운 타입 정의
type priceManager = {
  addPrice: (price: number) => void;
  getPrices: () => number[];
  average: () => number;
};

// Price를 관리하는 새로운 함수
function createPriceManager(size: number): priceManager {
  let prices: number[] = [];

  return {
    addPrice: (price: number) => {
      prices.push(price);
      if (prices.length > size) {
        prices.shift(); // 가장 오래된 가격 제거
      }
    },
    getPrices: () => [...prices], // 배열의 복사본 반환
    average: () => prices.reduce((a, b) => a + b, 0) / prices.length, // 배열의 평균 반환
  };
}

export function getCurrentPriceDepthFutureBinanceWebsocket(
    _Name: Exchange,
    _symbol: string,
    _client: any,
    callback: (
        symbol: string,
        bidPrice: number,
        askPrice: number,
        usdtNtrnPrice: number,
        ntrnUsdtPrice: number,
        gapAverage: number,
        gap: number
    ) => void
) {
  const existingIndex = _Name.wss.findIndex((item) => Object.keys(item)[0] === "F" + _symbol);
  let ws: WebSocket | null;
  if (existingIndex === -1) {
    ws = createFutureWebSocket(_Name, _symbol, callback);
    _Name.wss.push({["F" + _symbol]: ws});
  } else {
    return;
  }

  _Name.wssDepth.push({["F" + _symbol + "B"]: 0.0});
  _Name.wssDepth.push({["F" + _symbol + "A"]: 0.0});

  const bidIndex = _Name.wssDepth.findIndex((item) => Object.keys(item)[0] === "F" + _symbol + "B");
  const askIndex = _Name.wssDepth.findIndex((item) => Object.keys(item)[0] === "F" + _symbol + "A");
  const tempBidPriceObj = _Name.wssDepth[bidIndex];
  const tempAskPriceObj = _Name.wssDepth[askIndex];

  let tempBidPrice = tempBidPriceObj["F" + _symbol + "B"];
  let tempAskPrice = tempAskPriceObj["F" + _symbol + "A"];

  // price 관리자 생성: (astroport (USDT->NTRN) price - Binance bid price) 저장
  const priceManager = createPriceManager(100);

  let ntrnUsdtPrice: number; // NTRN/USDT price when swap NTRN to USDT at astroport (NTRN->USDT)
  let usdtNtrnPrice: number; // NTRN/USDT price when swap USDT to NTRN at astroport (USDT->NTRN)
  let calculatedPrice: number;

  function createFutureWebSocket(
      _Name: Exchange,
      _symbol: string,
      callback: (
          symbol: string,
          bidPrice: number,
          askPrice: number,
          usdtNtrnPrice: number,
          ntrnUsdtPrice: number,
          gapAverage: number,
          gap: number
      ) => void
  ): WebSocket {
    const ws = new WebSocket(_Name.wssFutureUrl);
    const symbol = (_symbol + _Name.futureSuffix).toLowerCase();
    ws.onopen = () => {
      const subscribeMessage = {
        method: "SUBSCRIBE",
        params: [symbol + "@bookTicker"],
        id: 1,
      };
      ws.send(JSON.stringify(subscribeMessage)); // Binance WebSocket 연결

      const timestamp = new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul", hour12: false});
      console.log(`${_Name.name} [${_symbol}]'s Future Websocket Connected at ${timestamp}`);

      setInterval(async () => {
        [ntrnUsdtPrice, usdtNtrnPrice] = await getPrice(_client, 1000);
      }, 1000 * 1); // 1초마다 astroport 가격 업데이트
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data.toString());
      try {
        if (response.s == _symbol + _Name.futureSuffix) {
          console.log(tempAskPrice, tempBidPrice, ntrnUsdtPrice, usdtNtrnPrice, Date.now());
          if (response.b > 0) {
            tempBidPrice = parseFloat(response.b); // response.b: best bid price
            calculatedPrice = usdtNtrnPrice - tempBidPrice; // astroport (USDT->NTRN) price - Binance bid price
            priceManager.addPrice(calculatedPrice); // 새 데이터 추가
          }
          if (response.a > 0) {
            tempAskPrice = parseFloat(response.a); // response.a: best ask price
            if (ntrnUsdtPrice - tempAskPrice > priceManager.average()) {
              console.log(
                  "*****기회 발견:",
                  tempBidPrice,
                  tempAskPrice,
                  priceManager.average(),
                  ntrnUsdtPrice - tempAskPrice,
                  Date.now()
              );
            }
          }

          if (isNaN(tempBidPrice) && isNaN(tempAskPrice)) {
            return;
          }

          let bidPrice = tempBidPrice;
          let askPrice = tempAskPrice;
          let gap = ntrnUsdtPrice - tempAskPrice;

          callback(symbol, bidPrice, askPrice, usdtNtrnPrice, ntrnUsdtPrice, priceManager.average(), gap);
        } else {
          callback(symbol, -1, -1, -1, -1, -1, -1);
        }
      } catch (error) {
        callback("", -1, -1, -1, -1, -1, -1);
      }
    };

    ws.onclose = (event) => {
      const timestamp = new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul", hour12: false});
      if (event.wasClean) {
        console.log(`${_Name.name} [${_symbol}]'s Future Websocket Closed at ${timestamp}`);
      } else {
        ws.close();

        const delay = Math.random() * 1000;
        console.log(
            `${_Name.name} [${_symbol}]'s Future Websocket will Reconnect in ${(delay / 1000).toFixed(
                2
            )}s at ${timestamp}`
        );

        setTimeout(() => {
          const newWs = createFutureWebSocket(_Name, _symbol, callback);
          const index = _Name.wss.findIndex((item) => Object.keys(item)[0] === "F" + _symbol);
          if (index !== -1) {
            _Name.wss[index] = {["F" + _symbol]: newWs};
          }
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.log(`소켓에서 에러 발생:`, error.message, `소켓을 닫습니다.`);
      ws.close();
    };

    return ws;
  }
}

export function getCurrentPriceDepthFutureBinanceWebsocketOff(_Name: Exchange, _symbol: string) {
  const index = _Name.wss.findIndex((item) => Object.keys(item)[0] === "F" + _symbol);
  const bidIndex = _Name.wssDepth.findIndex((item) => Object.keys(item)[0] === "F" + _symbol + "B");
  const askIndex = _Name.wssDepth.findIndex((item) => Object.keys(item)[0] === "F" + _symbol + "A");

  if (askIndex !== -1) {
    _Name.wssDepth.splice(askIndex, 1);
  }

  if (bidIndex !== -1) {
    _Name.wssDepth.splice(bidIndex, 1);
  }

  if (index !== -1) {
    const wsObj = _Name.wss[index];
    const ws = wsObj["F" + _symbol];

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();

      _Name.wss.splice(index, 1);
    }
  }
}