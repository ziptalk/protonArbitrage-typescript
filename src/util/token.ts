export enum TokenSymbol {
  NTRN = 'NTRN',
  USDC = 'USDC',
  AXLUSDT = 'axlUSDT',
  ATOM = 'ATOM',
  DATOM = 'dATOM',
  TIA = 'TIA',
}

export interface Token {
  readonly symbol: TokenSymbol;
  readonly denom: string;
  readonly decimals: number;
}

export interface TokenPair {
  readonly name: string;
  readonly contract: string;
  readonly token0: Token;
  readonly token1: Token;
}

export const TOKEN_INFO: Record<TokenSymbol, Omit<Token, 'symbol'>> = {
  [TokenSymbol.NTRN]: {
    denom: 'untrn',
    decimals: 6,
  },
  [TokenSymbol.USDC]: {
    denom: 'ibc/B559A80D62249C8AA07A380E2A2BEA6E5CA9A6F079C912C3A9E9B494105E4F81',
    decimals: 6,
  },
  [TokenSymbol.AXLUSDT]: {
    denom: 'ibc/57503D7852EF4E1899FE6D71C5E81D7C839F76580F86F21E39348FC2BC9D7CE2',
    decimals: 6,
  },
  [TokenSymbol.ATOM]: {
    denom: 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
    decimals: 6,
  },
  [TokenSymbol.DATOM]: {
    denom: 'factory/neutron1k6hr0f83e7un2wjf29cspk7j69jrnskk65k3ek2nj9dztrlzpj6q00rtsa/udatom',
    decimals: 6,
  },
  [TokenSymbol.TIA]: {
    denom: 'ibc/773B4D0A3CD667B2275D5A4A7A2F0909C0BA0F4059C0B9181E680DDF4965DCC7',
    decimals: 6,
  },
};

export const TOKENS: Token[] = Object.entries(TOKEN_INFO).map(([symbol, info]) => ({
  symbol: symbol as TokenSymbol,
  ...info,
}));

export const TOKENS_MAP: ReadonlyMap<TokenSymbol, Token> = new Map(
  TOKENS.map((token) => [token.symbol, token]),
);

export const TOKEN_PAIRS: TokenPair[] = [
  {
    name: 'USDC-NTRN',
    contract: 'neutron18c8qejysp4hgcfuxdpj4wf29mevzwllz5yh8uayjxamwtrs0n9fshq9vtv',
    token0: TOKENS_MAP.get(TokenSymbol.USDC)!,
    token1: TOKENS_MAP.get(TokenSymbol.NTRN)!,
  },
  {
    name: 'ATOM-dATOM',
    contract: 'neutron1yem82r0wf837lfkwvcu2zxlyds5qrzwkz8alvmg0apyrjthk64gqeq2e98',
    token0: TOKENS_MAP.get(TokenSymbol.ATOM)!,
    token1: TOKENS_MAP.get(TokenSymbol.DATOM)!,
  },
  {
    name: 'TIA-USDC',
    contract: 'neutron1frrumq735f8rud2wfez9s5n4l5jhw0qy7u8800xt7w8rqy3ucrfsm6c0mr',
    token0: TOKENS_MAP.get(TokenSymbol.USDC)!,
    token1: TOKENS_MAP.get(TokenSymbol.TIA)!,
  },
] as const;

export const TOKEN_PAIRS_MAP: ReadonlyMap<string, TokenPair> = new Map(
  TOKEN_PAIRS.map((pair) => [pair.name, pair]),
);

export function getTokenPairContract(token1: TokenSymbol, token2: TokenSymbol): string | undefined {
  const sortedSymbols = [token1, token2].sort();
  const tokenPair = TOKEN_PAIRS.find(
    (pair) => [pair.token0.symbol, pair.token1.symbol].sort().join('-') === sortedSymbols.join('-'),
  );
  return tokenPair?.contract;
}
