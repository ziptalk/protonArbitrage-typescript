import { USDMClient } from "binance";
export async function placeOrder(client: USDMClient, quantity: number, side: 'BUY' | 'SELL') {
    try {
        const order = await client.submitNewOrder({
            symbol: 'TONUSDT',
            side: side,
            type: 'MARKET',
            quantity: quantity,
        });

        console.log('Order placed successfully:', order);
    } catch (error) {
        console.error('Error placing order:', error);
    }
}