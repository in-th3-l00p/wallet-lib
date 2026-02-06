import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  deriveAccount,
  deriveAccounts,
  getMasterNode,
  getPrivateKey,
  normalizeMnemonic,
  getMnemonicWordCount,
  COIN_TYPES,
} from './hd-wallet.js';

// BIP-39 test vector
// https://github.com/trezor/python-mnemonic/blob/master/vectors.json
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_MNEMONIC_ADDRESS_0 = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94';

describe('hd-wallet', () => {
  describe('generateMnemonic', () => {
    it('should generate a 12-word mnemonic by default', () => {
      const mnemonic = generateMnemonic();
      const words = mnemonic.split(' ');

      expect(words.length).toBe(12);
    });

    it('should generate a 24-word mnemonic when specified', () => {
      const mnemonic = generateMnemonic(24);
      const words = mnemonic.split(' ');

      expect(words.length).toBe(24);
    });

    it('should generate valid mnemonics', () => {
      const mnemonic12 = generateMnemonic(12);
      const mnemonic24 = generateMnemonic(24);

      expect(validateMnemonic(mnemonic12)).toBe(true);
      expect(validateMnemonic(mnemonic24)).toBe(true);
    });

    it('should generate unique mnemonics', () => {
      const mnemonic1 = generateMnemonic();
      const mnemonic2 = generateMnemonic();

      expect(mnemonic1).not.toBe(mnemonic2);
    });
  });

  describe('validateMnemonic', () => {
    it('should validate correct mnemonics', () => {
      expect(validateMnemonic(TEST_MNEMONIC)).toBe(true);
    });

    it('should reject invalid mnemonics', () => {
      expect(validateMnemonic('invalid mnemonic phrase')).toBe(false);
      expect(validateMnemonic('abandon abandon abandon')).toBe(false);
      expect(validateMnemonic('')).toBe(false);
    });

    it('should reject mnemonics with invalid words', () => {
      const invalid = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyz123';
      expect(validateMnemonic(invalid)).toBe(false);
    });

    it('should reject mnemonics with invalid checksum', () => {
      // Last word changed to break checksum
      const invalid = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon';
      expect(validateMnemonic(invalid)).toBe(false);
    });
  });

  describe('deriveAccount', () => {
    it('should derive account at index 0 correctly', () => {
      const wallet = deriveAccount(TEST_MNEMONIC, 0);

      expect(wallet.address).toBe(TEST_MNEMONIC_ADDRESS_0);
    });

    it('should derive different addresses for different indices', () => {
      const wallet0 = deriveAccount(TEST_MNEMONIC, 0);
      const wallet1 = deriveAccount(TEST_MNEMONIC, 1);
      const wallet2 = deriveAccount(TEST_MNEMONIC, 2);

      expect(wallet0.address).not.toBe(wallet1.address);
      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet0.address).not.toBe(wallet2.address);
    });

    it('should use correct derivation path', () => {
      const wallet = deriveAccount(TEST_MNEMONIC, 5);

      expect(wallet.path).toBe("m/44'/60'/0'/0/5");
    });

    it('should support custom coin types', () => {
      const ethWallet = deriveAccount(TEST_MNEMONIC, 0, COIN_TYPES.ETHEREUM);
      const etcWallet = deriveAccount(TEST_MNEMONIC, 0, COIN_TYPES.ETHEREUM_CLASSIC);

      // Different coin types should produce different addresses
      expect(ethWallet.address).not.toBe(etcWallet.address);
    });

    it('should produce deterministic results', () => {
      const wallet1 = deriveAccount(TEST_MNEMONIC, 0);
      const wallet2 = deriveAccount(TEST_MNEMONIC, 0);

      expect(wallet1.address).toBe(wallet2.address);
      expect(wallet1.privateKey).toBe(wallet2.privateKey);
    });
  });

  describe('deriveAccounts', () => {
    it('should derive multiple accounts', () => {
      const accounts = deriveAccounts(TEST_MNEMONIC, 3);

      expect(accounts.length).toBe(3);
      expect(accounts[0].index).toBe(0);
      expect(accounts[1].index).toBe(1);
      expect(accounts[2].index).toBe(2);
    });

    it('should derive accounts starting from custom index', () => {
      const accounts = deriveAccounts(TEST_MNEMONIC, 2, 5);

      expect(accounts.length).toBe(2);
      expect(accounts[0].index).toBe(5);
      expect(accounts[1].index).toBe(6);
    });

    it('should include derivation paths', () => {
      const accounts = deriveAccounts(TEST_MNEMONIC, 2);

      expect(accounts[0].derivationPath).toBe("m/44'/60'/0'/0/0");
      expect(accounts[1].derivationPath).toBe("m/44'/60'/0'/0/1");
    });

    it('should match single derivation results', () => {
      const accounts = deriveAccounts(TEST_MNEMONIC, 3);
      const single0 = deriveAccount(TEST_MNEMONIC, 0);
      const single1 = deriveAccount(TEST_MNEMONIC, 1);
      const single2 = deriveAccount(TEST_MNEMONIC, 2);

      expect(accounts[0].address).toBe(single0.address);
      expect(accounts[1].address).toBe(single1.address);
      expect(accounts[2].address).toBe(single2.address);
    });
  });

  describe('getMasterNode', () => {
    it('should return HDNodeWallet at standard Ethereum path', () => {
      const node = getMasterNode(TEST_MNEMONIC);

      expect(node).toBeDefined();
      // Returns wallet at m/44'/60'/0'/0/0 (depth 5)
      expect(node.depth).toBe(5);
      expect(node.address).toBe(TEST_MNEMONIC_ADDRESS_0);
    });

    it('should support optional passphrase', () => {
      const nodeNoPass = getMasterNode(TEST_MNEMONIC);
      const nodeWithPass = getMasterNode(TEST_MNEMONIC, 'passphrase');

      // Different passphrase should produce different keys
      expect(nodeNoPass.privateKey).not.toBe(nodeWithPass.privateKey);
    });
  });

  describe('getPrivateKey', () => {
    it('should return private key with 0x prefix', () => {
      const privateKey = getPrivateKey(TEST_MNEMONIC, 0);

      expect(privateKey.startsWith('0x')).toBe(true);
      expect(privateKey.length).toBe(66); // 0x + 64 hex chars
    });

    it('should match derived wallet private key', () => {
      const privateKey = getPrivateKey(TEST_MNEMONIC, 0);
      const wallet = deriveAccount(TEST_MNEMONIC, 0);

      expect(privateKey).toBe(wallet.privateKey);
    });
  });

  describe('normalizeMnemonic', () => {
    it('should lowercase mnemonic', () => {
      const input = 'Abandon ABANDON AbAnDoN abandon abandon abandon abandon abandon abandon abandon abandon About';
      const normalized = normalizeMnemonic(input);

      expect(normalized).toBe(TEST_MNEMONIC);
    });

    it('should trim whitespace', () => {
      const input = '  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ';
      const normalized = normalizeMnemonic(input);

      expect(normalized).toBe(TEST_MNEMONIC);
    });

    it('should collapse multiple spaces', () => {
      const input = 'abandon  abandon   abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const normalized = normalizeMnemonic(input);

      expect(normalized).toBe(TEST_MNEMONIC);
    });

    it('should handle tabs and newlines', () => {
      const input = 'abandon\tabandon\nabandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const normalized = normalizeMnemonic(input);

      expect(normalized).toBe(TEST_MNEMONIC);
    });
  });

  describe('getMnemonicWordCount', () => {
    it('should return 12 for 12-word mnemonic', () => {
      expect(getMnemonicWordCount(TEST_MNEMONIC)).toBe(12);
    });

    it('should return 24 for 24-word mnemonic', () => {
      const mnemonic24 = generateMnemonic(24);
      expect(getMnemonicWordCount(mnemonic24)).toBe(24);
    });

    it('should handle extra whitespace', () => {
      const input = '  abandon  abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon about  ';
      expect(getMnemonicWordCount(input)).toBe(12);
    });
  });

  describe('BIP-44 compliance', () => {
    it('should use correct Ethereum coin type (60)', () => {
      expect(COIN_TYPES.ETHEREUM).toBe(60);
    });

    it('should follow BIP-44 path structure', () => {
      const wallet = deriveAccount(TEST_MNEMONIC, 0);

      // Path should be m/44'/60'/0'/0/0
      // - 44' = purpose (BIP-44)
      // - 60' = coin type (Ethereum)
      // - 0' = account
      // - 0 = change (external)
      // - 0 = address index
      expect(wallet.path).toMatch(/^m\/44'\/60'\/0'\/0\/\d+$/);
    });
  });
});
