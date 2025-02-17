import WebSocket from 'ws';

interface WebSocketMap {
    [key: string]: WebSocket | null;
}

interface NumberMap {
    [key: string]: number | 0;
}

export const BINANCE = {
    name: 'BINANCE',
    exchangeType: 'CEX',
    futureSuffix: 'USDT',
    wss: [] as WebSocketMap[],
    wssDepth: [] as NumberMap[],
    wssFutureUrl: 'wss://fstream.binance.com/ws',
};