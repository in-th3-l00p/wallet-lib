import { keccak_256 } from '@noble/hashes/sha3';
import {
  type KeyShare,
  type ThresholdConfig,
  generateDistributedKey,
  importAndSplitKey,
  signWithShares,
  signPersonalMessage,
} from './threshold-signature.js';
import {
  encrypt,
  decrypt,
  serializePayload,
  deserializePayload,
  type SerializedEncryptedPayload,
} from '@panoplia/core';

/**
 * Encrypted key share for secure storage
 */
export interface EncryptedKeyShare {
  /** Share index */
  index: number;
  /** Encrypted share data */
  encryptedShare: SerializedEncryptedPayload;
  /** Public key (not encrypted) */
  publicKey: string;
  /** Ethereum address (not encrypted) */
  address: string;
  /** Key identifier */
  keyId: string;
  /** Threshold configuration */
  config: ThresholdConfig;
  /** Optional label for this share */
  label?: string;
}

/**
 * Share holder information
 */
export interface ShareHolder {
  /** Unique identifier for this holder */
  id: string;
  /** Human-readable name */
  name: string;
  /** Type of holder */
  type: 'local' | 'guardian' | 'device' | 'cloud';
  /** Share index assigned to this holder */
  shareIndex: number;
  /** Contact info for recovery (email, phone, etc.) */
  contact?: string;
  /** When this holder was added */
  createdAt: number;
}

/**
 * MPC wallet state
 */
export interface MPCWalletState {
  /** Key identifier */
  keyId: string;
  /** Public key */
  publicKey: string;
  /** Ethereum address */
  address: string;
  /** Threshold configuration */
  config: ThresholdConfig;
  /** List of share holders */
  shareHolders: ShareHolder[];
  /** When the wallet was created */
  createdAt: number;
}

/**
 * Options for creating an MPC wallet
 */
export interface CreateMPCWalletOptions {
  /** Number of shares to create */
  totalShares: number;
  /** Minimum shares needed to sign */
  threshold: number;
  /** Labels for each share (optional) */
  shareLabels?: string[];
}

/**
 * Result of MPC wallet creation
 */
export interface CreateMPCWalletResult {
  /** Wallet state */
  state: MPCWalletState;
  /** Encrypted shares (distribute to holders) */
  encryptedShares: EncryptedKeyShare[];
  /** Plain shares (for immediate distribution, handle with care!) */
  plainShares: KeyShare[];
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * MPC Wallet Manager
 *
 * Manages threshold signature wallets where the private key is split
 * into multiple shares. Supports:
 * - Creating new MPC wallets
 * - Importing existing keys into MPC format
 * - Encrypting shares for storage
 * - Signing with collected shares
 */
export class MPCWallet {
  private state: MPCWalletState | null = null;
  private collectedShares: KeyShare[] = [];

  /**
   * Create a new MPC wallet with threshold signatures
   *
   * @param options Wallet creation options
   * @param sharePasswords Passwords to encrypt each share (one per share)
   * @returns Creation result with encrypted shares
   */
  static create(
    options: CreateMPCWalletOptions,
    sharePasswords: string[]
  ): CreateMPCWalletResult {
    const { totalShares, threshold, shareLabels } = options;

    if (sharePasswords.length !== totalShares) {
      throw new Error(`Need ${totalShares} passwords, got ${sharePasswords.length}`);
    }

    // Generate distributed key
    const dkg = generateDistributedKey({ totalShares, threshold });

    // Create encrypted shares
    const encryptedShares = dkg.shares.map((share, i) => {
      const encrypted = encrypt(share.share, sharePasswords[i]);
      return {
        index: share.index,
        encryptedShare: serializePayload(encrypted),
        publicKey: share.publicKey,
        address: share.address,
        keyId: share.keyId,
        config: share.config,
        label: shareLabels?.[i],
      };
    });

    // Create wallet state
    const state: MPCWalletState = {
      keyId: dkg.keyId,
      publicKey: dkg.publicKey,
      address: dkg.address,
      config: { totalShares, threshold },
      shareHolders: [],
      createdAt: Date.now(),
    };

    return {
      state,
      encryptedShares,
      plainShares: dkg.shares,
    };
  }

