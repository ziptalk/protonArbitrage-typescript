import {getOrderBook, placeOrder} from '../exchange/binance/rest/binanceClient';
import {getTokenBySymbol, TokenSymbol} from '../util/token';
import {init} from "./init";

export async function runBinanceDualityArbitrage(quantity: number) {
  try {
    const { binanceClient, dualityClient } = await init();

    const tokenIn = getTokenBySymbol(TokenSymbol.NTRN);

    console.log(`\nChecking ${TokenSymbol.NTRN} arbitrage opportunity...`);
    const [dualityAskPrice, dualityBidPrice] = await dualityClient.getOrderBook(tokenIn);

    const binanceOrderBook = await getOrderBook(binanceClient, tokenIn.symbol);
    
    if (!binanceOrderBook) {
      throw new Error('Failed to fetch Binance order book');
    }

    const binanceBidPrice = Number(binanceOrderBook.bids[0][0]);
    const binanceAskPrice = Number(binanceOrderBook.asks[0][0]);

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
        dualityAskPrice.toString(),
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
        dualityBidPrice.toString(),
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