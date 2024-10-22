// import { mnemonicToWalletKey } from '@ton/crypto'
// import TonWeb from 'tonweb'
// import { DEX, pTON } from '@ston-fi/sdk'
// import { TonClient, toNano } from '@ton/ton'
// import {getAmounts, getTokenAddress, tokenDecimalsMap} from "./util";
// import axios from "axios";
//
// export class StonfiConnector {
//     private keyPair: any;
//     private tonWeb: any;
//     private client: any;
//     private wallet: any;
//     private tonClient: any;
//     private dex: any;
//     private authToken: any;
//     private accountId: any;
//
//     constructor(authToken: string, accountId: string) {
//         this.authToken = authToken
//         this.accountId = accountId
//     }
//     async init(mnemonic: string, apiKey: string) {
//         this.keyPair = await this.mnemonicToKeyPair(mnemonic)
//         this.tonWeb = new TonWeb()
//         this.client = new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC', {apiKey})
//         this.wallet = new this.tonWeb.wallet.all.v4R2(this.client, {publicKey: this.keyPair.publicKey})
//         this.tonClient = new TonClient({
//             endpoint: 'https://toncenter.com/api/v2/jsonRPC',
//             apiKey,
//         })
//         this.dex = this.tonClient.open(new DEX.v1.Router())
//     }
//     async mnemonicToKeyPair(mnemonic: string) {
//         const mnemonicArray = mnemonic.split(',').map(item => item.trim());
//         return await mnemonicToWalletKey(mnemonicArray);
//     }
//     async fetchUSDTBalance() {
//         const headers = {
//             Authorization: `Bearer ${this.authToken}`
//         }
//         const response = await axios.get(`https://tonapi.io/v2/accounts/${this.accountId}/jettons/${getTokenAddress('USDT')}`, { headers })
//         return response.data.balance / 10 ** 6
//     }
//     //amount : 넣을 수량
//     //minAmount : 받을 수량(예측)
//     async swapTonToUSDT(amount: number, minAmount: number) {
//         const tokenAddress = getTokenAddress('USDT')
//         const tonAmount = getAmounts('TON', amount)
//         const usdtAmount = getAmounts('USDT', minAmount * 0.99)
//         const txParams = await this.dex.getSwapTonToJettonTxParams({
//             offerAmount: BigInt(tonAmount),
//             askJettonAddress: tokenAddress,
//             minAskAmount: BigInt(usdtAmount),
//             proxyTon: new pTON.v1(),
//             userWalletAddress: (await this.wallet.getAddress()).toString(),
//         })
//         try {
//             const response = await this.wallet.methods
//                 .transfer({
//                     secretKey: this.keyPair.secretKey,
//                     toAddress: txParams.to.toString(),
//                     amount: new this.tonWeb.utils.BN(txParams.value.toString()),
//                     seqno: (await this.wallet.methods.seqno().call()) ?? 0,
//                     payload: TonWeb.boc.Cell.oneFromBoc(
//                         TonWeb.utils.base64ToBytes(txParams.body?.toBoc().toString('base64')!)
//                     ),
//                     sendMode: 3,
//                 })
//                 .send()
//             console.log(response)
//             return response
//         } catch (error) {
//             console.log("error", error)
//         }
//     }
//
//     async swapUSDTToTon(amount: number, minAmount: number) {
//         const tokenAddress = getTokenAddress('USDT')
//         const usdtAmount = getAmounts('USDT', amount)
//         const tonAmount = getAmounts('TON', minAmount * 0.99)
//         const txParams = await this.dex.getSwapJettonToTonTxParams({
//             userWalletAddress: (await this.wallet.getAddress()).toString(),
//             offerAmount: BigInt(usdtAmount),
//             minAskAmount: BigInt(tonAmount),
//             proxyTon: new pTON.v1(),
//             offerJettonAddress: tokenAddress,
//         })
//         try {
//             const response = await this.wallet.methods
//                 .transfer({
//                     secretKey: this.keyPair.secretKey,
//                     toAddress: txParams.to.toString(),
//                     amount: new this.tonWeb.utils.BN(txParams.value.toString()),
//                     seqno: (await this.wallet.methods.seqno().call()) ?? 0,
//                     payload: TonWeb.boc.Cell.oneFromBoc(
//                         TonWeb.utils.base64ToBytes(txParams.body?.toBoc().toString('base64')!)
//                     ),
//                     sendMode: 3,
//                 })
//                 .send()
//             console.log(response)
//             return response
//         } catch (error) {
//             console.log(error)
//         }
//     }
// }
//
