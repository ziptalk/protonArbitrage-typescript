import WebSocket from "ws";
import {placeLimitOrder, keepAliveListenKey} from "../rest/binanceClient";
import {USDMClient} from "binance";
import {OrderManager, TradeState} from "../../../arbitrage/newArbitrage";
import {BINANCE} from "../../../util/exchange";
import {log} from "../../../util/logger";

interface OrderCallbackResult {
    state: any;
    orderManager: OrderManager;
}

async function handleOrderCycle(
    tradeState: TradeState,
    result: OrderCallbackResult
) {
    const { state, orderManager } = result;

    try {
        console.log("handleOrderCycle", state)
        if (result.state.currentOrderSide === "SELL") {
            // const swapPromise = orderManager.dualityClient.swapNTRNToUSDT(state.tonAmount);
            // const [newUsdtAmount, newOrderId] = await Promise.all([
            //     swapPromise.then(() => orderManager.waitForBalanceUpdate(OrderManager.BALANCE_INTERVAL)),
            //     placeLimitOrder(orderManager.binanceClient, state.usdtTonPrice + OrderManager.SELL_ADJUSTMENT, state.tonAmount, "SELL")
            // ]);
            // tradeState.updateUsdtAmount(newUsdtAmount);
            // tradeState.updateOrderId(newOrderId);
        } else {
            // const swapPromise = await orderManager.dualityClient.swapUSDTToNTRN(state.usdtAmount)
            // const [, newOrderId] = await Promise.all([
            //     swapPromise,
            //     placeLimitOrder(orderManager.binanceClient, state.tonUsdtPrice + OrderManager.BUY_ADJUSTMENT, state.tonAmount, "BUY")
            // ]);
            // tradeState.updateOrderId(newOrderId);
        }
    } catch (error) {
        throw error
    }
}

export function privateBinanceWebsocket(
    _symbol: string,
    _listenKey: string,
    _binanceClient: USDMClient,
    tradeState: TradeState,
    orderCallback: (side: "BUY" | "SELL") => OrderCallbackResult
) {
    const existingIndex = BINANCE.wss.findIndex((item) => Object.keys(item)[0] === "P" + _symbol);

    let ws: WebSocket;
    if (existingIndex === -1) {
        ws = createPrivateWebSocket(_symbol, _listenKey, _binanceClient, tradeState, orderCallback);
        BINANCE.wss.push({ ["P" + _symbol]: ws });
    } else {
        return;
    }

    function createPrivateWebSocket(
        _symbol: string,
        _listenKey: string,
        _binanceClient: USDMClient,
        tradeState: TradeState,
        orderCallback: (side: "BUY" | "SELL") => OrderCallbackResult
    ): WebSocket {
        const ws = new WebSocket(`${BINANCE.wssFutureUrl}/ws/${_listenKey}`);

        const keepaliveInterval = setInterval(async () => {
            try {
                await keepAliveListenKey(_binanceClient);
                log('Keepalive sent successfully');
            } catch (error) {
                log(`Keepalive error: ${error}`);
            }
        }, 57 * 60 * 1000);

        ws.onopen = () => {
            const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul", hour12: false });
            log(`${BINANCE.name} [${_symbol}]'s Private Stream Connected at ${timestamp}`);
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data.toString());
                if (data.e === "ORDER_TRADE_UPDATE" && data.o.X === "FILLED") {
                    if (data.o.S === "BUY") {
                        log("BUY order filled, preparing next SELL cycle"+ data.o);
                        const result = orderCallback(tradeState.getState().currentOrderSide);
                        log(result.state)
                        await handleOrderCycle(tradeState, result);
                    } else if (data.o.S === "SELL") {
                        log("SELL order filled, preparing next BUY cycle"+ data.o);
                        const result = orderCallback(tradeState.getState().currentOrderSide);
                        log(result.state)
                        await handleOrderCycle(tradeState, result);
                    }
                }
            } catch (error) {
                throw error
            }
        };

        ws.onerror = (error) => {
            log(`WebSocket Error: ${error}`);
        };

        ws.onclose = () => {
            log("WebSocket Connection Closed");
            clearInterval(keepaliveInterval);
        };

        return ws;
    }
}