import { randomBytes } from '@noble/hashes/utils';

/**
 * Shamir's Secret Sharing implementation over a prime field
 * Uses a 256-bit prime for compatibility with secp256k1 private keys
 */

// Prime field for secp256k1 curve order
const PRIME = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;

/**
 * A single share of a split secret
 */
export interface Share {
  /** Share index (1-based, never 0) */
  x: number;
  /** Share value as hex string */
  y: string;
}

/**
 * Serialized share for storage/transmission
 */
export interface SerializedShare {
  x: number;
  y: string;
  threshold: number;
  totalShares: number;
  id: string; // Unique identifier for the secret this share belongs to
}

/**
 * Generate a random 256-bit number in the prime field
 */
function randomFieldElement(): bigint {
  const bytes = randomBytes(32);
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value % PRIME;
}

/**
 * Convert a hex string to bigint
 */
function hexToBigInt(hex: string): bigint {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + cleanHex);
}

/**
 * Convert a bigint to hex string (64 chars, no 0x prefix)
 */
function bigIntToHex(value: bigint): string {
  const hex = value.toString(16);
  return hex.padStart(64, '0');
}

/**
 * Modular exponentiation: (base^exp) mod mod
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * base) % mod;
    }
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Modular inverse using Fermat's little theorem
 * a^(-1) mod p = a^(p-2) mod p (when p is prime)
 */
function modInverse(a: bigint, mod: bigint): bigint {
  return modPow(a, mod - 2n, mod);
}

/**
 * Evaluate polynomial at point x
 * coefficients[0] is the constant term (the secret)
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = 0n;
  let xPow = 1n;

  for (const coef of coefficients) {
    result = (result + coef * xPow) % PRIME;
    xPow = (xPow * x) % PRIME;
  }

  // Ensure positive result
  return ((result % PRIME) + PRIME) % PRIME;
}

/**
 * Split a secret into n shares with threshold k
 * @param secret The secret to split (hex string, typically a private key)
 * @param totalShares Total number of shares to create (n)
 * @param threshold Minimum shares needed to reconstruct (k)
 * @returns Array of shares
 */
export function splitSecret(
  secret: string,
  totalShares: number,
  threshold: number
): Share[] {
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    throw new Error('Total shares must be >= threshold');
  }
  if (totalShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }

  const secretBigInt = hexToBigInt(secret);
  if (secretBigInt >= PRIME) {
    throw new Error('Secret too large for prime field');
  }

  // Generate random polynomial coefficients
  // f(x) = secret + a1*x + a2*x^2 + ... + a(k-1)*x^(k-1)
  const coefficients: bigint[] = [secretBigInt];
  for (let i = 1; i < threshold; i++) {
    coefficients.push(randomFieldElement());
  }

  // Generate shares by evaluating polynomial at x = 1, 2, ..., n
  const shares: Share[] = [];
  for (let i = 1; i <= totalShares; i++) {
    const y = evaluatePolynomial(coefficients, BigInt(i));
    shares.push({
      x: i,
      y: bigIntToHex(y),
    });
  }

  return shares;
}

/**
 * Combine shares to reconstruct the secret using Lagrange interpolation
 * @param shares Array of shares (must have at least threshold shares)
 * @returns The reconstructed secret as hex string
 */
export function combineShares(shares: Share[]): string {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares to reconstruct');
  }

  // Check for duplicate x values
  const xValues = new Set(shares.map((s) => s.x));
  if (xValues.size !== shares.length) {
    throw new Error('Duplicate share indices detected');
  }

  // Lagrange interpolation at x = 0 to recover the secret
  let secret = 0n;

  for (let i = 0; i < shares.length; i++) {
    const xi = BigInt(shares[i].x);
    const yi = hexToBigInt(shares[i].y);

    // Calculate Lagrange basis polynomial L_i(0)
    let numerator = 1n;
    let denominator = 1n;

    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        const xj = BigInt(shares[j].x);
        // L_i(0) = product of (0 - xj) / (xi - xj) for all j != i
        numerator = (numerator * (-xj)) % PRIME;
        denominator = (denominator * (xi - xj)) % PRIME;
      }
    }

    // Ensure positive values
    numerator = ((numerator % PRIME) + PRIME) % PRIME;
    denominator = ((denominator % PRIME) + PRIME) % PRIME;

    // L_i(0) = numerator * denominator^(-1)
    const lagrangeBasis = (numerator * modInverse(denominator, PRIME)) % PRIME;

    // Add contribution: y_i * L_i(0)
    secret = (secret + yi * lagrangeBasis) % PRIME;
  }

  // Ensure positive result
  secret = ((secret % PRIME) + PRIME) % PRIME;

  return bigIntToHex(secret);
}

/**
 * Serialize a share for storage or transmission
 */
export function serializeShare(
  share: Share,
  threshold: number,
  totalShares: number,
  secretId: string
): SerializedShare {
  return {
    x: share.x,
    y: share.y,
    threshold,
    totalShares,
    id: secretId,
  };
}

/**
 * Deserialize a share
 */
export function deserializeShare(serialized: SerializedShare): Share {
  return {
    x: serialized.x,
    y: serialized.y,
  };
}

/**
 * Verify that a set of shares can reconstruct to the same secret
 * (without revealing the secret)
 */
export function verifySharesConsistent(
  shares: Share[],
  threshold: number
): boolean {
  if (shares.length < threshold) {
    return false;
  }

  // Take different subsets of threshold shares and verify they produce the same result
  const subsets: Share[][] = [];

  // Generate a few random subsets
  for (let i = 0; i < Math.min(3, shares.length - threshold + 1); i++) {
    const subset = shares.slice(i, i + threshold);
    if (subset.length === threshold) {
      subsets.push(subset);
    }
  }

  if (subsets.length < 2) {
    return true; // Not enough subsets to verify
  }

  // All subsets should reconstruct to the same value
  const firstResult = combineShares(subsets[0]);
  for (let i = 1; i < subsets.length; i++) {
    if (combineShares(subsets[i]) !== firstResult) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a unique identifier for a secret sharing session
 */
export function generateSecretId(): string {
  const bytes = randomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
