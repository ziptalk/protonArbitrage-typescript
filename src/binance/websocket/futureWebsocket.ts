import WebSocket from "ws";
import { Exchange } from "../../interface/exchange";
import AstroClient from "../../astroport/swap";

export function getCurrentPriceDepthFutureBinanceWebsocket(
    _Name: Exchange,
    _client: AstroClient,
    ntrnAmount: number,
    callback: (
        bidPrice: number,
        askPrice: number,
        usdtNtrnPrice: number,
        ntrnUsdtPrice: number,
        ntrnAmount: number
    ) => void
) {
  const _symbol = 'NTRN';
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

  let ntrnUsdtPrice: number; // NTRN/USDT price when swap NTRN to USDT at astroport (NTRN->USDT)
  let usdtNtrnPrice: number; // NTRN/USDT price when swap USDT to NTRN at astroport (USDT->NTRN)

  function createFutureWebSocket(
      _Name: Exchange,
      _symbol: string,
      callback: (
          bidPrice: number,
          askPrice: number,
          usdtNtrnPrice: number,
          ntrnUsdtPrice: number,
          ntrnAmount: number
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
        [ntrnUsdtPrice, usdtNtrnPrice] = await _client.getPrice(1000);
      }, 1000 * 1); // 1초마다 astroport 가격 업데이트
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data.toString());
      try {
        if (response.s == _symbol + _Name.futureSuffix) {
          if (response.b > 0) {
            tempBidPrice = parseFloat(response.b); // response.b: best bid price
          }
          if (response.a > 0) {
            tempAskPrice = parseFloat(response.a); // response.a: best ask price
          }

          if (isNaN(tempBidPrice) && isNaN(tempAskPrice)) {
            return;
          }

          let bidPrice = tempBidPrice;
          let askPrice = tempAskPrice;

          callback(bidPrice, askPrice, usdtNtrnPrice, ntrnUsdtPrice, ntrnAmount);
        } else {
          callback( -1, -1, -1, -1, -1);
        }
      } catch (error) {
        callback(-1, -1, -1, -1, -1);
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