import { useMemo } from 'react';
import { getMainnetChains, getTestnetChains, type Chain } from '@panoplia/core';
import { useWalletContext } from '../context.js';

/**
 * Hook to manage chain/network selection
 *
 * @example
 * ```tsx
 * function NetworkSelector() {
 *   const { chain, chainId, switchChain, supportedChains } = useChain();
 *
 *   return (
 *     <select
 *       value={chainId}
 *       onChange={(e) => switchChain(Number(e.target.value))}
 *     >
 *       {supportedChains.map(c => (
 *         <option key={c.chainId} value={c.chainId}>
 *           {c.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useChain() {
  const { chainId, chain, switchChain, isLoading } = useWalletContext();

  // Memoize chain lists
  const mainnetChains = useMemo(() => getMainnetChains(), []);
  const testnetChains = useMemo(() => getTestnetChains(), []);
  const supportedChains = useMemo(() => [...mainnetChains, ...testnetChains], [mainnetChains, testnetChains]);

  /**
   * Check if a chain ID is supported
   */
  const isChainSupported = (id: number): boolean => {
    return supportedChains.some((c) => c.chainId === id);
  };

  /**
   * Get chain info by ID
   */
  const getChainInfo = (id: number): Chain | undefined => {
    return supportedChains.find((c) => c.chainId === id);
  };

  return {
    /** Current chain ID */
    chainId,
    /** Current chain configuration */
    chain,
    /** Whether current chain is a testnet */
    isTestnet: chain?.testnet ?? false,
    /** Native currency symbol (e.g., "ETH") */
    nativeCurrency: chain?.nativeCurrency ?? { name: 'Ether', symbol: 'ETH', decimals: 18 },
    /** Block explorer URL for current chain */
    explorerUrl: chain?.blockExplorers?.[0]?.url,
    /** Switch to a different chain */
    switchChain,
    /** All supported mainnet chains */
    mainnetChains,
    /** All supported testnet chains */
    testnetChains,
    /** All supported chains (mainnet + testnet) */
    supportedChains,
    /** Check if a chain ID is supported */
    isChainSupported,
    /** Get chain info by ID */
    getChainInfo,
    /** Whether a chain switch is in progress */
    isLoading,
  };
}
