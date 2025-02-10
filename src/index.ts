import dotenv from 'dotenv';
import { runBinanceDualityArbitrage } from './arbitrage/binanceDuality';
import { runAstroportDualityArbitrage } from './arbitrage/astroportDuality';

dotenv.config();

const ARBITRAGE_INTERVAL = 10000; // 10 seconds

async function startArbitrage() {
  console.log('Starting arbitrage strategies...');

  // Function to run a strategy with error handling
  const runStrategy = async (
    name: string,
    strategy: (quantity: number) => Promise<void>,
    quantity: number
  ) => {
    try {
      await strategy(quantity);
    } catch (error) {
      console.error(`Error in ${name} strategy:`, error instanceof Error ? error.message : error);
    }
  };

  // Run both strategies in intervals
  setInterval(async () => {
    console.log('\n--- Starting new arbitrage cycle ---');
    
    // Run both strategies concurrently
    await Promise.all([
      runStrategy('Binance-Duality', runBinanceDualityArbitrage, 1),
      runStrategy('Astroport-Duality', runAstroportDualityArbitrage, 1)
    ]);
    
    console.log('--- Completed arbitrage cycle ---\n');
  }, ARBITRAGE_INTERVAL);
}

// Start the arbitrage process
startArbitrage().catch((error) => {
  console.error('Fatal error in arbitrage process:', error);
  process.exit(1);
});