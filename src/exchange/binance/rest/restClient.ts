import {USDMClient} from 'binance';

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
