const tokenAddressMap: Record<string, string> = {
    NTRN: "untrn",
    USDC: "ibc/B559A80D62249C8AA07A380E2A2BEA6E5CA9A6F079C912C3A9E9B494105E4F81",
    axlUSDT: "ibc/57503D7852EF4E1899FE6D71C5E81D7C839F76580F86F21E39348FC2BC9D7CE2",
};

const tokenDecimalsMap: Record<string, number> = {
    NTRN: 6,
    USDC: 6,
    axlUSDT: 6,
};

const getTokenAddress = (tokenName: string): string => {
    const address = tokenAddressMap[tokenName];
    if (!address) {
        throw new Error(`Token address not found for token name: ${tokenName}`);
    }
    return address;
};

const getAmounts = (tokenName: string, amount: number): string => {
    const decimals = tokenDecimalsMap[tokenName];
    if (decimals === undefined) {
        throw new Error(`Token decimals not found for token name: ${tokenName}`);
    }
    return (amount * 10 ** decimals).toFixed();
};

export { getTokenAddress, getAmounts, tokenAddressMap, tokenDecimalsMap }