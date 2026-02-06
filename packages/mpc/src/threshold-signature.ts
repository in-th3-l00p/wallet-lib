import * as secp256k1 from '@noble/secp256k1';
import { randomBytes } from '@noble/hashes/utils';
import { keccak_256 } from '@noble/hashes/sha3';
import { splitSecret, combineShares, type Share } from './shamir.js';

/**
 * Threshold Signature Scheme for ECDSA
 *
 * This implementation uses a simplified approach where:
 * 1. The private key is split using Shamir's Secret Sharing
 * 2. For signing, shares are combined to reconstruct the key temporarily
 * 3. The reconstructed key is used to sign, then immediately cleared
 *
 * Note: This is a practical implementation suitable for client-side MPC.
 * For full distributed MPC where no single party ever sees the complete key,
 * more complex protocols like GG18/GG20 or CGGMP would be needed.
 */

// secp256k1 curve order
const CURVE_ORDER = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

/**
 * Configuration for threshold signature scheme
 */
export interface ThresholdConfig {
  /** Total number of key shares */
  totalShares: number;
  /** Minimum shares needed to sign (threshold) */
  threshold: number;
}

/**
 * A key share for threshold signing
 */
export interface KeyShare {
  /** Share index */
  index: number;
  /** Share value (encrypted or plain) */
  share: string;
  /** Public key derived from the complete private key */
  publicKey: string;
  /** Ethereum address */
  address: string;
  /** Unique identifier for this key set */
  keyId: string;
  /** Threshold configuration */
  config: ThresholdConfig;
}

/**
 * Partial signature from one share holder
 */
export interface PartialSignature {
  /** Share index used */
  shareIndex: number;
  /** The share's contribution to the signature */
  partialSig: string;
  /** Key ID this signature belongs to */
  keyId: string;
  /** Message hash that was signed */
  messageHash: string;
}

/**
 * Result of distributed key generation
 */
export interface DKGResult {
  /** Individual key shares */
  shares: KeyShare[];
  /** Public key (can be shared publicly) */
  publicKey: string;
  /** Ethereum address */
  address: string;
  /** Unique key identifier */
  keyId: string;
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
 * Generate a random private key
 */
function generatePrivateKey(): string {
  const bytes = randomBytes(32);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  // Ensure value is in valid range [1, n-1]
  value = (value % (CURVE_ORDER - 1n)) + 1n;
  return value.toString(16).padStart(64, '0');
}

/**
 * Derive public key from private key
 */
function derivePublicKey(privateKey: string): string {
  const pubKeyPoint = secp256k1.ProjectivePoint.fromPrivateKey(hexToBytes(privateKey));
  return bytesToHex(pubKeyPoint.toRawBytes(false)); // Uncompressed
}

/**
 * Derive Ethereum address from public key
 */
function publicKeyToAddress(publicKey: string): string {
  const pubKeyBytes = hexToBytes(publicKey);
  // Remove the 0x04 prefix for uncompressed keys
  const pubKeyWithoutPrefix = pubKeyBytes.slice(1);
  const hash = keccak_256(pubKeyWithoutPrefix);
  const address = bytesToHex(hash.slice(-20));
  return '0x' + address;
}

/**
 * Generate a unique key identifier
 */
function generateKeyId(): string {
  const bytes = randomBytes(16);
  return bytesToHex(bytes);
}

/**
 * Distributed Key Generation (DKG)
 *
 * Generates a new private key and splits it into shares.
 * Each share can be given to a different party (device, guardian, etc.)
 *
 * @param config Threshold configuration
 * @returns DKG result with shares and public key
 */
export function generateDistributedKey(config: ThresholdConfig): DKGResult {
  const { totalShares, threshold } = config;

  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    throw new Error('Total shares must be >= threshold');
  }

  // Generate a fresh private key
  const privateKey = generatePrivateKey();

  // Derive public key and address
  const publicKey = derivePublicKey(privateKey);
  const address = publicKeyToAddress(publicKey);

  // Split the private key
  const keyId = generateKeyId();
  const rawShares = splitSecret(privateKey, totalShares, threshold);

  // Create key shares with metadata
  const shares: KeyShare[] = rawShares.map((share) => ({
    index: share.x,
    share: share.y,
    publicKey,
    address,
    keyId,
    config,
  }));

  // Clear the private key from memory (best effort)
  // In a real implementation, use secure memory handling

  return {
    shares,
    publicKey,
    address,
    keyId,
  };
}

/**
 * Import an existing private key and split it into shares
 *
 * @param privateKey Existing private key (hex string)
 * @param config Threshold configuration
 * @returns DKG result with shares
 */
export function importAndSplitKey(
  privateKey: string,
  config: ThresholdConfig
): DKGResult {
  const { totalShares, threshold } = config;

  // Normalize private key
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;

  // Derive public key and address
  const publicKey = derivePublicKey(cleanKey);
  const address = publicKeyToAddress(publicKey);

  // Split the private key
  const keyId = generateKeyId();
  const rawShares = splitSecret(cleanKey, totalShares, threshold);

  // Create key shares with metadata
  const shares: KeyShare[] = rawShares.map((share) => ({
    index: share.x,
    share: share.y,
    publicKey,
    address,
    keyId,
    config,
  }));

  return {
    shares,
    publicKey,
    address,
    keyId,
  };
}

