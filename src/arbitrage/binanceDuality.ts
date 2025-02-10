import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { DualityClient } from '../exchange/duality/dualityClient';
import { DualityApi } from '../exchange/duality/dualityApi';
import dotenv from 'dotenv';
import { getOrderBook, placeOrder } from '../exchange/binance/rest/restClient';
import { Token, TOKENS_MAP, TokenSymbol } from '../util/token';
import { USDMClient } from 'binance';
dotenv.config();

export async function runBinanceDualityArbitrage(quantity: number) {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC as string, {
      prefix: 'neutron',
    });

    const [account] = await wallet.getAccounts();
    const dualityClient = await DualityClient.getInstance(process.env.RPC_URL as string, {
      gasPrice: '0.025untrn',
    });
    await dualityClient.connect(wallet);

    const apiClient = new DualityApi();
    const binanceClient = new USDMClient({
      api_key: process.env.BINANCE_API_KEY as string,
      api_secret: process.env.BINANCE_API_SECRET as string,
    });

    console.log('Connected to Duality, Binance');

    const tokens: Token[] = [
      TOKENS_MAP.get(TokenSymbol.TIA)!,
      TOKENS_MAP.get(TokenSymbol.NTRN)!,
      TOKENS_MAP.get(TokenSymbol.ATOM)!,
    ];

    for (const token of tokens) {
      // Get order books from both exchanges
      const dualityOrderBook = await apiClient.getOrderBook(token.symbol);
      const binanceOrderBook = await getOrderBook(binanceClient, token.symbol);

      // Compare prices and execute arbitrage if profitable
      if (Number(binanceOrderBook?.bids[0][0]) > dualityOrderBook.asks[0].price) {
        // Buy on Duality, Sell on Binance
        const dualityBuyResult = await dualityClient.placeLimitOrder(
          account.address,
          token.denom,
          'BUY',
          quantity.toString(),
          dualityOrderBook.asks[0].price.toString(),
        );
        console.log('Duality Buy Result:', dualityBuyResult);

        const binanceSellResult = await placeOrder(binanceClient, token.symbol, quantity, 'SELL');
        console.log('Binance Sell Result:', binanceSellResult);
      } else if (Number(binanceOrderBook?.asks[0][0]) < dualityOrderBook.bids[0].price) {
        // Buy on Binance, Sell on Duality
        const binanceBuyResult = await placeOrder(binanceClient, token.symbol, quantity, 'BUY');
        console.log('Binance Buy Result:', binanceBuyResult);

        const dualitySellResult = await dualityClient.placeLimitOrder(
          account.address,
          token.denom,
          'SELL',
          quantity.toString(),
          dualityOrderBook.bids[0].price.toString(),
        );
        console.log('Duality Sell Result:', dualitySellResult);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error executing arbitrage: ${error.message}`);
    } else {
      throw new Error('Unknown error occurred');
    }
  }
}
