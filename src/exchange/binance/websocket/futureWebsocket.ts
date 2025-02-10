import WebSocket from 'ws';
import AstroClient from '../../astroport/astroClient';
import {TOKENS_MAP, TokenSymbol} from "../../../util/token";

export const BINANCE = {
  // name
  name: 'BINANCE',
  // type
  exchangeType: 'CEX',
  // suffix
  futureSuffix: 'USDT',
  // Websocket array for stream
  wss: [],
  wssDepth: [],
  // URL (WebSocket Stream)
  wssFutureUrl: 'wss://fstream.binance.com/ws',
};

export function getCurrentPriceDepthFutureBinanceWebsocket(
  _symbol: string,
  _client: AstroClient,
  ntrnAmount: number,
  callback: (
    bidPrice: number,
    askPrice: number,
    usdtNtrnPrice: number,
    ntrnUsdtPrice: number,
    ntrnAmount: number,
  ) => void,
) {
  const existingIndex = BINANCE.wss.findIndex((item) => Object.keys(item)[0] === 'F' + _symbol);
  let ws: WebSocket | null;
  if (existingIndex === -1) {
    ws = createFutureWebSocket(_symbol, callback);
    BINANCE.wss.push({ ['F' + _symbol]: ws });
  } else {
    return;
  }

  BINANCE.wssDepth.push({ ['F' + _symbol + 'B']: 0.0 });
  BINANCE.wssDepth.push({ ['F' + _symbol + 'A']: 0.0 });

  const bidIndex = BINANCE.wssDepth.findIndex((item) => Object.keys(item)[0] === 'F' + _symbol + 'B');
  const askIndex = BINANCE.wssDepth.findIndex((item) => Object.keys(item)[0] === 'F' + _symbol + 'A');
  const tempBidPriceObj = BINANCE.wssDepth[bidIndex];
  const tempAskPriceObj = BINANCE.wssDepth[askIndex];

  let tempBidPrice = tempBidPriceObj['F' + _symbol + 'B'];
  let tempAskPrice = tempAskPriceObj['F' + _symbol + 'A'];

  let ntrnUsdcPrice: number;
  let usdcNtrnPrice: number;

  function createFutureWebSocket(
    _symbol: string,
    callback: (
      bidPrice: number,
      askPrice: number,
      usdtNtrnPrice: number,
      ntrnUsdtPrice: number,
      ntrnAmount: number,
    ) => void,
  ): WebSocket {
    const ws = new WebSocket(BINANCE.wssFutureUrl);
    const symbol = (_symbol + BINANCE.futureSuffix).toLowerCase();
    ws.onopen = () => {
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [symbol + '@bookTicker'],
        id: 1,
      };
      ws.send(JSON.stringify(subscribeMessage));

      const timestamp = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Seoul',
        hour12: false,
      });
      console.log(`${BINANCE.name} [${_symbol}]'s Future Websocket Connected at ${timestamp}`);

      setInterval(async () => {
        [ntrnUsdcPrice, usdcNtrnPrice] = await _client.getPrice(
            TOKENS_MAP.get(TokenSymbol.NTRN)!.symbol,
            TOKENS_MAP.get(TokenSymbol.USDC)!.symbol,
            1000);
      }, 1000);
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data.toString());
      try {
        if (response.s == _symbol + BINANCE.futureSuffix) {
          if (response.b > 0) {
            tempBidPrice = parseFloat(response.b);
          }
          if (response.a > 0) {
            tempAskPrice = parseFloat(response.a);
          }

          if (isNaN(tempBidPrice) && isNaN(tempAskPrice)) {
            return;
          }

          let bidPrice = tempBidPrice;
          let askPrice = tempAskPrice;

          callback(bidPrice, askPrice, ntrnUsdcPrice, usdcNtrnPrice, ntrnAmount);
        } else {
          callback(-1, -1, -1, -1, -1);
        }
      } catch (error) {
        callback(-1, -1, -1, -1, -1);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket Error: ${error}`);
      callback(-1, -1, -1, -1, -1);
    };

    ws.onclose = () => {
      console.log(`${BINANCE.name} [${_symbol}]'s Future Websocket Disconnected`);
      callback(-1, -1, -1, -1, -1);
    };

    return ws;
  }
}