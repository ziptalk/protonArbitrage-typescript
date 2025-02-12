import { MsgPlaceLimitOrder } from '@neutron-org/neutronjs/neutron/dex/tx';
import {
  createProtobufRpcClient,
  GasPrice,
  QueryClient,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { GeneratedType, OfflineSigner, Registry } from '@cosmjs/proto-signing';
import { Msg, MsgClientImpl } from '@neutron-org/neutronjs/neutron/dex/tx.rpc.msg';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import BigNumber from 'bignumber.js';
import { TOKENS_MAP, TokenSymbol } from '../../util/token';

const calculateDecimal = (input: string | number, decimals: number): string => {
  const limitSellPrice = new BigNumber(input);
  const scaleFactor = new BigNumber(10).pow(decimals);
  return limitSellPrice.times(scaleFactor).toFixed(0);
};

// Constants
const DEFAULT_GAS_PRICE = '0.025untrn';
const DEFAULT_GAS_LIMIT = '400000';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Custom error types
class LimitOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitOrderError';
  }
}

class ConnectionError extends LimitOrderError {
  constructor(message = 'Client not connected') {
    super(message);
    this.name = 'ConnectionError';
  }
}

// Enums
enum OrderType {
  GOOD_TIL_CANCELLED = 0,
  FILL_OR_KILL = 1,
  IMMEDIATE_OR_CANCEL = 2,
  JUST_IN_TIME = 3,
}

interface ClientConfig {
  gasPrice?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class DualityClient {
  private static instance: DualityClient | null = null;
  private signingClient: SigningStargateClient | null = null;
  private readonly msgClient: Msg;
  private readonly registry: Registry;
  private readonly config: Required<ClientConfig>;
  private isConnected = false;

  private constructor(
    private readonly rpcEndpoint: string,
    msgClient: Msg,
    config: ClientConfig = {},
  ) {
    this.msgClient = msgClient;
    this.registry = new Registry();
    this.registry.register('/neutron.dex.MsgPlaceLimitOrder', MsgPlaceLimitOrder as GeneratedType);
    this.config = {
      gasPrice: config.gasPrice ?? DEFAULT_GAS_PRICE,
      maxRetries: config.maxRetries ?? MAX_RETRIES,
      retryDelayMs: config.retryDelayMs ?? RETRY_DELAY_MS,
    };
  }

  public static async getInstance(
    rpcEndpoint: string,
    config?: ClientConfig,
  ): Promise<DualityClient> {
    if (!DualityClient.instance) {
      const tendermintClient = await Tendermint34Client.connect(rpcEndpoint);
      const queryClient = new QueryClient(tendermintClient);
      const rpc = createProtobufRpcClient(queryClient);
      const msgClient = new MsgClientImpl(rpc);
      DualityClient.instance = new DualityClient(rpcEndpoint, msgClient, config);
    }
    return DualityClient.instance;
  }

  private async delay(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async connect(signer: OfflineSigner, options?: { gasPrice?: string }): Promise<void> {
    try {
      this.signingClient = await SigningStargateClient.connectWithSigner(this.rpcEndpoint, signer, {
        gasPrice: GasPrice.fromString(options?.gasPrice || this.config.gasPrice),
        registry: this.registry,
      });
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new ConnectionError(
        `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount >= this.config.maxRetries) {
        throw error;
      }
      await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));
      return this.executeWithRetry(operation, retryCount + 1);
    }
  }

  async placeLimitOrder(
    address: string,
    token: string,
    side: 'BUY' | 'SELL',
    amountIn: string,
    limitPrice: string | number,
    orderType: OrderType = OrderType.IMMEDIATE_OR_CANCEL,
    maxRetries: number = 3,
    priceAdjustmentFactor: number = 1.01,
  ) {
    if (!this.isConnected || !this.signingClient) {
      throw new ConnectionError();
    }

    let currentPrice = Number(limitPrice);
    let retryCount = 0;

    while (retryCount < maxRetries) {
      const isBuySide = side === 'BUY';
      const tokenIn = isBuySide ? TOKENS_MAP.get(TokenSymbol.USDC)!.denom : token;
      const tokenOut = isBuySide ? token : TOKENS_MAP.get(TokenSymbol.USDC)!.denom;
      const calculatedAmountIn = isBuySide
        ? amountIn
        : (Number(amountIn) * Number(limitPrice)).toFixed();

      const msg = {
        typeUrl: '/neutron.dex.MsgPlaceLimitOrder',
        value: {
          creator: address,
          receiver: address,
          tokenIn,
          tokenOut,
          amountIn: calculateDecimal(calculatedAmountIn, 6),
          orderType,
          limitSellPrice: calculateDecimal(currentPrice.toString(), 27),
        },
      };

      try {
        const gasEstimation = await this.signingClient!.simulate(address, [msg], DEFAULT_GAS_LIMIT);

        const adjustedGas = Math.ceil(Number(gasEstimation) * 1.3);

        const fee = {
          amount: [{ denom: 'untrn', amount: '2103' }],
          gas: adjustedGas.toString(),
        };

        return await this.signingClient!.signAndBroadcast(address, [msg], fee);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (errorMessage.includes('Trade cannot be filled at the specified LimitPrice')) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new LimitOrderError(
              `Failed to place order after ${maxRetries} attempts: ${errorMessage}`,
            );
          }

          // Adjust price based on side: increase for BUY, decrease for SELL
          if (side === 'BUY') {
            currentPrice *= priceAdjustmentFactor;
          } else {
            currentPrice /= priceAdjustmentFactor;
          }

          console.log(
            `Retrying with adjusted price: ${currentPrice} (Attempt ${retryCount}/${maxRetries})`,
          );
          continue;
        }

        throw new LimitOrderError(`Transaction failed: ${errorMessage}`);
      }
    }

    throw new LimitOrderError('Maximum retry attempts reached');
  }

  public disconnect(): void {
    this.signingClient = null;
    this.isConnected = false;
  }
}
