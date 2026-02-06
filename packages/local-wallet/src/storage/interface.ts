import type { StorageAdapter } from '@panoplia/core';

/**
 * Storage keys used by the local wallet
 */
export const STORAGE_KEYS = {
  /** Encrypted mnemonic phrase */
  MNEMONIC: 'wallet:mnemonic',
  /** Account metadata (names, order, etc.) */
  ACCOUNTS: 'wallet:accounts',
  /** Password verification token */
  PASSWORD_VERIFY: 'wallet:password_verify',
  /** Current active account address */
  ACTIVE_ACCOUNT: 'wallet:active_account',
  /** Wallet settings/preferences */
  SETTINGS: 'wallet:settings',
} as const;

/**
 * Stored account metadata
 */
export interface StoredAccountMeta {
  address: string;
  name?: string;
  derivationPath: string;
  index: number;
  createdAt: number;
}

/**
 * Wallet settings stored in IndexedDB
 */
export interface WalletSettings {
  defaultChainId: number;
  autoLockTimeoutMs: number;
  createdAt: number;
  lastUnlockedAt?: number;
}

/**
 * Re-export StorageAdapter for convenience
 */
export type { StorageAdapter };
