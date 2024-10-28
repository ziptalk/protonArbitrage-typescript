import {CosmWasmClient, SigningCosmWasmClient} from "@cosmjs/cosmwasm-stargate";
import dotenv from "dotenv";
import {DirectSecp256k1HdWallet} from "@cosmjs/proto-signing";
import {Decimal} from "@cosmjs/math";
import {GasPrice} from "@cosmjs/stargate";

dotenv.config();

class AstroClient {
  private client: any;
  private address: string
  private readonly tokenAddressMap: Record<string, string>;
  private readonly tokenDecimalsMap: Record<string, number>;

  constructor(address : string) {
    this.address = address
    this.tokenAddressMap = {
      NTRN: "untrn",
      USDC: "ibc/B559A80D62249C8AA07A380E2A2BEA6E5CA9A6F079C912C3A9E9B494105E4F81",
      axlUSDT: "ibc/57503D7852EF4E1899FE6D71C5E81D7C839F76580F86F21E39348FC2BC9D7CE2",
    };
    this.tokenDecimalsMap = {
      NTRN: 6,
      USDC: 6,
      axlUSDT: 6,
    };
  }

  async init(mnemonic: string, rpcUrl: string): Promise<void> {

    const botWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "neutron",
    });
    const amountGas: Decimal = Decimal.fromUserInput((0.15).toString(), 6)
    const gasPrice: GasPrice = <GasPrice>{amount: amountGas, denom: 'untrn'};
    this.client = await SigningCosmWasmClient.connectWithSigner(
        rpcUrl,
        botWallet,
        {gasPrice}
    )
  }

  private getTokenAddress(tokenName: string): string {
    const address = this.tokenAddressMap[tokenName];
    if (!address) throw new Error(`Token address not found for token name: ${tokenName}`);
    return address;
  }

  private getAmounts(tokenName: string, amount: number, reverse = false): string {
    const decimals = this.tokenDecimalsMap[tokenName];
    if (decimals === undefined) throw new Error(`Token decimals not found for token name: ${tokenName}`);
    if(reverse) return (amount / 10 ** decimals).toString();
    else return (amount * 10 ** decimals).toFixed();
  }

  async getPrice(amount: number): Promise<[number, number]> {
    const contractAddr = process.env.USDC_NTRN_CONTRACT as string;
    const offerAsset = 'NTRN';

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
        (this.client as CosmWasmClient).queryContractSmart(contractAddr, simulationMsg),
        (this.client as CosmWasmClient).queryContractSmart(contractAddr, reverseSimulationMsg),
      ]);
      const price1 = Number(response1.return_amount) / (10 ** this.tokenDecimalsMap[offerAsset] * amount);
      const price2 = Number(response2.offer_amount) / (10 ** this.tokenDecimalsMap[offerAsset] * amount);

      return [Number(price1.toFixed(4)), Number(price2.toFixed(4))];
    } catch (error) {
      console.error('Error fetching prices:', error);
      return [-1, -1];
    }
  }

  async swapNtrnToUsdc(offerAmount: number): Promise<string> {
    const offerToken = 'NTRN';
    const contractAddress = process.env.USDC_NTRN_CONTRACT as string;
    const address = process.env.ACCOUNT_ADDRESS as string;
    try {
      const msg = {
        swap: {
          offer_asset: {
            info: { native_token: { denom: this.getTokenAddress(offerToken) } },
            amount: this.getAmounts(offerToken, offerAmount),
          },
        },
      };
      const funds = [{ amount: this.getAmounts(offerToken, offerAmount), denom: this.getTokenAddress(offerToken) }];

      const result = await (this.client as SigningCosmWasmClient).execute(
          address,
          contractAddress,
          msg,
          'auto',
          "",
          funds
      );
      console.log(result)
      return result.transactionHash
    } catch (err) {
      console.error("Swap execution failed:", err);
      return "" ;
    }
  }

  async swapUsdcToNtrn(askAmount: number): Promise<string> {
    const askToken = 'USDC';
    const contractAddress = process.env.USDC_NTRN_CONTRACT as string;
    const address = process.env.ACCOUNT_ADDRESS as string;
    try {
      const msg = {
        swap: {
          offer_asset: {
            info: { native_token: { denom: this.getTokenAddress(askToken) } },
            amount: this.getAmounts(askToken, askAmount),
          },
        },
      };
      const funds = [{ amount: this.getAmounts(askToken, askAmount), denom: this.getTokenAddress(askToken) }];

      const result = await (this.client as SigningCosmWasmClient).execute(
          address,
          contractAddress,
          msg,
          'auto',
          "",
          funds
      );
      console.log(result)
      return result.transactionHash
    } catch (err) {
      console.error("Swap execution failed:", err);
      return ''
    }
  }

  async fetchBalance(): Promise<number> {
    const tokenDenom = this.getTokenAddress('USDC');
    const balance = await this.client.getBalance(this.address, tokenDenom);
    return Number(this.getAmounts('USDC', Number(balance.amount), true));
  }
}

export default AstroClient;