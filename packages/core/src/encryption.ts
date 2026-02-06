import { secretbox, randomBytes } from 'tweetnacl';
import { scrypt } from '@noble/hashes/scrypt';
import type { EncryptedPayload, SerializedEncryptedPayload } from './types.js';

/**
 * Current encryption version
 * Increment when changing encryption parameters
 */
export const ENCRYPTION_VERSION = 1;

/**
 * scrypt parameters (N=2^18, r=8, p=1)
 * These provide strong security while remaining usable on modern devices
 * ~1 second derivation time on typical hardware
 */
const SCRYPT_PARAMS = {
  N: 2 ** 18, // CPU/memory cost parameter
  r: 8,       // Block size
  p: 1,       // Parallelization parameter
  dkLen: 32,  // Output key length (256 bits for NaCl secretbox)
} as const;

/**
 * Derive an encryption key from a password using scrypt
 * @param password User's password
 * @param salt Random salt (must be stored with ciphertext)
 * @returns 32-byte encryption key
 */
export function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  const passwordBytes = new TextEncoder().encode(password);
  return scrypt(passwordBytes, salt, SCRYPT_PARAMS);
}

/**
 * Generate a random salt for key derivation
 * @returns 32-byte random salt
 */
export function generateSalt(): Uint8Array {
  return randomBytes(32);
}

/**
 * Encrypt plaintext using NaCl secretbox (XSalsa20-Poly1305)
 * @param plaintext Data to encrypt
 * @param password User's password
 * @returns Encrypted payload with nonce and salt
 */
export function encrypt(plaintext: string, password: string): EncryptedPayload {
  const salt = generateSalt();
  const key = deriveKey(password, salt);
  const nonce = randomBytes(secretbox.nonceLength); // 24 bytes
  const plaintextBytes = new TextEncoder().encode(plaintext);

  const ciphertext = secretbox(plaintextBytes, nonce, key);

  // Clear key from memory
  key.fill(0);

  return {
    ciphertext,
    nonce,
    salt,
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt ciphertext using NaCl secretbox
 * @param payload Encrypted payload
 * @param password User's password
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong password or corrupted data)
 */
export function decrypt(payload: EncryptedPayload, password: string): string {
  if (payload.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${payload.version}`);
  }

  const key = deriveKey(password, payload.salt);
  const plaintext = secretbox.open(payload.ciphertext, payload.nonce, key);

  // Clear key from memory
  key.fill(0);

  if (!plaintext) {
    throw new Error('Decryption failed: invalid password or corrupted data');
  }

  return new TextDecoder().decode(plaintext);
}

/**
 * Serialize encrypted payload for storage (converts Uint8Array to base64)
 */
export function serializePayload(payload: EncryptedPayload): SerializedEncryptedPayload {
  return {
    ciphertext: uint8ArrayToBase64(payload.ciphertext),
    nonce: uint8ArrayToBase64(payload.nonce),
    salt: uint8ArrayToBase64(payload.salt),
    version: payload.version,
  };
}

/**
 * Deserialize encrypted payload from storage
 */
export function deserializePayload(serialized: SerializedEncryptedPayload): EncryptedPayload {
  return {
    ciphertext: base64ToUint8Array(serialized.ciphertext),
    nonce: base64ToUint8Array(serialized.nonce),
    salt: base64ToUint8Array(serialized.salt),
    version: serialized.version,
  };
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Use built-in btoa for browser compatibility
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Securely clear sensitive data from memory
 * Note: This is best-effort in JavaScript due to GC
 */
export function secureClear(data: Uint8Array): void {
  data.fill(0);
}

/**
 * Verify a password against stored encrypted data without fully decrypting
 * Uses a known verification string stored alongside the wallet data
 */
export function verifyPassword(
  verificationPayload: EncryptedPayload,
  password: string,
  expectedValue: string
): boolean {
  try {
    const decrypted = decrypt(verificationPayload, password);
    return decrypted === expectedValue;
  } catch {
    return false;
  }
}
