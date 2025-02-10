export enum OrderType {
  GOOD_TIL_CANCELLED = 0,
  FILL_OR_KILL = 1,
  IMMEDIATE_OR_CANCEL = 2,
  JUST_IN_TIME = 3,
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: string;
  quantity: string;
  timestamp: number;
  status: OrderStatus;
}

export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}
