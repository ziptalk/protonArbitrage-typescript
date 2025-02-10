import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { DualityClient } from '../exchange/duality/dualityClient';
import { Token, TOKENS_MAP, TokenSymbol } from '../util/token';
import dotenv from 'dotenv';
import { DualityApi } from '../exchange/duality/dualityApi';
import AstroClient from '../exchange/astroport/astroClient';

dotenv.config();

export async function runAstroportDualityArbitrage(quantity: number) {
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

    const astroClient = new AstroClient(process.env.ACCOUNT_ADDRESS as string);
    await astroClient.init(process.env.MNEMONIC as string, process.env.RPC_URL as string);

    console.log('Connected to Duality, Astro');

    const tokens: Token[] = [
      TOKENS_MAP.get(TokenSymbol.TIA)!,
      TOKENS_MAP.get(TokenSymbol.NTRN)!,
      TOKENS_MAP.get(TokenSymbol.ATOM)!,
    ];

    const swapAmount = quantity; // Amount to swap in USDC
    const dualityAmount = (quantity * 0.195604).toString(); // Amount for Duality order

    for (const token of tokens) {
      // Get prices from both exchanges
      const astroPrice = await astroClient.getPrice(token.symbol, TokenSymbol.USDC, swapAmount);
      const dualityOrderBook = await apiClient.getOrderBook(token.symbol);

      // Compare prices and execute arbitrage if profitable
      if (astroPrice[0] > dualityOrderBook.bids[0].price) {
        // Buy on Astroport, Sell on Duality
        const astroSwapResult = await astroClient.swapTokens(TokenSymbol.USDC, token.symbol, swapAmount);
        console.log('Astroport Buy Result:', astroSwapResult);

        const dualitySellResult = await dualityClient.placeLimitOrder(
          account.address,
          token.denom,
          'SELL',
          dualityAmount,
          dualityOrderBook.bids[0].price,
        );
        console.log('Duality Sell Result:', dualitySellResult);
      } else if (astroPrice[1] < dualityOrderBook.asks[0].price) {
        // Buy on Duality, Sell on Astroport
        const dualityBuyResult = await dualityClient.placeLimitOrder(
          account.address,
          token.denom,
          'BUY',
          dualityAmount,
          dualityOrderBook.asks[0].price,
        );
        console.log('Duality Buy Result:', dualityBuyResult);

        const astroSwapResult = await astroClient.swapTokens(TokenSymbol.USDC, token.symbol, swapAmount);
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
