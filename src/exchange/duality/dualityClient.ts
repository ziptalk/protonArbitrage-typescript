import {LimitOrderType, MsgPlaceLimitOrder} from '@neutron-org/neutronjs/neutron/dex/tx';
import {
  createProtobufRpcClient,
  GasPrice, ProtobufRpcClient, QueryClient,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { GeneratedType, OfflineSigner, Registry, DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { Msg, MsgClientImpl } from '@neutron-org/neutronjs/neutron/dex/tx.rpc.msg';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import BigNumber from 'bignumber.js';
import {
  TokenSymbol,
  getTokenBySymbol,
  TokenMetadata,
  calculateTokenAmount,
  calculateDecimal,
  calculateTickPrice
} from '../../util/token';
import {createRpcQueryExtension} from "@neutron-org/neutronjs/neutron/dex/query.rpc.Query";
import { 
  QueryParamsRequest, 
  QueryParamsResponse, 
  QueryGetLimitOrderTrancheUserRequest, 
  QueryGetLimitOrderTrancheUserResponse, 
  QueryAllLimitOrderTrancheUserRequest, 
  QueryAllLimitOrderTrancheUserResponse, 
  QueryAllLimitOrderTrancheUserByAddressRequest, 
  QueryAllLimitOrderTrancheUserByAddressResponse, 
  QueryGetLimitOrderTrancheRequest, 
  QueryGetLimitOrderTrancheResponse, 
  QueryAllLimitOrderTrancheRequest, 
  QueryAllLimitOrderTrancheResponse, 
  QueryAllUserDepositsRequest, 
  QueryAllUserDepositsResponse, 
  QueryAllTickLiquidityRequest, 
  QueryAllTickLiquidityResponse, 
  QueryGetInactiveLimitOrderTrancheRequest, 
  QueryGetInactiveLimitOrderTrancheResponse, 
  QueryAllInactiveLimitOrderTrancheRequest, 
  QueryAllInactiveLimitOrderTrancheResponse, 
  QueryAllPoolReservesRequest, 
  QueryAllPoolReservesResponse, 
  QueryGetPoolReservesRequest, 
  QueryGetPoolReservesResponse, 
  QueryEstimateMultiHopSwapRequest, 
  QueryEstimateMultiHopSwapResponse, 
  QueryEstimatePlaceLimitOrderRequest, 
  QueryEstimatePlaceLimitOrderResponse, 
  QueryPoolRequest, 
  QueryPoolResponse, 
  QueryPoolByIDRequest, 
  QueryGetPoolMetadataRequest, 
  QueryGetPoolMetadataResponse, 
  QueryAllPoolMetadataRequest, 
  QueryAllPoolMetadataResponse 
} from "@neutron-org/neutronjs/neutron/dex/query";

// Constants
const DEFAULT_GAS_PRICE = '0.025untrn';
const DEFAULT_GAS_LIMIT = '400000';

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

// Custom error types
class DualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DualityError';
  }
}

class ConnectionError extends DualityError {
  constructor(message = 'Client not connected') {
    super(message);
    this.name = 'ConnectionError';
  }
}

interface ClientConfig {
  gasPrice?: string;
}

export class DualityClient {
  private static instance: DualityClient | null = null;
  private signingClient: SigningStargateClient | null = null;
  private readonly msgClient: Msg;
  private readonly queryExtension: ReturnType<typeof createRpcQueryExtension>;
  private readonly registry: Registry;
  private readonly config: Required<ClientConfig>;
  private isConnected = false;
  private address!: string;

  private constructor(
    private readonly rpcEndpoint: string,
    msgClient: Msg,
    queryExtension: ReturnType<typeof createRpcQueryExtension>,
    config: ClientConfig = {},
  ) {
    this.msgClient = msgClient;
    this.queryExtension = queryExtension;
    this.registry = new Registry();
    this.registry.register('/neutron.dex.MsgPlaceLimitOrder', MsgPlaceLimitOrder as GeneratedType);
    this.config = {
      gasPrice: config.gasPrice ?? DEFAULT_GAS_PRICE
    };
  }

