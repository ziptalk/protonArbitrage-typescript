import {USDMClient} from "binance";
import {placeOrder} from "./binance/rest/placeOrder";
import AstroClient from "./astroport/astroClient";
import dotenv from "dotenv";
dotenv.config()
export async function init() {
    const binanceClient = new USDMClient({
        api_key: process.env.BINANCE_API_KEY as string,
        api_secret: process.env.BINANCE_API_SECRET as string,
    });
    const astroClient = new AstroClient(process.env.ACCOUNT_ADDRESS as string)
    await astroClient.init(process.env.MNEMONIC as string, process.env.RPC_URL as string)
    console.log("init")
    const openGap = process.env.OPEN_GAP as string
    const closeGap = process.env.CLOSE_GAP as string
    return { binanceClient, astroClient, openGap, closeGap }
}
export async function swap(binanceClient: USDMClient, astroClient: AstroClient, ntrnAmount: number, isOpen: boolean, usdtAmount? : number) {
    if(isOpen){
        await Promise.all([placeOrder(binanceClient, ntrnAmount, 'BUY'), astroClient.swapNtrnToUsdc(ntrnAmount)])
    }
    else if(usdtAmount){
        await Promise.all([placeOrder(binanceClient, ntrnAmount, 'SELL'), astroClient.swapUsdcToNtrn(usdtAmount)])
    }
    else console.log("error")
}
