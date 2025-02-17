// Token Types
import BigNumber from "bignumber.js";

export enum TokenSymbol {
  NTRN = 'NTRN',
  USDC = 'USDC',
  AXLUSDT = 'axlUSDT',
  ATOM = 'ATOM',
  DATOM = 'dATOM',
  TIA = 'TIA',
}

export interface TokenMetadata {
  readonly symbol: TokenSymbol;
  readonly name: string;
  readonly denom: string;
  readonly decimals: number;
  readonly logoURI?: string;
}

export interface TokenPair {
  readonly name: string;
  readonly token0: TokenMetadata;
  readonly token1: TokenMetadata;
  readonly pairId: string;
  readonly fee: number;
}

// Token Metadata
export const TOKENS: Record<TokenSymbol, TokenMetadata> = {
  [TokenSymbol.NTRN]: {
    symbol: TokenSymbol.NTRN,
    name: 'Neutron',
    denom: 'untrn',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/ntrn.png',
  },
  [TokenSymbol.USDC]: {
    symbol: TokenSymbol.USDC,
    name: 'USD Coin',
    denom: 'ibc/B559A80D62249C8AA07A380E2A2BEA6E5CA9A6F079C912C3A9E9B494105E4F81',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/neutron/images/usdc.png',
  },
  [TokenSymbol.AXLUSDT]: {
    symbol: TokenSymbol.AXLUSDT,
    name: 'AxlUSDT',
    denom: 'ibc/57503D7852EF4E1899FE6D71C5E81D7C839F76580F86F21E39348FC2BC9D7CE2',
    decimals: 6,
  },
  [TokenSymbol.ATOM]: {
    symbol: TokenSymbol.ATOM,
    name: 'Cosmos',
    denom: 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
    decimals: 6,
  },
  [TokenSymbol.DATOM]: {
    symbol: TokenSymbol.DATOM,
    name: 'dAtom',
    denom: 'factory/neutron1k6hr0f83e7un2wjf29cspk7j69jrnskk65k3ek2nj9dztrlzpj6q00rtsa/udatom',
    decimals: 6,
  },
  [TokenSymbol.TIA]: {
    symbol: TokenSymbol.TIA,
    name: 'TIA',
    denom: 'ibc/773B4D0A3CD667B2275D5A4A7A2F0909C0BA0F4059C0B9181E680DDF4965DCC7',
    decimals: 6,
  },
};

// Token Pairs
export const TOKEN_PAIRS: TokenPair[] = [
  {
    name: 'USDC-NTRN',
    token0: TOKENS[TokenSymbol.USDC],
    token1: TOKENS[TokenSymbol.NTRN],
    pairId: `${TOKENS[TokenSymbol.USDC].denom}<>${TOKENS[TokenSymbol.NTRN].denom}`,
    fee: 100, // 0.1%
  },
  {
    name: 'ATOM-dATOM',
    token0: TOKENS[TokenSymbol.ATOM],
    token1: TOKENS[TokenSymbol.DATOM],
    pairId: `${TOKENS[TokenSymbol.ATOM].denom}<>${TOKENS[TokenSymbol.DATOM].denom}`,
    fee: 100, // 0.1%
  },
  {
    name: 'TIA-USDC',
    token0: TOKENS[TokenSymbol.USDC],
    token1: TOKENS[TokenSymbol.TIA],
    pairId: `${TOKENS[TokenSymbol.USDC].denom}<>${TOKENS[TokenSymbol.TIA].denom}`,
    fee: 100, // 0.1%
  },
];

export function getTokenBySymbol(symbol: TokenSymbol): TokenMetadata {
  const token = TOKENS[symbol];
  if (!token) {
    throw new Error(`Token not found for symbol: ${symbol}`);
  }
  return token;
}

export function getPairByTokens(token0Symbol: TokenSymbol, token1Symbol: TokenSymbol): TokenPair | undefined {
  return TOKEN_PAIRS.find(
    pair => 
      (pair.token0.symbol === token0Symbol && pair.token1.symbol === token1Symbol) ||
      (pair.token0.symbol === token1Symbol && pair.token1.symbol === token0Symbol)
  );
}

export function calculateTokenAmount(amount: string, token: TokenMetadata): number {
  const tokenInfo = getTokenBySymbol(token.symbol);
  if (!tokenInfo) {
    throw new Error(`Token info not found for ${token}`);
  }
  return Number(amount) / 10 ** tokenInfo.decimals;
}

export function formatTokenAmount(amount: number, token: TokenSymbol): string {
  const tokenInfo = getTokenBySymbol(token);
  if (!tokenInfo) {
    throw new Error(`Token info not found for ${token}`);
  }
  return (amount * 10 ** tokenInfo.decimals).toString();
}
export function calculateTickPrice(tickIndex: number): number {
  return Math.pow(1.0001, tickIndex);
}

export const calculateDecimal = (input: string | number, decimals: number): string => {
  const limitSellPrice = new BigNumber(input);
  const scaleFactor = new BigNumber(10).pow(decimals);
  return limitSellPrice.times(scaleFactor).toFixed(0);
};