  /**
   * Import an existing private key into MPC format
   *
   * @param privateKey Existing private key
   * @param options Wallet creation options
   * @param sharePasswords Passwords to encrypt each share
   * @returns Creation result with encrypted shares
   */
  static importKey(
    privateKey: string,
    options: CreateMPCWalletOptions,
    sharePasswords: string[]
  ): CreateMPCWalletResult {
    const { totalShares, threshold, shareLabels } = options;

    if (sharePasswords.length !== totalShares) {
      throw new Error(`Need ${totalShares} passwords, got ${sharePasswords.length}`);
    }

    // Split existing key
    const dkg = importAndSplitKey(privateKey, { totalShares, threshold });

    // Create encrypted shares
    const encryptedShares = dkg.shares.map((share, i) => {
      const encrypted = encrypt(share.share, sharePasswords[i]);
      return {
        index: share.index,
        encryptedShare: serializePayload(encrypted),
        publicKey: share.publicKey,
        address: share.address,
        keyId: share.keyId,
        config: share.config,
        label: shareLabels?.[i],
      };
    });

    // Create wallet state
    const state: MPCWalletState = {
      keyId: dkg.keyId,
      publicKey: dkg.publicKey,
      address: dkg.address,
      config: { totalShares, threshold },
      shareHolders: [],
      createdAt: Date.now(),
    };

    return {
      state,
      encryptedShares,
      plainShares: dkg.shares,
    };
  }

  /**
   * Load wallet state
   */
  loadState(state: MPCWalletState): void {
    this.state = state;
    this.collectedShares = [];
  }

  /**
   * Get current wallet state
   */
  getState(): MPCWalletState | null {
    return this.state;
  }

  /**
   * Get the wallet address
   */
  getAddress(): string | null {
    return this.state?.address ?? null;
  }

  /**
   * Get threshold configuration
   */
  getConfig(): ThresholdConfig | null {
    return this.state?.config ?? null;
  }

  /**
   * Get number of collected shares
   */
  getCollectedShareCount(): number {
    return this.collectedShares.length;
  }

  /**
   * Check if enough shares are collected for signing
   */
  canSign(): boolean {
    if (!this.state) return false;
    return this.collectedShares.length >= this.state.config.threshold;
  }

  /**
   * Add an encrypted share (decrypts and stores in memory)
   *
   * @param encryptedShare The encrypted share
   * @param password Password to decrypt the share
   * @returns True if share was added successfully
   */
  addShare(encryptedShare: EncryptedKeyShare, password: string): boolean {
    if (!this.state) {
      throw new Error('Wallet state not loaded');
    }

    // Verify share belongs to this wallet
    if (encryptedShare.keyId !== this.state.keyId) {
      throw new Error('Share does not belong to this wallet');
    }

    // Check if share already added
    if (this.collectedShares.some((s) => s.index === encryptedShare.index)) {
      return false; // Already have this share
    }

    try {
      // Decrypt the share
      const payload = deserializePayload(encryptedShare.encryptedShare);
      const shareValue = decrypt(payload, password);

      // Add to collected shares
      const keyShare: KeyShare = {
        index: encryptedShare.index,
        share: shareValue,
        publicKey: encryptedShare.publicKey,
        address: encryptedShare.address,
        keyId: encryptedShare.keyId,
        config: encryptedShare.config,
      };

      this.collectedShares.push(keyShare);
      return true;
    } catch {
      return false; // Decryption failed
    }
  }

  /**
   * Add a plain (unencrypted) share
   */
  addPlainShare(share: KeyShare): boolean {
    if (!this.state) {
      throw new Error('Wallet state not loaded');
    }

    if (share.keyId !== this.state.keyId) {
      throw new Error('Share does not belong to this wallet');
    }

    if (this.collectedShares.some((s) => s.index === share.index)) {
      return false;
    }

    this.collectedShares.push(share);
    return true;
  }

  /**
   * Clear collected shares from memory
   */
  clearShares(): void {
    this.collectedShares = [];
  }

  /**
   * Sign a message hash using collected shares
   *
   * @param messageHash 32-byte hash to sign
   * @returns Signature
   */
  async signHash(messageHash: string | Uint8Array): Promise<string> {
    if (!this.canSign()) {
      throw new Error(
        `Need ${this.state?.config.threshold} shares, have ${this.collectedShares.length}`
      );
    }

    const { signature } = await signWithShares(messageHash, this.collectedShares);
    return signature;
  }

