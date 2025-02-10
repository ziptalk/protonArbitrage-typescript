import axios from 'axios';
import { LimitOrderTrancheUser } from '@neutron-org/neutronjs/neutron/dex/limit_order_tranche_user';
import { LimitOrderTranche } from '@neutron-org/neutronjs/neutron/dex/limit_order_tranche';
import { PageRequestParams } from '@neutron-org/neutronjs/helpers';
import { PoolReserves, PoolReservesKey } from '@neutron-org/neutronjs/neutron/dex/pool_reserves';
import { PageResponse } from '@neutron-org/neutronjs/cosmos/base/query/v1beta1/pagination';
import { TickLiquidity } from '@neutron-org/neutronjs/neutron/dex/tick_liquidity';
import { Pool } from '@neutron-org/neutronjs/neutron/dex/pool';
import { PoolMetadata } from '@neutron-org/neutronjs/neutron/dex/pool_metadata';
import { SimulationResponse } from '@neutron-org/neutronjs/cosmos/base/abci/v1beta1/abci';
import { SimulateRequest } from '@neutron-org/neutronjs/cosmos/tx/v1beta1/service';
import {
  QueryGetLimitOrderTrancheRequest,
  QueryGetLimitOrderTrancheResponse,
  QueryGetLimitOrderTrancheUserRequest,
  QueryGetLimitOrderTrancheUserResponse,
  QueryParamsResponse,
} from '@neutron-org/neutronjs/neutron/dex/query';
import { TokenPair, TOKENS_MAP, TokenSymbol } from '../../util/token';
import {TradePairID} from "@neutron-org/neutronjs/neutron/dex/trade_pair_id";

export function calculateNTRNAmount(amount: string): number {
  return Number(amount) / 10 ** 6;
}

export function calculateTickPrice(tickIndex: number): number {
  // p(i) = 1.0001^i
  return Math.pow(1.0001, tickIndex);
}

interface OrderBookLevel {
  price: number;
  quantity: number;
}

interface OrderBook {
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
}

