import { useCallback, useEffect, useState } from 'react';
import { useWalletContext } from '../context.js';

/**
 * Options for useBalance hook
 */
export interface UseBalanceOptions {
  /** Address to get balance for (defaults to active account) */
  address?: string;
  /** Chain ID to query (defaults to current chain) */
  chainId?: number;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
  /** Whether to fetch immediately on mount */
  enabled?: boolean;
}

/**
 * Hook to fetch and track account balance
 *
 * @example
 * ```tsx
 * function BalanceDisplay() {
 *   const { balance, isLoading, refetch, formatted } = useBalance();
 *
 *   if (isLoading) return <span>Loading...</span>;
 *
 *   return (
 *     <div>
 *       <span>{formatted} ETH</span>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBalance(options: UseBalanceOptions = {}) {
  const { wallet, activeAccount, chainId: currentChainId, chain, isLocked } = useWalletContext();

  const {
    address = activeAccount?.address,
    chainId = currentChainId,
    refreshInterval = 0,
    enabled = true,
  } = options;

  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!wallet || !address || isLocked || !enabled) {
      setBalance(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const bal = await wallet.getBalance(address, chainId);
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch balance'));
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, address, chainId, isLocked, enabled]);

  // Initial fetch and refresh on dependencies change
  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0 || !enabled) return;

    const interval = setInterval(() => {
      void fetchBalance();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, enabled, fetchBalance]);

  // Format balance for display
  const formatted = balance !== null ? formatBalance(balance, chain?.nativeCurrency.decimals ?? 18) : null;

  return {
    /** Raw balance in wei (bigint) */
    balance,
    /** Formatted balance string (e.g., "1.5") */
    formatted,
    /** Currency symbol (e.g., "ETH") */
    symbol: chain?.nativeCurrency.symbol ?? 'ETH',
    /** Whether balance is being fetched */
    isLoading,
    /** Error if fetch failed */
    error,
    /** Manually refetch balance */
    refetch: fetchBalance,
  };
}

/**
 * Format balance from wei to human-readable string
 */
function formatBalance(wei: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = wei / divisor;
  const remainder = wei % divisor;

  if (remainder === 0n) {
    return whole.toString();
  }

  // Format remainder with leading zeros
  const remainderStr = remainder.toString().padStart(decimals, '0');
  // Trim trailing zeros
  const trimmed = remainderStr.replace(/0+$/, '');
  // Limit to 6 decimal places
  const limited = trimmed.slice(0, 6);

  return `${whole}.${limited}`;
}
