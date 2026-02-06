import type { Chain } from './types.js';

/**
 * Ethereum Mainnet
 */
export const ethereum: Chain = {
  chainId: 1,
  name: 'Ethereum',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Etherscan', url: 'https://etherscan.io' },
  ],
};

/**
 * Sepolia Testnet
 */
export const sepolia: Chain = {
  chainId: 11155111,
  name: 'Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://rpc.sepolia.org',
    'https://rpc.ankr.com/eth_sepolia',
    'https://ethereum-sepolia.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  ],
  testnet: true,
};

/**
 * Polygon Mainnet
 */
export const polygon: Chain = {
  chainId: 137,
  name: 'Polygon',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon-bor.publicnode.com',
  ],
  blockExplorers: [
    { name: 'PolygonScan', url: 'https://polygonscan.com' },
  ],
};

/**
 * Polygon Amoy Testnet
 */
export const polygonAmoy: Chain = {
  chainId: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: [
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy.drpc.org',
  ],
  blockExplorers: [
    { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  ],
  testnet: true,
};

/**
 * Arbitrum One
 */
export const arbitrum: Chain = {
  chainId: 42161,
  name: 'Arbitrum One',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum-one.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Arbiscan', url: 'https://arbiscan.io' },
  ],
};

/**
 * Arbitrum Sepolia Testnet
 */
export const arbitrumSepolia: Chain = {
  chainId: 421614,
  name: 'Arbitrum Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://sepolia-rollup.arbitrum.io/rpc',
    'https://arbitrum-sepolia.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Arbiscan', url: 'https://sepolia.arbiscan.io' },
  ],
  testnet: true,
};

/**
 * Optimism
 */
export const optimism: Chain = {
  chainId: 10,
  name: 'Optimism',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Optimistic Etherscan', url: 'https://optimistic.etherscan.io' },
  ],
};

/**
 * Optimism Sepolia Testnet
 */
export const optimismSepolia: Chain = {
  chainId: 11155420,
  name: 'Optimism Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://sepolia.optimism.io',
    'https://optimism-sepolia.publicnode.com',
  ],
  blockExplorers: [
    { name: 'Optimistic Etherscan', url: 'https://sepolia-optimism.etherscan.io' },
  ],
  testnet: true,
};

/**
 * Base
 */
export const base: Chain = {
  chainId: 8453,
  name: 'Base',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://mainnet.base.org',
    'https://base.publicnode.com',
    'https://rpc.ankr.com/base',
  ],
  blockExplorers: [
    { name: 'BaseScan', url: 'https://basescan.org' },
  ],
};

/**
 * Base Sepolia Testnet
 */
export const baseSepolia: Chain = {
  chainId: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://sepolia.base.org',
    'https://base-sepolia.publicnode.com',
  ],
  blockExplorers: [
    { name: 'BaseScan', url: 'https://sepolia.basescan.org' },
  ],
  testnet: true,
};

/**
 * Avalanche C-Chain
 */
export const avalanche: Chain = {
  chainId: 43114,
  name: 'Avalanche C-Chain',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche-c-chain.publicnode.com',
  ],
  blockExplorers: [
    { name: 'SnowTrace', url: 'https://snowtrace.io' },
  ],
};

/**
 * BNB Smart Chain
 */
export const bsc: Chain = {
  chainId: 56,
  name: 'BNB Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18,
  },
  rpcUrls: [
    'https://bsc-dataseed.binance.org',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com',
  ],
  blockExplorers: [
    { name: 'BscScan', url: 'https://bscscan.com' },
  ],
};

/**
 * All supported chains indexed by chainId
 */
export const chains: Record<number, Chain> = {
  [ethereum.chainId]: ethereum,
  [sepolia.chainId]: sepolia,
  [polygon.chainId]: polygon,
  [polygonAmoy.chainId]: polygonAmoy,
  [arbitrum.chainId]: arbitrum,
  [arbitrumSepolia.chainId]: arbitrumSepolia,
  [optimism.chainId]: optimism,
  [optimismSepolia.chainId]: optimismSepolia,
  [base.chainId]: base,
  [baseSepolia.chainId]: baseSepolia,
  [avalanche.chainId]: avalanche,
  [bsc.chainId]: bsc,
};

/**
 * Get chain by chainId
 * @param chainId Chain ID
 * @returns Chain configuration or undefined
 */
export function getChain(chainId: number): Chain | undefined {
  return chains[chainId];
}

/**
 * Get all mainnet chains
 */
export function getMainnetChains(): Chain[] {
  return Object.values(chains).filter((chain) => !chain.testnet);
}

/**
 * Get all testnet chains
 */
export function getTestnetChains(): Chain[] {
  return Object.values(chains).filter((chain) => chain.testnet === true);
}

/**
 * Add a custom chain configuration
 * @param chain Chain configuration to add
 */
export function addChain(chain: Chain): void {
  chains[chain.chainId] = chain;
}

/**
 * Get the first available RPC URL for a chain
 * @param chainId Chain ID
 * @returns RPC URL or undefined
 */
export function getRpcUrl(chainId: number): string | undefined {
  const chain = getChain(chainId);
  return chain?.rpcUrls[0];
}

/**
 * Get block explorer URL for a chain
 * @param chainId Chain ID
 * @returns Explorer URL or undefined
 */
export function getExplorerUrl(chainId: number): string | undefined {
  const chain = getChain(chainId);
  return chain?.blockExplorers?.[0]?.url;
}

/**
 * Get transaction URL on block explorer
 * @param chainId Chain ID
 * @param txHash Transaction hash
 * @returns Full transaction URL
 */
export function getTransactionUrl(chainId: number, txHash: string): string | undefined {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) return undefined;
  return `${explorerUrl}/tx/${txHash}`;
}

/**
 * Get address URL on block explorer
 * @param chainId Chain ID
 * @param address Wallet address
 * @returns Full address URL
 */
export function getAddressUrl(chainId: number, address: string): string | undefined {
  const explorerUrl = getExplorerUrl(chainId);
  if (!explorerUrl) return undefined;
  return `${explorerUrl}/address/${address}`;
}
