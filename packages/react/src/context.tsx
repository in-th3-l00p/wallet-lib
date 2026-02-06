import { createContext, useContext } from 'react';
import type { Account, Chain, WalletProvider, WalletState } from '@panoplia/core';

/**
 * Wallet context state
 */
export interface WalletContextState {
  // Wallet instance
  wallet: WalletProvider | null;

  // State
  state: WalletState;
  isInitialized: boolean;
  isLocked: boolean;

  // Accounts
  accounts: Account[];
  activeAccount: Account | null;

  // Chain
  chainId: number;
  chain: Chain | null;

  // Actions
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  createWallet: (password: string, wordCount?: 12 | 24) => Promise<{ mnemonic: string; account: Account }>;
  importWallet: (mnemonic: string, password: string) => Promise<Account>;
  createAccount: (name?: string) => Promise<Account>;
  setActiveAccount: (address: string) => Promise<void>;
  switchChain: (chainId: number) => Promise<void>;

  // Loading states
  isLoading: boolean;
  error: Error | null;
}

/**
 * Default context value
 */
const defaultContextValue: WalletContextState = {
  wallet: null,
  state: 'uninitialized',
  isInitialized: false,
  isLocked: true,
  accounts: [],
  activeAccount: null,
  chainId: 1,
  chain: null,
  unlock: async () => false,
  lock: async () => {},
  createWallet: async () => {
    throw new Error('WalletProvider not initialized');
  },
  importWallet: async () => {
    throw new Error('WalletProvider not initialized');
  },
  createAccount: async () => {
    throw new Error('WalletProvider not initialized');
  },
  setActiveAccount: async () => {
    throw new Error('WalletProvider not initialized');
  },
  switchChain: async () => {
    throw new Error('WalletProvider not initialized');
  },
  isLoading: false,
  error: null,
};

/**
 * Wallet context
 */
export const WalletContext = createContext<WalletContextState>(defaultContextValue);

/**
 * Hook to access wallet context
 * @throws Error if used outside WalletProvider
 */
export function useWalletContext(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context.wallet && context.state === 'uninitialized') {
    // Allow usage even without provider for SSR/initial render
    return context;
  }
  return context;
}