export class DualityApi {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
    });
  }
  private axiosInstance: any;
  private baseURL = 'https://neutron-rest.publicnode.com/neutron/dex';

  // Query DEX parameters
  async getParams(): Promise<QueryParamsResponse> {
    const response = await this.axiosInstance.get('/params');
    return response.data;
  }

  // Query limit order tranche user
  async getLimitOrderTrancheUser(
      request: QueryGetLimitOrderTrancheUserRequest,
  ): Promise<QueryGetLimitOrderTrancheUserResponse> {
    const { address, trancheKey, calcWithdrawableShares } = request;
    const params = new URLSearchParams();
    if (calcWithdrawableShares) {
      params.append('calc_withdrawable_shares', String(calcWithdrawableShares));
    }

    const response = await this.axiosInstance.get(
        `/limit_order_tranche_user/${address}/${trancheKey}`,
        { params },
    );
    return response.data;
  }

  // Query all limit order tranche users with pagination
  async getAllLimitOrderTrancheUsers(pagination?: PageRequestParams): Promise<{
    limit_order_tranche_user: LimitOrderTrancheUser[];
    pagination: PageResponse;
  }> {
    const response = await this.axiosInstance.get('/limit_order_tranche_user', {
      params: pagination,
    });
    return response.data;
  }

  // Query limit order tranche
  async getLimitOrderTranche(
      request: QueryGetLimitOrderTrancheRequest,
  ): Promise<QueryGetLimitOrderTrancheResponse> {
    const { pairId, tickIndex, tokenIn, trancheKey } = request;
    const response = await this.axiosInstance.get(
        `/limit_order_tranche/${pairId}/${tokenIn}/${tickIndex}/${trancheKey}`,
    );
    return response.data;
  }

  // Query all limit order tranches by address
  async getLimitOrderTranchesByAddress(
      address: string,
      pagination?: PageRequestParams,
  ): Promise<{
    limitOrderTranches: LimitOrderTranche[];
    pagination: PageResponse;
  }> {
    const response = await this.axiosInstance.get(`/limit_order_tranche_user_all/${address}`, {
      pagination,
    });
    return response.data;
  }

  // Get all limit order tranches
  async getAllLimitOrderTranches(
      pairId: string,
      tokenIn: string,
      pagination?: PageRequestParams,
  ): Promise<{
    limitOrderTranches: LimitOrderTranche[];
    pagination: PageResponse;
  }> {
    // const encodedPairId = this.encodeParameter(pairId);
    // const encodedTokenIn = this.encodeParameter(tokenIn);
    const url = `/limit_order_tranche/${pairId}/${tokenIn}`;
    const response = await this.axiosInstance.get(url, { pagination });
    return response.data;
  }

  // Get tick liquidity
  async getTickLiquidity(
      pairId: string,
      tokenIn: string,
      pagination?: PageRequestParams,
  ): Promise<{
    tickLiquidities: TickLiquidity[];
    pagination: PageResponse;
  }> {
    const response = await this.axiosInstance.get(`/tick_liquidity/${pairId}/${tokenIn}`, {
      pagination,
    });
    return response.data;
  }

  // Get pool reserves
  async getPoolReserves(
      pairId: string,
      tokenIn: string,
      tickIndex: number,
      fee: number,
  ): Promise<PoolReserves | null> {
    try {
      const response = await this.axiosInstance.get(
          `/neutron/dex/pool_reserves/${pairId}/${tokenIn}`,
          {
            params: {
              tick_index: tickIndex,
              fee,
            },
          },
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching pool reserves:', error);
      return null;
    }
  }

  // Get all pool reserves
  async getAllPoolReserves(
      pairId: string,
      tokenIn: string,
      pagination?: PageRequestParams,
  ): Promise<{
    poolReserves: PoolReserves[];
    pagination: PageResponse;
  }> {
    const response = await this.axiosInstance.get(`/pool_reserves/${pairId}/${tokenIn}`, {
      pagination,
    });
    return response.data;
  }

  // Get inactive limit order tranche
  async getInactiveLimitOrderTranche(
      pairId: string,
      tokenIn: string,
      tickIndex: number,
      trancheKey: string,
  ): Promise<LimitOrderTranche> {
    const response = await this.axiosInstance.get(
        `/filled_limit_order_tranche/${pairId}/${tokenIn}/${tickIndex}/${trancheKey}`,
    );
    return response.data;
  }

  // Get all inactive limit order tranches
  async getAllInactiveLimitOrderTranches(pagination?: PageRequestParams): Promise<{
    limitOrderTranches: LimitOrderTranche[];
    pagination: PageResponse;
  }> {
    const response = await this.axiosInstance.get('/filled_limit_order_tranche', { pagination });
    return response.data;
  }

  // Get pool by key
  async getPoolByKey(pairId: string, tickIndex: number, fee: number): Promise<Pool> {
    const response = await this.axiosInstance.get(`/pool/${pairId}/${tickIndex}/${fee}`);
    return response.data;
  }

  // Get pool by ID
  async getPoolById(poolId: string): Promise<Pool> {
    const response = await this.axiosInstance.get(`/pool/${poolId}`);
    return response.data;
  }

  // Get pool metadata
  async getPoolMetadata(id: string): Promise<PoolMetadata> {
    const response = await this.axiosInstance.get(`/pool_metadata/${id}`);
    return response.data;
  }

  // Get all pool metadata
  async getAllPoolMetadata(pagination?: PageRequestParams): Promise<{
    poolMetadata: PoolMetadata[];
    pagination: PageResponse;
  }> {
    const response = await this.axiosInstance.get('/pool_metadata', { pagination });
    return response.data;
  }

  // Simulation endpoints
  async simulatePlaceLimitOrder(request: SimulateRequest): Promise<SimulationResponse> {
    const response = await this.axiosInstance.get('/simulate_place_limit_order', {
      params: request,
    });
    return response.data;
  }

  private encodeParameter(param: string): string {
    // Replace forward slash with a safe character sequence
    return param.replace(/\//g, '__');
  }

  private decodePairId(param: string): string {
    // Convert back to original format
    return param.replace(/---/g, '/');
  }

  async getOrderBook(token: TokenSymbol): Promise<OrderBook> {
    try {
      let allOrders: LimitOrderTrancheUser[] = [];
      let nextKey: string | null = null;

      do {
        const pageRequest: PageRequestParams = {
          'pagination.count_total': false,
          'pagination.key': nextKey ? nextKey : undefined,
          'pagination.offset': '0',
          'pagination.reverse': false,
          'pagination.limit': '100',
        };

        const result = await this.getAllLimitOrderTrancheUsers(pageRequest);
        allOrders = [...allOrders, ...result.limit_order_tranche_user];
        nextKey = result.pagination.next_key ? result.pagination.next_key.toString() : null;
      } while (nextKey);
      const filteredResults = allOrders.filter((order: LimitOrderTrancheUser) => {
        const pair: TradePairID | undefined = order.trade_pair_id;

        const activeShares =
            BigInt(order.shares_owned) -
            BigInt(order.shares_withdrawn) -
            BigInt(order.shares_cancelled);
        if (activeShares <= BigInt(0)) {
          return false;
        }

        return (
            (pair?.maker_denom === TOKENS_MAP.get(token)?.denom &&
                pair?.taker_denom === TOKENS_MAP.get(TokenSymbol.USDC)?.denom) ||
            (pair?.maker_denom === TOKENS_MAP.get(TokenSymbol.USDC)?.denom &&
                pair?.taker_denom === TOKENS_MAP.get(token)?.denom)
        );
      });

      const priceMap = new Map<number, { quantity: number; orders: typeof filteredResults }>();

      filteredResults.forEach((order) => {
        const price = calculateTickPrice(Number(order.tick_index_taker_to_maker));
        const formattedPrice = Number(
            order.trade_pair_id?.maker_denom === TOKENS_MAP.get(TokenSymbol.USDC)?.denom
                ? (1 / price).toFixed(6)
                : price.toFixed(6),
        );

        if (!priceMap.has(formattedPrice)) {
          priceMap.set(formattedPrice, { quantity: 0, orders: [] });
        }
        const entry = priceMap.get(formattedPrice)!;
        const activeShares =
            BigInt(order.shares_owned) -
            BigInt(order.shares_withdrawn) -
            BigInt(order.shares_cancelled);
        entry.quantity += calculateNTRNAmount(activeShares.toString());
        entry.orders.push(order);
      });

      const orderBook: OrderBook = {
        asks: [],
        bids: [],
      };

      priceMap.forEach((value, price) => {
        const level: OrderBookLevel = {
          price,
          quantity: value.quantity,
        };

        if (value.orders[0].trade_pair_id?.maker_denom === TOKENS_MAP.get(token)?.denom) {
          orderBook.asks.push(level);
        } else {
          level.quantity /= level.price;
          orderBook.bids.push(level);
        }
      });

      orderBook.asks.sort((a, b) => a.price - b.price);
      orderBook.bids.sort((a, b) => b.price - a.price);

      orderBook.asks = orderBook.asks.slice(0, 5);
      const lowestAskPrice = orderBook.asks.length > 0 ? orderBook.asks[0].price : 0;
      orderBook.bids = orderBook.bids.filter((bid) => bid.price < lowestAskPrice).slice(0, 5);

      return orderBook;
    } catch (error) {
      console.error('Error fetching orderbook:', error);
      throw error;
    }
  }
}
