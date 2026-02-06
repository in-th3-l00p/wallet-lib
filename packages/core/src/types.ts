import type { TransactionRequest, TransactionResponse, TypedDataDomain } from 'ethers';

/**
 * Represents an account derived from the HD wallet
 */
export interface Account {
  /** Ethereum address (checksummed) */
  address: string;
  /** Human-readable account name */
  name?: string;
  /** BIP-44 derivation path, e.g., "m/44'/60'/0'/0/0" */
  derivationPath: string;
  /** Index in the derivation path */
  index: number;
}

/**
 * EVM chain configuration
 */
export interface Chain {
  /** Unique chain identifier */
  chainId: number;
  /** Human-readable chain name */
  name: string;
  /** Native currency symbol (e.g., "ETH", "MATIC") */
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  /** RPC endpoint URLs */
  rpcUrls: string[];
  /** Block explorer URLs */
  blockExplorers?: {
    name: string;
    url: string;
  }[];
  /** Whether this is a testnet */
  testnet?: boolean;
}

/**
 * EIP-712 typed data types definition
 */
export type TypedDataTypes = Record<string, Array<{ name: string; type: string }>>;

/**
 * Wallet state
 */
export type WalletState = 'locked' | 'unlocked' | 'uninitialized';

/**
 * Events emitted by the wallet
 */
export interface WalletEvents {
  accountsChanged: (accounts: Account[]) => void;
  chainChanged: (chainId: number) => void;
  lock: () => void;
  unlock: () => void;
}

/**
 * Core wallet provider interface
 * Implemented by LocalWallet and CloudWallet
 */
export interface WalletProvider {
  // === Account Management ===

  /**
   * Get all accounts in the wallet
   */
  getAccounts(): Promise<Account[]>;

  /**
   * Get the currently active account
   */
  getActiveAccount(): Promise<Account | null>;

  /**
   * Set the active account by address
   */
  setActiveAccount(address: string): Promise<void>;

  /**
   * Create a new account derived from the wallet's mnemonic
   * @param name Optional human-readable name
   */
  createAccount(name?: string): Promise<Account>;

  /**
   * Import wallet from BIP-39 mnemonic phrase
   * @param mnemonic 12 or 24 word mnemonic
   * @param password Encryption password for storage
   */
  importFromMnemonic(mnemonic: string, password: string): Promise<Account>;

  /**
   * Generate a new wallet with fresh mnemonic
   * @param password Encryption password for storage
   * @param wordCount 12 or 24 word mnemonic
   * @returns The generated mnemonic (user must back this up!)
   */
  generateWallet(password: string, wordCount?: 12 | 24): Promise<{ mnemonic: string; account: Account }>;

  // === Signing ===

  /**
   * Sign a transaction
   * @returns Signed transaction hex string
   */
  signTransaction(tx: TransactionRequest): Promise<string>;

  /**
   * Sign a message (EIP-191 personal sign)
   * @param message Message to sign (string or bytes)
   * @returns Signature hex string
   */
  signMessage(message: string | Uint8Array): Promise<string>;

  /**
   * Sign typed data (EIP-712)
   */
  signTypedData(
    domain: TypedDataDomain,
    types: TypedDataTypes,
    value: Record<string, unknown>
  ): Promise<string>;

  // === Chain Operations ===

  /**
   * Get current chain ID
   */
  getChainId(): number;

  /**
   * Switch to a different chain
   */
  switchChain(chainId: number): Promise<void>;

  /**
   * Get native token balance for an address
   * @param address Account address
   * @param chainId Optional chain ID (defaults to current chain)
   */
  getBalance(address: string, chainId?: number): Promise<bigint>;

  /**
   * Send a transaction
   */
  sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>;

  // === Wallet Lifecycle ===

  /**
   * Lock the wallet (clear decrypted keys from memory)
   */
  lock(): Promise<void>;

  /**
   * Unlock the wallet with password
   * @returns true if unlock successful
   */
  unlock(password: string): Promise<boolean>;

  /**
   * Check if wallet is currently locked
   */
  isLocked(): boolean;

  /**
   * Get current wallet state
   */
  getState(): WalletState;

  /**
   * Check if a wallet has been initialized (mnemonic stored)
   */
  isInitialized(): Promise<boolean>;

  // === Export (with security warnings) ===

  /**
   * Export the mnemonic phrase
   * WARNING: This exposes sensitive data. Only call with explicit user consent.
   * @param password Current wallet password to verify identity
   */
  exportMnemonic(password: string): Promise<string>;
}

/**
 * Storage adapter interface for wallet data persistence
 */
export interface StorageAdapter {
  /**
   * Store encrypted wallet data
   */
  setWalletData(key: string, data: Uint8Array): Promise<void>;

  /**
   * Retrieve encrypted wallet data
   */
  getWalletData(key: string): Promise<Uint8Array | null>;

  /**
   * Delete wallet data
   */
  deleteWalletData(key: string): Promise<void>;

  /**
   * Check if wallet data exists
   */
  hasWalletData(key: string): Promise<boolean>;

  /**
   * List all wallet data keys
   */
  listKeys(): Promise<string[]>;

  /**
   * Clear all wallet data
   */
  clear(): Promise<void>;
}

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
  /** Random nonce used for encryption */
  nonce: Uint8Array;
  /** Salt used for key derivation */
  salt: Uint8Array;
  /** Encryption version for future upgrades */
  version: number;
}

/**
 * Serialized encrypted payload for storage
 */
export interface SerializedEncryptedPayload {
  ciphertext: string; // base64
  nonce: string; // base64
  salt: string; // base64
  version: number;
}
