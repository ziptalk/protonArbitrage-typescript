import {log} from "../util/logger";
import {DualityClient} from "../exchange/duality/dualityClient";
import {cancelAllOpenOrders, getListenKey, modifyOrder, placeLimitOrder} from "../exchange/binance/rest/binanceClient";
import {privateBinanceWebsocket} from "../exchange/binance/websocket/privateWebsocket";
import {getTokenBySymbol, TokenSymbol} from "../util/token";
import {init} from "./init";


export class TradeState {
    private ntrnAmount: number = process.env.NTRN_AMOUNT ? parseFloat(process.env.NTRN_AMOUNT) : 1;
    private usdtAmount: number = 0;
    private ntrnUSDTPrice: number = -1;
    private usdtNTRNPrice: number = -1;
    private orderId: number = -1;
    private currentOrderSide: "BUY" | "SELL" = "BUY";
    constructor() {}

    updatePrices(ntrnUsdt: number, usdtNtrn: number) {
        this.ntrnUSDTPrice = ntrnUsdt;
        this.usdtNTRNPrice = usdtNtrn;
    }

    updateOrderId(orderId: number) {
        this.orderId = orderId;
    }

    updateUsdtAmount(amount: number) {
        this.usdtAmount = amount;
        log(`Updated USDT amount: ${amount}`);
    }

    updateOrderSide(side: "BUY" | "SELL") {
        this.currentOrderSide = side;
        log(`Updated order side to: ${side}`);
    }

    getState() {
        return {
            ntrnAmount: this.ntrnAmount,
            usdtAmount: this.usdtAmount,
            ntrnUSDTPrice: this.ntrnUSDTPrice,
            usdtNTRNPrice: this.usdtNTRNPrice,
            orderId: this.orderId,
            currentOrderSide: this.currentOrderSide,
        };
    }
}

export class OrderManager {
    constructor(
        public binanceClient: any,
        public dualityClient: DualityClient,
        private tradeState: TradeState
    ) {}

    async waitForBalanceUpdate(checkInterval: number): Promise<number> {
        return new Promise((resolve) => {
            const intervalId = setInterval(async () => {
                const usdtAmount = await this.dualityClient.fetchUSDTBalance();
                log(`USDT balance: ${usdtAmount}`);
                if (usdtAmount > 0) {
                    clearInterval(intervalId);
                    resolve(usdtAmount);
                }
            }, checkInterval);
        });
    }

    async initialize() {
        await cancelAllOpenOrders(this.binanceClient);

        const state = this.tradeState.getState();

        const orderId = await placeLimitOrder(
            this.binanceClient,
            state.ntrnUSDTPrice + OrderManager.BUY_ADJUSTMENT,
            state.ntrnAmount,
            "BUY"
        );
        this.tradeState.updateOrderId(orderId);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    static readonly SWAP_SLIPPAGE = process.env.SWAP_SLIPPAGE ? parseFloat(process.env.SWAP_SLIPPAGE) : 0.99;
    static readonly BUY_ADJUSTMENT = process.env.BUY_ADJUSTMENT ? parseFloat(process.env.BUY_ADJUSTMENT) : -0.03;
    static readonly SELL_ADJUSTMENT = process.env.SELL_ADJUSTMENT ? parseFloat(process.env.SELL_ADJUSTMENT) : 0.03;
    static readonly DUALITY_INTERVAL = process.env.DUALITY_INTERVAL ? parseFloat(process.env.DUALITY_INTERVAL) : 3000;
    static readonly BALANCE_INTERVAL = process.env.BALANCE_INTERVAL ? parseFloat(process.env.BALANCE_INTERVAL) : 3000;

    static {
        log('Environment variables loaded:');
        log(`SWAP_SLIPPAGE: ${OrderManager.SWAP_SLIPPAGE}`);
        log(`BUY_ADJUSTMENT: ${OrderManager.BUY_ADJUSTMENT}`);
        log(`SELL_ADJUSTMENT: ${OrderManager.SELL_ADJUSTMENT}`);
        log(`DUALITY_INTERVAL: ${OrderManager.DUALITY_INTERVAL}`);
        log(`BALANCE_INTERVAL: ${OrderManager.BALANCE_INTERVAL}`);
    }
}

class PriceMonitor {
    constructor(private tradeState: TradeState, private orderManager: OrderManager) {}

