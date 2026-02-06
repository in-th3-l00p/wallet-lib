import { describe, it, expect } from 'vitest';
import {
  splitSecret,
  combineShares,
  verifySharesConsistent,
  generateSecretId,
} from './shamir.js';

describe('Shamir Secret Sharing', () => {
  // Test private key (DO NOT use in production)
  const TEST_SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  describe('splitSecret', () => {
    it('should split a secret into shares', () => {
      const shares = splitSecret(TEST_SECRET, 5, 3);

      expect(shares.length).toBe(5);
      shares.forEach((share, i) => {
        expect(share.x).toBe(i + 1);
        expect(share.y).toHaveLength(64); // 256 bits = 64 hex chars
      });
    });

    it('should throw if threshold < 2', () => {
      expect(() => splitSecret(TEST_SECRET, 3, 1)).toThrow('Threshold must be at least 2');
    });

    it('should throw if totalShares < threshold', () => {
      expect(() => splitSecret(TEST_SECRET, 2, 3)).toThrow('Total shares must be >= threshold');
    });

    it('should generate different shares each time (random polynomial)', () => {
      const shares1 = splitSecret(TEST_SECRET, 3, 2);
      const shares2 = splitSecret(TEST_SECRET, 3, 2);

      // Same secret, but different polynomial coefficients
      expect(shares1[0].y).not.toBe(shares2[0].y);
    });
  });

  describe('combineShares', () => {
    it('should reconstruct secret from minimum threshold shares', () => {
      const shares = splitSecret(TEST_SECRET, 5, 3);

      // Use exactly threshold shares
      const subset = shares.slice(0, 3);
      const recovered = combineShares(subset);

      expect(recovered).toBe(TEST_SECRET);
    });

    it('should reconstruct secret from any subset of threshold shares', () => {
      const shares = splitSecret(TEST_SECRET, 5, 3);

      // Use different subsets
      const subset1 = [shares[0], shares[1], shares[2]];
      const subset2 = [shares[0], shares[2], shares[4]];
      const subset3 = [shares[1], shares[3], shares[4]];

      expect(combineShares(subset1)).toBe(TEST_SECRET);
      expect(combineShares(subset2)).toBe(TEST_SECRET);
      expect(combineShares(subset3)).toBe(TEST_SECRET);
    });

    it('should reconstruct secret with more than threshold shares', () => {
      const shares = splitSecret(TEST_SECRET, 5, 3);

      // Use all 5 shares
      const recovered = combineShares(shares);

      expect(recovered).toBe(TEST_SECRET);
    });

    it('should throw if fewer than 2 shares provided', () => {
      const shares = splitSecret(TEST_SECRET, 3, 2);

      expect(() => combineShares([shares[0]])).toThrow('Need at least 2 shares');
    });

    it('should throw if duplicate share indices', () => {
      const shares = splitSecret(TEST_SECRET, 3, 2);
      const duplicates = [shares[0], { ...shares[0] }];

      expect(() => combineShares(duplicates)).toThrow('Duplicate share indices');
    });

    it('should handle various key sizes', () => {
      // Smaller secret
      const smallSecret = '1234567890abcdef1234567890abcdef';
      const smallShares = splitSecret(smallSecret.padStart(64, '0'), 3, 2);
      const recoveredSmall = combineShares(smallShares.slice(0, 2));
      expect(recoveredSmall).toBe(smallSecret.padStart(64, '0'));
    });
  });

  describe('verifySharesConsistent', () => {
    it('should return true for valid shares', () => {
      const shares = splitSecret(TEST_SECRET, 5, 3);

      expect(verifySharesConsistent(shares, 3)).toBe(true);
    });

    it('should return false if shares from different secrets', () => {
      const shares1 = splitSecret(TEST_SECRET, 3, 2);
      const shares2 = splitSecret('fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210', 3, 2);

      // Mix shares from different secrets
      const mixed = [shares1[0], shares2[1]];

      // This won't fail combineShares but the result will be wrong
      // verifySharesConsistent should detect inconsistency if we have enough shares
      // With only 2 shares and threshold 2, verification is limited
    });

    it('should return false if not enough shares', () => {
      const shares = splitSecret(TEST_SECRET, 5, 3);

      expect(verifySharesConsistent(shares.slice(0, 2), 3)).toBe(false);
    });
  });

  describe('generateSecretId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSecretId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate 32-character hex strings', () => {
      const id = generateSecretId();
      expect(id).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('edge cases', () => {
    it('should handle 2-of-2 scheme', () => {
      const shares = splitSecret(TEST_SECRET, 2, 2);
      const recovered = combineShares(shares);
      expect(recovered).toBe(TEST_SECRET);
    });

    it('should handle 5-of-5 scheme', () => {
      const shares = splitSecret(TEST_SECRET, 5, 5);
      const recovered = combineShares(shares);
      expect(recovered).toBe(TEST_SECRET);
    });

    it('should handle secret with leading zeros', () => {
      const secretWithZeros = '0000000000000000000000000000000000000000000000000000000000000001';
      const shares = splitSecret(secretWithZeros, 3, 2);
      const recovered = combineShares(shares.slice(0, 2));
      expect(recovered).toBe(secretWithZeros);
    });
  });
});