  public static async getInstance(
    rpcEndpoint: string,
    mnemonic: string,
    config?: ClientConfig,
    options?: { gasPrice?: string },
  ): Promise<DualityClient> {
    if (!DualityClient.instance) {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: 'neutron',
      });
      const tendermintClient = await Tendermint34Client.connect(rpcEndpoint);
      const queryClient: QueryClient = new QueryClient(tendermintClient);
      const rpc: ProtobufRpcClient = createProtobufRpcClient(queryClient);
      const msgClient = new MsgClientImpl(rpc);
      const queryExtension = createRpcQueryExtension(queryClient);
      DualityClient.instance = new DualityClient(rpcEndpoint, msgClient, queryExtension, config);
      const address = (await wallet.getAccounts())[0].address;
      DualityClient.instance.address = address;
      try {
        DualityClient.instance.signingClient = await SigningStargateClient.connectWithSigner(
          rpcEndpoint,
          wallet,
          {
            gasPrice: GasPrice.fromString(options?.gasPrice || DualityClient.instance.config.gasPrice),
            registry: DualityClient.instance.registry,
          },
        );
        DualityClient.instance.isConnected = true;
      } catch (error) {
        DualityClient.instance.isConnected = false;
        throw new ConnectionError(
          `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return DualityClient.instance;
  }

  async getParams(request?: QueryParamsRequest): Promise<QueryParamsResponse> {
    return await this.queryExtension.params(request || {});
  }

  async getLimitOrderTrancheUser(
    request: QueryGetLimitOrderTrancheUserRequest,
  ): Promise<QueryGetLimitOrderTrancheUserResponse> {
    return await this.queryExtension.limitOrderTrancheUser(request);
  }

  async getAllLimitOrderTrancheUsers(
    request?: QueryAllLimitOrderTrancheUserRequest
  ): Promise<QueryAllLimitOrderTrancheUserResponse> {
    return await this.queryExtension.limitOrderTrancheUserAll(request || {});
  }

  async getLimitOrderTranche(
    request: QueryGetLimitOrderTrancheRequest,
  ): Promise<QueryGetLimitOrderTrancheResponse> {
    return await this.queryExtension.limitOrderTranche(request);
  }

  async getLimitOrderTranchesByAddress(
    request: QueryAllLimitOrderTrancheUserByAddressRequest,
  ): Promise<QueryAllLimitOrderTrancheUserByAddressResponse> {
    return await this.queryExtension.limitOrderTrancheUserAllByAddress(request);
  }

  async getAllLimitOrderTranches(
    request: QueryAllLimitOrderTrancheRequest
  ): Promise<QueryAllLimitOrderTrancheResponse> {
    return await this.queryExtension.limitOrderTrancheAll(request);
  }

  async getTickLiquidity(
    request: QueryAllTickLiquidityRequest
  ): Promise<QueryAllTickLiquidityResponse> {
    return await this.queryExtension.tickLiquidityAll(request);
  }

  async getPoolReserves(
    request: QueryGetPoolReservesRequest
  ): Promise<QueryGetPoolReservesResponse> {
    return await this.queryExtension.poolReserves(request);
  }

  async getAllPoolReserves(
    request: QueryAllPoolReservesRequest
  ): Promise<QueryAllPoolReservesResponse> {
    return await this.queryExtension.poolReservesAll(request);
  }

  private checkConnection(): void {
    if (!this.isConnected || !this.signingClient) {
      throw new ConnectionError();
    }
  }
  getAddress(): string {
    return this.address;
  }
  async placeLimitOrder(
    address: string,
    token: TokenMetadata,
    side: 'BUY' | 'SELL',
    amountIn: string,
    limitPrice: string | number,
    orderType: LimitOrderType = LimitOrderType.IMMEDIATE_OR_CANCEL,
    maxRetries: number = 3,
    priceAdjustmentFactor: number = 1.01,
  ) {
    this.checkConnection();

    let currentPrice = Number(limitPrice);
    let retryCount = 0;

    while (retryCount < maxRetries) {
      const isBuySide = side === 'BUY';
      const tokenIn = isBuySide ? getTokenBySymbol(TokenSymbol.USDC).denom : token.denom;
      const tokenOut = isBuySide ? token.denom : getTokenBySymbol(TokenSymbol.USDC).denom;
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
            throw new DualityError(
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

        throw new DualityError(`Transaction failed: ${errorMessage}`);
      }
    }

    throw new DualityError('Maximum retry attempts reached');
  }

  async getOrderBook(tokenIn: TokenMetadata, tokenOut: TokenMetadata, limit: number = 5): Promise<OrderBook> {
    try {
      const pairId = `${tokenIn.denom}<>${tokenOut.denom}`;

      // Fetch asks and bids data in parallel
      const [asksData, bidsData] = await Promise.all([
        this.getTickLiquidity({
          pairId,
          tokenIn: tokenIn.denom
        }),
        this.getTickLiquidity({
          pairId,
          tokenIn: tokenOut.denom
        })
      ]);

      // Helper function to process tick data
      const processTickData = (
          tick: any,
          isAsk: boolean,
          token: TokenMetadata
      ): { price: number; quantity: number } | null => {
        const processReserves = (
            key: any,
            reserves: string,
            isBid: boolean
        ) => {
          const tickIndex = Number(key.tickIndexTakerToMaker?.toString() || '0');
          const basePrice = calculateTickPrice(tickIndex);
          const price = isBid ? 1 / basePrice : basePrice;
          const quantity = calculateTokenAmount(reserves, token);

          if (quantity === 0) return null;

          return {
            price,
            quantity: isBid ? quantity / price : quantity
          };
        };

        if (tick.poolReserves?.key) {
          return processReserves(
              tick.poolReserves.key,
              tick.poolReserves.reservesMakerDenom || '0',
              !isAsk
          );
        }

        if (tick.limitOrderTranche?.key) {
          return processReserves(
              tick.limitOrderTranche.key,
              tick.limitOrderTranche.totalMakerDenom || '0',
              !isAsk
          );
        }

        return null;
      };

      // Process orderbook data
      const orderBook: OrderBook = {
        asks: [],
        bids: []
      };

      // Process asks - sort by price ascending (lowest first) and take top N
      if (asksData.tickLiquidity) {
        orderBook.asks = asksData.tickLiquidity
            .map(tick => processTickData(tick, true, tokenIn))
            .filter((item): item is { price: number; quantity: number } => item !== null)
            .sort((a, b) => a.price - b.price)
            .slice(0, limit);
      }

      // Process bids - sort by price descending (highest first) and take top N
      if (bidsData.tickLiquidity) {
        orderBook.bids = bidsData.tickLiquidity
            .map(tick => processTickData(tick, false, tokenOut))
            .filter((item): item is { price: number; quantity: number } => item !== null)
            .sort((a, b) => b.price - a.price)
            .slice(0, limit);
      }

      return orderBook;
    } catch (error) {
      console.error("Error fetching orderbook:", error);
      throw error;
    }
  }

  public disconnect(): void {
    this.signingClient = null;
    this.isConnected = false;
  }
}
