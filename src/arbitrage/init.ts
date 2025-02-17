import {DualityClient} from "../exchange/duality/dualityClient";
import {initRest} from "../exchange/binance/rest/binanceClient";

import dotenv from 'dotenv';
dotenv.config();

export async function init() {
    const dualityClient = await DualityClient.getInstance(
        process.env.RPC_URL as string,
        process.env.MNEMONIC as string,
        {
            gasPrice: '0.025untrn',
        }
    );

    const binanceClient = await initRest(
        process.env.BINANCE_API_KEY as string,
        process.env.BINANCE_API_SECRET as string,
    );

    console.log('Connected to Duality, Binance');
    console.log('Starting arbitrage monitoring...');
    return {binanceClient, dualityClient};
}
