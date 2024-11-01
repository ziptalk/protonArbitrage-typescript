import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import dotenv from "dotenv";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { Decimal } from "@cosmjs/math";
import { GasPrice } from "@cosmjs/stargate";
import { Token, TokenPair, tokenPairsMap, tokensMap } from "./token"
import {getTokenPairContract} from "./token";

dotenv.config();

class AstroClient {
  private client: any;
  private address: string;
  private tokens: Map<string, Token>;
  private tokenPairs: Map<string, TokenPair>;

  constructor(address: string) {
    this.address = address;
    this.tokens = tokensMap;
    this.tokenPairs = tokenPairsMap;
  }

  getToken(symbol: string): Token | undefined {
    const token = this.tokens.get(symbol);
    if (!token) {
      console.warn(`토큰을 찾을 수 없습니다: ${symbol}`);
    }
    return token;
  }

  getAddress(): string {
    return this.address;
  }

  async init(mnemonic: string, rpcUrl: string): Promise<void> {
    const botWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "neutron",
    });
    const amountGas: Decimal = Decimal.fromUserInput("0.01", 6);
    const gasPrice: GasPrice = <GasPrice>{amount: amountGas, denom: "untrn"};
    this.client = await SigningCosmWasmClient.connectWithSigner(rpcUrl, botWallet, {
      gasPrice,
    });
  }

  private getTokenAddress(tokenName: string): string {
    const token = this.getToken(tokenName);
    if (!token) throw new Error(`토큰 주소를 찾을 수 없습니다: ${tokenName}`);
    return token.address;
  }

  private getAmounts(tokenName: string, amount: number, reverse = false): string {
    const token = this.getToken(tokenName);
    if (!token) throw new Error(`토큰 정보를 찾을 수 없습니다: ${tokenName}`);
    const decimals = token.decimals;
    if (reverse) return (amount / 10 ** decimals).toString();
    else return (amount * 10 ** decimals).toFixed();
  }

  async getPrice(offerAsset: string, askAsset: string, amount: number): Promise<[number, number]> {
    const contractAddress = getTokenPairContract(offerAsset, askAsset);
    if (!contractAddress) throw new Error(`토큰 컨트랙트를 찾을 수 없습니다: ${offerAsset} ${askAsset}`);

    try {
      const simulationMsg = {
        simulation: {
          offer_asset: {
            info: { native_token: { denom: this.getTokenAddress(offerAsset) } },
            amount: this.getAmounts(offerAsset, amount),
          },
        },
      };
      const reverseSimulationMsg = {
        reverse_simulation: {
          ask_asset: {
            info: { native_token: { denom: this.getTokenAddress(offerAsset) } },
            amount: this.getAmounts(offerAsset, amount),
          },
        },
      };

      const [response1, response2] = await Promise.all([
        (this.client as CosmWasmClient).queryContractSmart(contractAddress, simulationMsg),
        (this.client as CosmWasmClient).queryContractSmart(contractAddress, reverseSimulationMsg),
      ]);

      const offerAssetDecimals = this.getToken(offerAsset)!.decimals;

      const price1 = Number(response1.return_amount) / (10 ** offerAssetDecimals * amount);
      const price2 = Number(response2.offer_amount) / (10 ** offerAssetDecimals * amount);

      return [Number(price1.toFixed(4)), Number(price2.toFixed(4))];
    } catch (error) {
      console.error("가격 조회 중 오류 발생:", error);
      return [-1, -1];
    }
  }

  async swapTokens(offerToken: string, askAsset: string, amount: number): Promise<string> {
    const contractAddress = getTokenPairContract(offerToken, askAsset);
    if (!contractAddress) throw new Error(`토큰 컨트랙트를 찾을 수 없습니다: ${offerToken} ${askAsset}`);
    const address = this.address;

    try {
      const msg = {
        swap: {
          offer_asset: {
            info: { native_token: { denom: this.getTokenAddress(offerToken) } },
            amount: this.getAmounts(offerToken, amount),
          },
        },
      };
      const funds = [
        {
          amount: this.getAmounts(offerToken, amount),
          denom: this.getTokenAddress(offerToken),
        },
      ];

      const result = await (this.client as SigningCosmWasmClient).execute(
          address,
          contractAddress,
          msg,
          "auto",
          "",
          funds
      );
      console.log("스왑 결과:", result);
      return result.transactionHash;
    } catch (err) {
      console.error("스왑 실행 실패:", err);
      return "";
    }
  }

  async fetchBalance(tokenName: string): Promise<number> {
    const tokenDenom = this.getTokenAddress(tokenName);
    const balance = await this.client.getBalance(this.address, tokenDenom);
    return Number(this.getAmounts(tokenName, Number(balance.amount), true));
  }
}

export default AstroClient;