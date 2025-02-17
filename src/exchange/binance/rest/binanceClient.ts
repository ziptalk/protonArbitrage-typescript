import {USDMClient} from 'binance';
import {log} from "../../../util/logger";

export async function initRest(apiKey: string, apiSecret: string) {
  return new USDMClient({api_key: apiKey, api_secret: apiSecret, })
}

export async function placeOrder(
  client: USDMClient,
  symbol: string,
  quantity: number,
  side: 'BUY' | 'SELL',
) {
  try {
    const order = await client.submitNewOrder({
      symbol: symbol + 'USDT',
      side: side,
      type: 'MARKET',
      quantity: quantity,
    });
    console.log('Order placed successfully:', order);
    return order.status as string;
  } catch (error) {
    console.error('Error placing order:', error);
    return '';
  }
}

export async function getOrderBook(client: USDMClient, symbol: string) {
  try {
    return await client.getOrderBook({
      symbol: symbol + 'USDT',
    });
  } catch (error) {
    console.error('Error fetching orderbook:', error);
  }
}

export async function placeLimitOrder(client: USDMClient, price: number, quantity: number, side: "BUY" | "SELL"): Promise<number> {
  try {
    log(`Placing order: ${side} Price: ${price} Quantity: ${quantity}`);
    const order = await client.submitNewOrder({
      symbol: "NTRNUSDT",
      side,
      type: "LIMIT",
      price: +price.toFixed(4),
      quantity,
      timeInForce: "GTC",
    });
    return order.orderId;
  } catch (error: any) {
    throw `Error placing ${side} order: ${error.message}`;
  }
}

export async function cancelOrder(client: USDMClient, orderId: number) {
  try {
    return await client.cancelOrder({
      symbol: "NTRNUSDT",
      orderId: orderId,
    })
  } catch (error: any) {
    throw `Error canceling order ${orderId}: ${error.message}`;
  }
}

export async function getPosition(client: USDMClient) {
  try {
    return await client.getPositionsV3({
      symbol: "NTRNUSDT",
    });
  } catch (error: any) {
    throw `Error getting position: ${error.message}`;
  }
}

export async function getOpenOrders(client: USDMClient) {
  try {
    return await client.getAllOpenOrders({
      symbol: "NTRNUSDT",
    });
  } catch (error: any) {
    throw `Error getting open orders: ${error.message}`;
  }
}

export async function getListenKey(client: USDMClient) {
  try {
    return (await client.getFuturesUserDataListenKey()).listenKey;
  } catch (error: any) {
    throw `Error getting listen key: ${error.message}`;
  }
}

export async function keepAliveListenKey(client: USDMClient) {
  try {
    return (await client.keepAliveFuturesUserDataListenKey());
  } catch (error: any) {
    throw `Error keeping alive listen key: ${error.message}`;
  }
}

export async function modifyOrder(client: USDMClient, orderId: number, side: "BUY" | "SELL", price: number, quantity: number) {
  try {
    log(`Modifying order: ${orderId} Side: ${side} Price: ${price} Quantity: ${quantity}`);
    return await client.modifyOrder({
      symbol: "NTRNUSDT",
      orderId,
      side,
      price: +price.toFixed(4),
      quantity,
    });
  } catch (error: any) {
    throw `Error modifying order ${orderId}: ${error.message}`;
  }
}

export async function cancelAllOpenOrders(client: USDMClient) {
  try {
    return await client.cancelAllOpenOrders({
      symbol: "NTRNUSDT",
    });
  } catch (error: any) {
    throw `Error canceling all open orders: ${error.message}`;
  }
}