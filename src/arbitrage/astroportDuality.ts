import {DirectSecp256k1HdWallet} from '@cosmjs/proto-signing';
import {DualityClient} from '../exchange/duality/dualityClient';
import {getTokenBySymbol, TokenMetadata, TokenSymbol} from '../util/token';
import dotenv from 'dotenv';
import AstroClient from '../exchange/astroport/astroClient';

dotenv.config();

export async function runAstroportDualityArbitrage(quantity: number) {
  try {
    const dualityClient = await DualityClient.getInstance(
      process.env.RPC_URL as string,
        process.env.MNEMONIC as string,
      {
        gasPrice: '0.025untrn',
      }
    );

    const astroClient = new AstroClient(process.env.ACCOUNT_ADDRESS as string);
    await astroClient.init(process.env.MNEMONIC as string, process.env.RPC_URL as string);

    console.log('Connected to Duality, Astro');

    const tokens: TokenMetadata[] = [
      getTokenBySymbol(TokenSymbol.TIA)!,
      getTokenBySymbol(TokenSymbol.NTRN)!,
      getTokenBySymbol(TokenSymbol.ATOM)!,
    ];

    const swapAmount = quantity; // Amount to swap in USDC
    const dualityAmount = (quantity * 0.195604).toString(); // Amount for Duality order

    for (const token of tokens) {
      // Get prices from both exchanges
      const astroPrice = await astroClient.getPrice(token.symbol, TokenSymbol.USDC, swapAmount);
      const dualityOrderBook = await dualityClient.getOrderBook(token, getTokenBySymbol(TokenSymbol.USDC));

      // Compare prices and execute arbitrage if profitable
      if (astroPrice[0] > dualityOrderBook.bids[0].price) {
        // Buy on Astroport, Sell on Duality
        const astroSwapResult = await astroClient.swapTokens(getTokenBySymbol(TokenSymbol.USDC)!.symbol, token.symbol, swapAmount);
        console.log('Astroport Buy Result:', astroSwapResult);

        const dualitySellResult = await dualityClient.placeLimitOrder(
            dualityClient.getAddress(),
            token,
          'SELL',
          dualityAmount,
          dualityOrderBook.bids[0].price,
        );
        console.log('Duality Sell Result:', dualitySellResult);
      } else if (astroPrice[1] < dualityOrderBook.asks[0].price) {
        // Buy on Duality, Sell on Astroport
        const dualityBuyResult = await dualityClient.placeLimitOrder(
            dualityClient.getAddress(),
          token,
          'BUY',
          dualityAmount,
          dualityOrderBook.asks[0].price,
        );
        console.log('Duality Buy Result:', dualityBuyResult);

        const astroSwapResult = await astroClient.swapTokens(getTokenBySymbol(TokenSymbol.USDC)!.symbol, token.symbol, swapAmount);
        console.log('Astroport Sell Result:', astroSwapResult);
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

// Run the example
runAstroportDualityArbitrage(1).catch(console.error);