  /**
   * Sign a personal message (EIP-191)
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.canSign()) {
      throw new Error(
        `Need ${this.state?.config.threshold} shares, have ${this.collectedShares.length}`
      );
    }

    return signPersonalMessage(message, this.collectedShares);
  }

  /**
   * Sign a transaction
   *
   * @param txData Transaction data to sign
   * @returns Signed transaction
   */
  async signTransaction(txData: {
    nonce: number;
    gasPrice?: bigint;
    gasLimit: bigint;
    to: string;
    value: bigint;
    data: string;
    chainId: number;
  }): Promise<string> {
    if (!this.canSign()) {
      throw new Error(
        `Need ${this.state?.config.threshold} shares, have ${this.collectedShares.length}`
      );
    }

    // Encode transaction for signing (simplified EIP-155)
    const txForSigning = this.encodeTransaction(txData);
    const txHash = keccak_256(txForSigning);

    const { r, s, v } = await signWithShares(txHash, this.collectedShares);

    // Calculate EIP-155 v value
    const eip155V = txData.chainId * 2 + 35 + (v - 27);

    // Encode signed transaction
    return this.encodeSignedTransaction(txData, r, s, eip155V);
  }

  /**
   * RLP encode a transaction for signing
   */
  private encodeTransaction(tx: {
    nonce: number;
    gasPrice?: bigint;
    gasLimit: bigint;
    to: string;
    value: bigint;
    data: string;
    chainId: number;
  }): Uint8Array {
    // Simplified RLP encoding - in production use ethers.js Transaction class
    const items = [
      this.rlpEncodeNumber(tx.nonce),
      this.rlpEncodeBigInt(tx.gasPrice ?? 0n),
      this.rlpEncodeBigInt(tx.gasLimit),
      hexToBytes(tx.to),
      this.rlpEncodeBigInt(tx.value),
      hexToBytes(tx.data || '0x'),
      this.rlpEncodeNumber(tx.chainId),
      new Uint8Array([0x80]), // empty r
      new Uint8Array([0x80]), // empty s
    ];

    return this.rlpEncodeList(items);
  }

  /**
   * Encode a signed transaction
   */
  private encodeSignedTransaction(
    tx: {
      nonce: number;
      gasPrice?: bigint;
      gasLimit: bigint;
      to: string;
      value: bigint;
      data: string;
    },
    r: string,
    s: string,
    v: number
  ): string {
    const items = [
      this.rlpEncodeNumber(tx.nonce),
      this.rlpEncodeBigInt(tx.gasPrice ?? 0n),
      this.rlpEncodeBigInt(tx.gasLimit),
      hexToBytes(tx.to),
      this.rlpEncodeBigInt(tx.value),
      hexToBytes(tx.data || '0x'),
      this.rlpEncodeNumber(v),
      hexToBytes(r),
      hexToBytes(s),
    ];

    return '0x' + bytesToHex(this.rlpEncodeList(items));
  }

  private rlpEncodeNumber(n: number): Uint8Array {
    if (n === 0) return new Uint8Array([0x80]);
    return this.rlpEncodeBigInt(BigInt(n));
  }

  private rlpEncodeBigInt(n: bigint): Uint8Array {
    if (n === 0n) return new Uint8Array([0x80]);
    const hex = n.toString(16);
    const bytes = hexToBytes(hex.length % 2 ? '0' + hex : hex);
    if (bytes.length === 1 && bytes[0] < 0x80) {
      return bytes;
    }
    return new Uint8Array([0x80 + bytes.length, ...bytes]);
  }

  private rlpEncodeList(items: Uint8Array[]): Uint8Array {
    const content = new Uint8Array(items.reduce((acc, item) => acc + item.length, 0));
    let offset = 0;
    for (const item of items) {
      content.set(item, offset);
      offset += item.length;
    }

    if (content.length < 56) {
      return new Uint8Array([0xc0 + content.length, ...content]);
    }

    const lenBytes = this.rlpEncodeBigInt(BigInt(content.length));
    return new Uint8Array([0xf7 + lenBytes.length, ...lenBytes, ...content]);
  }

  /**
   * Add a share holder record
   */
  addShareHolder(holder: Omit<ShareHolder, 'createdAt'>): void {
    if (!this.state) {
      throw new Error('Wallet state not loaded');
    }

    this.state.shareHolders.push({
      ...holder,
      createdAt: Date.now(),
    });
  }

  /**
   * Remove a share holder record
   */
  removeShareHolder(holderId: string): void {
    if (!this.state) return;
    this.state.shareHolders = this.state.shareHolders.filter((h) => h.id !== holderId);
  }

  /**
   * Get share holders
   */
  getShareHolders(): ShareHolder[] {
    return this.state?.shareHolders ?? [];
  }
}
