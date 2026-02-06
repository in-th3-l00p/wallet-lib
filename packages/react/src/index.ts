// Provider
export { WalletProvider, type WalletProviderProps } from './provider.js';

// Context
export { WalletContext, useWalletContext, type WalletContextState } from './context.js';

// Hooks
export {
  useWallet,
  useAccounts,
  useBalance,
  useChain,
  useTransaction,
  useSignMessage,
  type UseBalanceOptions,
  type TransactionStatus,
  type UseTransactionResult,
  type SignatureStatus,
} from './hooks/index.js';

// Re-export commonly used types from core
export type {
  Account,
  Chain,
  WalletProvider as WalletProviderInterface,
  WalletState,
  TypedDataTypes,
} from '@panoplia/core';
