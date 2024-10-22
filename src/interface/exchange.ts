import WebSocket from "ws";

interface WebSocketMap {
  [key: string]: WebSocket | null;
}

interface NumberMap {
  [key: string]: number | 0;
}

export interface Exchange {
  // name
  readonly name: string;
  // type
  readonly exchangeType: string;
  // suffix
  readonly spotSuffix: string;
  readonly futureSuffix: string;
  // URL (Spot)
  readonly spotPriceUrl: string;
  readonly spotDepthUrl: string;
  readonly spotOrderUrl: string;
  readonly spotOrderCancelUrl: string;
  readonly spotLotDataUrl: string;
  readonly spotBalanceUrl: string;
  // URL (Future)
  readonly futurePriceUrl: string;
  readonly futureDepthUrl: string;
  readonly futureOrderUrl: string;
  readonly futureOrderCancelUrl: string;
  readonly futureLotDataUrl: string;
  readonly futureBalanceUrl: string;
  readonly futurePositionUrl: string;
  // URL (Loan)
  readonly loanOngoingUrl: string;
  readonly loanBorrowUrl: string;
  readonly loanRepayUrl: string;
  // URL (Deposit & Withdraw)
  readonly depositUrl: string;
  readonly withdrawUrl: string;
  readonly withdrawFeeUrl: string;
  // Websocket array for stream
  wss: WebSocketMap[];
  wssDepth: NumberMap[];
  // URL (WebSocket Stream)
  readonly wssSpotUrl: string;
  readonly wssFutureUrl: string;
  wssExitWorking: boolean;
}

export const BINANCE: Exchange = {
  // name
  name: "BINANCE",
  // type
  exchangeType: "CEX",
  // suffix
  spotSuffix: "USDT",
  futureSuffix: "USDT",
  // URL (Spot)
  spotPriceUrl: "https://api.binance.com/api/v3/ticker/price",
  spotDepthUrl: "https://api.binance.com/api/v3/depth",
  spotOrderUrl: "https://api.binance.com/api/v3/order",
  spotOrderCancelUrl: "https://api.binance.com/api/v3/order",
  spotLotDataUrl: "https://api.binance.com/api/v3/exchangeInfo",
  spotBalanceUrl: "https://api.binance.com/api/v3/account",
  // URL (Future)
  futurePriceUrl: "https://fapi.binance.com/fapi/v1/ticker/price",
  futureDepthUrl: "https://fapi.binance.com/fapi/v1/depth",
  futureOrderUrl: "https://fapi.binance.com/fapi/v1/order",
  futureOrderCancelUrl: "https://fapi.binance.com/fapi/v1/order",
  futureLotDataUrl: "https://fapi.binance.com/fapi/v1/exchangeInfo",
  futureBalanceUrl: "https://fapi.binance.com/fapi/v2/account",
  futurePositionUrl: "https://fapi.binance.com/fapi/v2/positionRisk",
  // URL (Loan)
  loanOngoingUrl: "https://api.binance.com/sapi/v2/loan/flexible/ongoing/orders",
  loanBorrowUrl: "https://api.binance.com/sapi/v2/loan/flexible/borrow",
  loanRepayUrl: "https://api.binance.com/sapi/v2/loan/flexible/repay",
  // URL (Deposit & Withdraw)
  depositUrl: "https://api.binance.com/sapi/v1/capital/deposit/address",
  withdrawUrl: "https://api.binance.com/sapi/v1/capital/withdraw/apply",
  withdrawFeeUrl: "https://api.binance.com/sapi/v1/capital/config/getall",
  // Websocket array for stream
  wss: [],
  wssDepth: [],
  // URL (WebSocket Stream)
  wssSpotUrl: "wss://stream.binance.com:443/ws",
  wssFutureUrl: "wss://fstream.binance.com/ws",
  wssExitWorking: false,
};