    async startMonitoring() {
        setInterval(async () => {
            try {
                const state = this.tradeState.getState();
                const [newNtrnUsdtPrice, newUsdtNtrnPrice] = await this.orderManager.dualityClient.getOrderBook(getTokenBySymbol(TokenSymbol.NTRN));
                // console.log("NTRN/USDT Price:", newNtrnUsdtPrice, "USDT/NTRN Price:", newUsdtNtrnPrice);

                if (state.ntrnUSDTPrice === 0 || state.usdtNTRNPrice === 0) {
                    this.tradeState.updatePrices(newNtrnUsdtPrice, newUsdtNtrnPrice);
                    log("Initial price update");
                    log(`NTRN/USDT Price: ${newNtrnUsdtPrice} USDT/NTRN Price: ${newUsdtNtrnPrice}`);
                } else if (state.ntrnUSDTPrice !== newNtrnUsdtPrice || state.usdtNTRNPrice !== newUsdtNtrnPrice) {
                    this.tradeState.updatePrices(newNtrnUsdtPrice, newUsdtNtrnPrice);

                    if (state.currentOrderSide === "BUY") {
                        await modifyOrder(this.orderManager.binanceClient, state.orderId, "BUY", newNtrnUsdtPrice + OrderManager.BUY_ADJUSTMENT, state.ntrnAmount);
                    } else {
                        await modifyOrder(this.orderManager.binanceClient, state.orderId, "SELL", newUsdtNtrnPrice + OrderManager.SELL_ADJUSTMENT, state.ntrnAmount);
                    }
                    log(`Price changed, modified ${state.currentOrderSide} order`);
                } else {
                    return;
                }
            } catch (error: any) {
                if (error.toString().includes('No need to modify the order')) {
                    log('Order price is already optimal, no modification needed');
                    return;
                }
                log(`Error in price monitoring: ${error}`);
            }
        }, OrderManager.DUALITY_INTERVAL);
    }
}

async function cleanup(binanceClient: any, tradeState: TradeState) {
    try {
        log('Starting cleanup process...');
        const state = tradeState.getState();

        // Cancel all open orders
        await cancelAllOpenOrders(binanceClient);
        log('Cancelled all open orders');

        // If there's an active order, wait a bit to ensure it's cancelled
        if (state.orderId !== -1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        log('Cleanup completed successfully');
    } catch (error) {
        log(`Error during cleanup: ${error}`);
    }
}

async function main() {
    const { binanceClient, dualityClient } = await init();
    const tradeState = new TradeState();
    const orderManager = new OrderManager(binanceClient, dualityClient, tradeState);

    // Setup shutdown handlers
    const shutdownHandler = async () => {
        log('Shutdown signal received, starting graceful shutdown...');
        await cleanup(binanceClient, tradeState);
        process.exit(0);
    };

    // Handle both SIGINT (Ctrl+C) and SIGTERM (pm2 shutdown)
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    const priceMonitor = new PriceMonitor(tradeState, orderManager);
    await priceMonitor.startMonitoring();

    while(tradeState.getState().ntrnUSDTPrice === -1 || tradeState.getState().usdtNTRNPrice === -1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await orderManager.initialize();

    privateBinanceWebsocket(
       'NTRN',
        await getListenKey(binanceClient),
        binanceClient,
        tradeState,
        (side) => {
            tradeState.updateOrderSide(side === "BUY" ? "SELL" : "BUY");
            return {
                state: tradeState.getState(),
                orderManager
            };
        }
    );
}

main().catch((err) => log(err));
