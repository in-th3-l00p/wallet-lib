import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  deriveKey,
  generateSalt,
  serializePayload,
  deserializePayload,
  uint8ArrayToBase64,
  base64ToUint8Array,
  ENCRYPTION_VERSION,
} from './encryption.js';

describe('encryption', () => {
  describe('deriveKey', () => {
    it('should derive a 32-byte key from password and salt', () => {
      const password = 'test-password-123';
      const salt = generateSalt();
      const key = deriveKey(password, salt);

      expect(key).toBeInstanceOf(Uint8Array);
      expect(key.length).toBe(32);
    });

    it('should produce consistent keys for same password and salt', () => {
      const password = 'test-password';
      const salt = new Uint8Array(32).fill(42);

      const key1 = deriveKey(password, salt);
      const key2 = deriveKey(password, salt);

      expect(key1).toEqual(key2);
    });

    it('should produce different keys for different passwords', () => {
      const salt = new Uint8Array(32).fill(42);

      const key1 = deriveKey('password1', salt);
      const key2 = deriveKey('password2', salt);

      expect(key1).not.toEqual(key2);
    });

    it('should produce different keys for different salts', () => {
      const password = 'same-password';

      const key1 = deriveKey(password, new Uint8Array(32).fill(1));
      const key2 = deriveKey(password, new Uint8Array(32).fill(2));

      expect(key1).not.toEqual(key2);
    });
  });

  describe('generateSalt', () => {
    it('should generate a 32-byte random salt', () => {
      const salt = generateSalt();

      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(32);
    });

    it('should generate unique salts', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      expect(salt1).not.toEqual(salt2);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string successfully', () => {
      const plaintext = 'This is a secret message';
      const password = 'secure-password-123';

      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt mnemonic phrases correctly', () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const password = 'wallet-password';

      const encrypted = encrypt(mnemonic, password);
      const decrypted = decrypt(encrypted, password);

      expect(decrypted).toBe(mnemonic);
    });

    it('should produce different ciphertext for same plaintext (due to random nonce)', () => {
      const plaintext = 'same message';
      const password = 'same password';

      const encrypted1 = encrypt(plaintext, password);
      const encrypted2 = encrypt(plaintext, password);

      // Ciphertext should differ due to random nonce and salt
      expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
      expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
      expect(encrypted1.salt).not.toEqual(encrypted2.salt);
    });

    it('should throw error with wrong password', () => {
      const plaintext = 'secret data';
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';

      const encrypted = encrypt(plaintext, correctPassword);

      expect(() => decrypt(encrypted, wrongPassword)).toThrow('Decryption failed');
    });

    it('should include correct version number', () => {
      const encrypted = encrypt('test', 'password');

      expect(encrypted.version).toBe(ENCRYPTION_VERSION);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const password = 'password';

      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const password = 'password';

      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long plaintext', () => {
      const plaintext = 'x'.repeat(10000);
      const password = 'password';

      const encrypted = encrypt(plaintext, password);
      const decrypted = decrypt(encrypted, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('serializePayload/deserializePayload', () => {
    it('should serialize and deserialize payload correctly', () => {
      const original = encrypt('test message', 'password');
      const serialized = serializePayload(original);
      const deserialized = deserializePayload(serialized);

      expect(deserialized.ciphertext).toEqual(original.ciphertext);
      expect(deserialized.nonce).toEqual(original.nonce);
      expect(deserialized.salt).toEqual(original.salt);
      expect(deserialized.version).toBe(original.version);
    });

    it('should produce JSON-safe serialization', () => {
      const payload = encrypt('test', 'password');
      const serialized = serializePayload(payload);

      // Should be valid JSON
      const json = JSON.stringify(serialized);
      const parsed = JSON.parse(json);

      expect(parsed.ciphertext).toBe(serialized.ciphertext);
      expect(parsed.nonce).toBe(serialized.nonce);
      expect(parsed.salt).toBe(serialized.salt);
      expect(parsed.version).toBe(serialized.version);
    });

    it('should allow decrypt after serialize/deserialize roundtrip', () => {
      const plaintext = 'secret message';
      const password = 'password';

      const encrypted = encrypt(plaintext, password);
      const serialized = serializePayload(encrypted);

      // Simulate storage/retrieval
      const json = JSON.stringify(serialized);
      const parsed = JSON.parse(json);

      const deserialized = deserializePayload(parsed);
      const decrypted = decrypt(deserialized, password);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('base64 encoding', () => {
    it('should encode and decode Uint8Array correctly', () => {
      const original = new Uint8Array([0, 1, 2, 255, 254, 253, 128, 64, 32]);
      const encoded = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(encoded);

      expect(decoded).toEqual(original);
    });

    it('should handle empty array', () => {
      const original = new Uint8Array([]);
      const encoded = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(encoded);

      expect(decoded).toEqual(original);
    });

    it('should produce valid base64 strings', () => {
      const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const encoded = uint8ArrayToBase64(data);

      // Should only contain base64 characters
      expect(encoded).toMatch(/^[A-Za-z0-9+/=]*$/);
    });
  });
});