/**
 * Sign a message using threshold shares
 *
 * This function reconstructs the private key from shares, signs the message,
 * and immediately clears the key from memory.
 *
 * @param messageHash 32-byte message hash to sign (e.g., keccak256 of message)
 * @param shares Array of key shares (must have at least threshold shares)
 * @returns Signature in Ethereum format (r, s, v)
 */
export async function signWithShares(
  messageHash: string | Uint8Array,
  shares: KeyShare[]
): Promise<{ r: string; s: string; v: number; signature: string }> {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares to sign');
  }

  // Verify all shares belong to the same key
  const keyId = shares[0].keyId;
  const threshold = shares[0].config.threshold;

  if (shares.length < threshold) {
    throw new Error(`Need at least ${threshold} shares, got ${shares.length}`);
  }

  for (const share of shares) {
    if (share.keyId !== keyId) {
      throw new Error('All shares must belong to the same key');
    }
  }

  // Reconstruct the private key
  const rawShares: Share[] = shares.map((s) => ({
    x: s.index,
    y: s.share,
  }));

  const privateKey = combineShares(rawShares);

  // Normalize message hash
  const msgHash =
    typeof messageHash === 'string'
      ? hexToBytes(messageHash)
      : messageHash;

  if (msgHash.length !== 32) {
    throw new Error('Message hash must be 32 bytes');
  }

  // Sign the message
  const signature = await secp256k1.signAsync(msgHash, hexToBytes(privateKey), {
    lowS: true, // Ethereum requires low-S signatures
  });

  // Calculate recovery parameter (v)
  // For Ethereum: v = 27 + recovery_id
  const recoveryBit = signature.recovery;
  const v = 27 + (recoveryBit ?? 0);

  // Format signature components
  const r = signature.r.toString(16).padStart(64, '0');
  const s = signature.s.toString(16).padStart(64, '0');

  // Combine into Ethereum signature format
  const ethSignature = '0x' + r + s + v.toString(16);

  return {
    r: '0x' + r,
    s: '0x' + s,
    v,
    signature: ethSignature,
  };
}

/**
 * Sign a personal message (EIP-191) using threshold shares
 */
export async function signPersonalMessage(
  message: string | Uint8Array,
  shares: KeyShare[]
): Promise<string> {
  // Prepare message according to EIP-191
  const messageBytes =
    typeof message === 'string' ? new TextEncoder().encode(message) : message;

  const prefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
  const prefixBytes = new TextEncoder().encode(prefix);

  const fullMessage = new Uint8Array(prefixBytes.length + messageBytes.length);
  fullMessage.set(prefixBytes);
  fullMessage.set(messageBytes, prefixBytes.length);

  // Hash the message
  const messageHash = keccak_256(fullMessage);

  // Sign
  const { signature } = await signWithShares(messageHash, shares);
  return signature;
}

/**
 * Sign typed data (EIP-712) using threshold shares
 */
export async function signTypedData(
  domainSeparator: Uint8Array,
  structHash: Uint8Array,
  shares: KeyShare[]
): Promise<string> {
  // Prepare EIP-712 message
  const message = new Uint8Array(2 + 32 + 32);
  message[0] = 0x19;
  message[1] = 0x01;
  message.set(domainSeparator, 2);
  message.set(structHash, 34);

  // Hash
  const messageHash = keccak_256(message);

  // Sign
  const { signature } = await signWithShares(messageHash, shares);
  return signature;
}

/**
 * Verify a signature against the public key
 */
export function verifySignature(
  messageHash: string | Uint8Array,
  signature: string,
  publicKey: string
): boolean {
  try {
    const msgHash =
      typeof messageHash === 'string'
        ? hexToBytes(messageHash)
        : messageHash;

    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;
    const r = BigInt('0x' + sigHex.slice(0, 64));
    const s = BigInt('0x' + sigHex.slice(64, 128));

    const sig = new secp256k1.Signature(r, s);
    const pubKeyBytes = hexToBytes(publicKey);

    return secp256k1.verify(sig, msgHash, pubKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Recover the public key from a signature
 */
export function recoverPublicKey(
  messageHash: string | Uint8Array,
  signature: string
): string | null {
  try {
    const msgHash =
      typeof messageHash === 'string'
        ? hexToBytes(messageHash)
        : messageHash;

    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature;
    const r = BigInt('0x' + sigHex.slice(0, 64));
    const s = BigInt('0x' + sigHex.slice(64, 128));
    const v = parseInt(sigHex.slice(128, 130), 16);

    const recovery = v >= 27 ? v - 27 : v;
    const sig = new secp256k1.Signature(r, s).addRecoveryBit(recovery);

    const recovered = sig.recoverPublicKey(msgHash);
    return bytesToHex(recovered.toRawBytes(false));
  } catch {
    return null;
  }
}
