import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Account, Chain, WalletState } from '@panoplia/core';
import { getChain, ethereum } from '@panoplia/core';
import { LocalWallet, createIndexedDBStorage, type StorageAdapter } from '@panoplia/local-wallet';
import { WalletContext, type WalletContextState } from './context.js';

/**
 * WalletProvider configuration
 */
export interface WalletProviderProps {
  children: ReactNode;
  /** Custom storage adapter (defaults to IndexedDB) */
  storage?: StorageAdapter;
  /** Default chain ID (defaults to Ethereum mainnet) */
  defaultChainId?: number;
  /** Auto-lock timeout in milliseconds (defaults to 15 minutes, 0 to disable) */
  autoLockTimeoutMs?: number;
}

/**
 * Wallet context provider
 * Manages wallet state and provides hooks for wallet operations
 */
export function WalletProvider({
  children,
  storage,
  defaultChainId = ethereum.chainId,
  autoLockTimeoutMs = 15 * 60 * 1000,
}: WalletProviderProps) {
  // Wallet instance
  const [wallet, setWallet] = useState<LocalWallet | null>(null);

  // State
  const [walletState, setWalletState] = useState<WalletState>('uninitialized');
  const [isInitialized, setIsInitialized] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccount, setActiveAccountState] = useState<Account | null>(null);
  const [chainId, setChainId] = useState(defaultChainId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Derived state
  const chain: Chain | null = useMemo(() => getChain(chainId) ?? null, [chainId]);
  const isLocked = walletState !== 'unlocked';

  // Initialize wallet instance
  useEffect(() => {
    const initWallet = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const storageAdapter = storage ?? createIndexedDBStorage();
        const walletInstance = LocalWallet.create(storageAdapter, {
          defaultChainId,
          autoLockTimeoutMs,
        });

        setWallet(walletInstance);

        // Check if wallet is initialized
        const initialized = await walletInstance.isInitialized();
        setIsInitialized(initialized);
        setWalletState(initialized ? 'locked' : 'uninitialized');
        setChainId(walletInstance.getChainId());
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize wallet'));
      } finally {
        setIsLoading(false);
      }
    };

    void initWallet();
  }, [storage, defaultChainId, autoLockTimeoutMs]);

  // Refresh accounts when wallet state changes
  const refreshAccounts = useCallback(async () => {
    if (!wallet || isLocked) {
      setAccounts([]);
      setActiveAccountState(null);
      return;
    }

    try {
      const accountList = await wallet.getAccounts();
      setAccounts(accountList);

      const active = await wallet.getActiveAccount();
      setActiveAccountState(active);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accounts'));
    }
  }, [wallet, isLocked]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  // Actions
  const unlock = useCallback(
    async (password: string): Promise<boolean> => {
      if (!wallet) return false;

      try {
        setIsLoading(true);
        setError(null);

        const success = await wallet.unlock(password);
        if (success) {
          setWalletState('unlocked');
          await refreshAccounts();
        }
        return success;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to unlock wallet'));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, refreshAccounts]
  );

  const lock = useCallback(async (): Promise<void> => {
    if (!wallet) return;

    try {
      await wallet.lock();
      setWalletState('locked');
      setAccounts([]);
      setActiveAccountState(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to lock wallet'));
    }
  }, [wallet]);

  const createWallet = useCallback(
    async (
      password: string,
      wordCount: 12 | 24 = 12
    ): Promise<{ mnemonic: string; account: Account }> => {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      try {
        setIsLoading(true);
        setError(null);

        const result = await wallet.generateWallet(password, wordCount);
        setIsInitialized(true);
        setWalletState('unlocked');
        await refreshAccounts();

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create wallet');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, refreshAccounts]
  );

  const importWallet = useCallback(
    async (mnemonic: string, password: string): Promise<Account> => {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      try {
        setIsLoading(true);
        setError(null);

        const account = await wallet.importFromMnemonic(mnemonic, password);
        setIsInitialized(true);
        setWalletState('unlocked');
        await refreshAccounts();

        return account;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to import wallet');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, refreshAccounts]
  );

  const createAccount = useCallback(
    async (name?: string): Promise<Account> => {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      try {
        setIsLoading(true);
        setError(null);

        const account = await wallet.createAccount(name);
        await refreshAccounts();

        return account;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create account');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, refreshAccounts]
  );

  const setActiveAccount = useCallback(
    async (address: string): Promise<void> => {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      try {
        setError(null);
        await wallet.setActiveAccount(address);

        const active = await wallet.getActiveAccount();
        setActiveAccountState(active);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to set active account');
        setError(error);
        throw error;
      }
    },
    [wallet]
  );

  const switchChain = useCallback(
    async (newChainId: number): Promise<void> => {
      if (!wallet) {
        throw new Error('Wallet not initialized');
      }

      try {
        setError(null);
        await wallet.switchChain(newChainId);
        setChainId(newChainId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to switch chain');
        setError(error);
        throw error;
      }
    },
    [wallet]
  );

  // Build context value
  const contextValue: WalletContextState = useMemo(
    () => ({
      wallet,
      state: walletState,
      isInitialized,
      isLocked,
      accounts,
      activeAccount,
      chainId,
      chain,
      unlock,
      lock,
      createWallet,
      importWallet,
      createAccount,
      setActiveAccount,
      switchChain,
      isLoading,
      error,
    }),
    [
      wallet,
      walletState,
      isInitialized,
      isLocked,
      accounts,
      activeAccount,
      chainId,
      chain,
      unlock,
      lock,
      createWallet,
      importWallet,
      createAccount,
      setActiveAccount,
      switchChain,
      isLoading,
      error,
    ]
  );

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}
