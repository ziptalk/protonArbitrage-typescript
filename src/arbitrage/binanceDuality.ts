import { DualityClient } from '../exchange/duality/dualityClient';
import {USDMClient} from "binance";
import {getOrderBook, placeOrder} from '../exchange/binance/rest/restClient';
import {getTokenBySymbol, TokenSymbol} from '../util/token';

import dotenv from 'dotenv';
dotenv.config();

export async function runBinanceDualityArbitrage(quantity: number) {
  try {
    const dualityClient = await DualityClient.getInstance(
      process.env.RPC_URL as string,
      process.env.MNEMONIC as string,
      {
        gasPrice: '0.025untrn',
      }
    );

    const binanceClient = new USDMClient({
      api_key: process.env.BINANCE_API_KEY as string,
      api_secret: process.env.BINANCE_API_SECRET as string,
    });

    console.log('Connected to Duality, Binance');
    console.log('Starting arbitrage monitoring...');

    const tokenIn = getTokenBySymbol(TokenSymbol.NTRN);
    const tokenOut = getTokenBySymbol(TokenSymbol.USDC);

    console.log(`\nChecking ${TokenSymbol.NTRN} arbitrage opportunity...`);
    const dualityOrderBook = await dualityClient.getOrderBook(tokenIn, tokenOut);
    console.log('Duality Orderbook:', dualityOrderBook);

    const binanceOrderBook = await getOrderBook(binanceClient, tokenIn.symbol);

    if (!binanceOrderBook || !dualityOrderBook) {
      console.error('Failed to fetch order books');
      return;
    }

    if (binanceOrderBook.bids.length === 0 || binanceOrderBook.asks.length === 0 || 
        dualityOrderBook.bids.length === 0 || dualityOrderBook.asks.length === 0) {
      console.error('Order books are empty');
      return;
    }

    const binanceBidPrice = Number(binanceOrderBook.bids[0][0]);
    const binanceAskPrice = Number(binanceOrderBook.asks[0][0]);
    const dualityAskPrice = dualityOrderBook.asks[0].price;
    const dualityBidPrice = dualityOrderBook.bids[0].price;

    console.log(
      `Binance Bid Price: ${binanceBidPrice}, Binance Ask Price: ${binanceAskPrice}, Duality Ask Price: ${dualityAskPrice}, Duality Bid Price: ${dualityBidPrice}`)
    // Compare prices and execute arbitrage if profitable
    if (binanceBidPrice > dualityAskPrice) {
      console.log(`Found arbitrage opportunity for 1 ${TokenSymbol.NTRN}!`);
      // Buy on Duality, Sell on Binance
      const dualityBuyResult = await dualityClient.placeLimitOrder(
        dualityClient.getAddress(),
        tokenIn,
        'BUY',
        quantity.toString(),
        dualityOrderBook.asks[0].price.toString(),
      );
      console.log('Duality Buy Result:', dualityBuyResult);

      const binanceSellResult = await placeOrder(binanceClient, tokenIn.symbol, quantity, 'SELL');
      console.log('Binance Sell Result:', binanceSellResult);
    } else if (binanceAskPrice < dualityBidPrice) {
      console.log(`Found arbitrage opportunity for 2 ${TokenSymbol.NTRN}!`);
      // Buy on Binance, Sell on Duality
      const binanceBuyResult = await placeOrder(binanceClient, tokenIn.symbol, quantity, 'BUY');
      console.log('Binance Buy Result:', binanceBuyResult);

      const dualitySellResult = await dualityClient.placeLimitOrder(
        dualityClient.getAddress(),
        tokenIn,
        'SELL',
        quantity.toString(),
        dualityOrderBook.bids[0].price.toString(),
      );
      console.log('Duality Sell Result:', dualitySellResult);
    } else {
      console.log(`No arbitrage opportunity found for ${TokenSymbol.NTRN}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error executing arbitrage: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred');
    }
  }
}
runBinanceDualityArbitrage(1)