import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalWallet } from './wallet.js';
import { IndexedDBStorage } from './storage/indexed-db.js';

// Test mnemonic (DO NOT use in production)
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_PASSWORD = 'test-password-123';

describe('LocalWallet', () => {
  let storage: IndexedDBStorage;
  let wallet: LocalWallet;

  beforeEach(async () => {
    storage = new IndexedDBStorage();
    wallet = LocalWallet.create(storage, { autoLockTimeoutMs: 0 }); // Disable auto-lock for tests
  });

  afterEach(async () => {
    await storage.clear();
    storage.close();
  });

  describe('initialization', () => {
    it('should start uninitialized', async () => {
      const initialized = await wallet.isInitialized();
      expect(initialized).toBe(false);
    });

    it('should start locked', () => {
      expect(wallet.isLocked()).toBe(true);
    });
  });

  describe('generateWallet', () => {
    it('should generate a new wallet with 12-word mnemonic', async () => {
      const { mnemonic, account } = await wallet.generateWallet(TEST_PASSWORD);

      expect(mnemonic.split(' ').length).toBe(12);
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(account.index).toBe(0);
      expect(account.derivationPath).toBe("m/44'/60'/0'/0/0");
    });

    it('should generate a new wallet with 24-word mnemonic', async () => {
      const { mnemonic } = await wallet.generateWallet(TEST_PASSWORD, 24);

      expect(mnemonic.split(' ').length).toBe(24);
    });

    it('should be initialized after generation', async () => {
      await wallet.generateWallet(TEST_PASSWORD);

      expect(await wallet.isInitialized()).toBe(true);
    });

    it('should be unlocked after generation', async () => {
      await wallet.generateWallet(TEST_PASSWORD);

      expect(wallet.isLocked()).toBe(false);
    });

    it('should throw if wallet already initialized', async () => {
      await wallet.generateWallet(TEST_PASSWORD);

      await expect(wallet.generateWallet(TEST_PASSWORD)).rejects.toThrow('already initialized');
    });
  });

  describe('importFromMnemonic', () => {
    it('should import wallet from valid mnemonic', async () => {
      const account = await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);

      expect(account.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
      expect(account.index).toBe(0);
    });

    it('should be initialized after import', async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);

      expect(await wallet.isInitialized()).toBe(true);
    });

    it('should throw for invalid mnemonic', async () => {
      await expect(wallet.importFromMnemonic('invalid mnemonic', TEST_PASSWORD)).rejects.toThrow('Invalid mnemonic');
    });

    it('should normalize mnemonic before import', async () => {
      const messyMnemonic = '  ABANDON  abandon  ABANDON abandon abandon abandon abandon abandon abandon abandon abandon ABOUT  ';
      const account = await wallet.importFromMnemonic(messyMnemonic, TEST_PASSWORD);

      // Should produce same address as normalized mnemonic
      expect(account.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    });
  });

  describe('lock/unlock', () => {
    beforeEach(async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
    });

    it('should lock wallet', async () => {
      expect(wallet.isLocked()).toBe(false);

      await wallet.lock();

      expect(wallet.isLocked()).toBe(true);
    });

    it('should unlock with correct password', async () => {
      await wallet.lock();

      const success = await wallet.unlock(TEST_PASSWORD);

      expect(success).toBe(true);
      expect(wallet.isLocked()).toBe(false);
    });

    it('should fail to unlock with wrong password', async () => {
      await wallet.lock();

      const success = await wallet.unlock('wrong-password');

      expect(success).toBe(false);
      expect(wallet.isLocked()).toBe(true);
    });
  });

  describe('accounts', () => {
    beforeEach(async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
    });

    it('should have one account after import', async () => {
      const accounts = await wallet.getAccounts();

      expect(accounts.length).toBe(1);
    });

    it('should get active account', async () => {
      const active = await wallet.getActiveAccount();

      expect(active).not.toBeNull();
      expect(active?.address).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
    });

    it('should create new account', async () => {
      const newAccount = await wallet.createAccount('Second Account');

      expect(newAccount.index).toBe(1);
      expect(newAccount.name).toBe('Second Account');
      expect(newAccount.address).not.toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94');

      const accounts = await wallet.getAccounts();
      expect(accounts.length).toBe(2);
    });

    it('should set active account', async () => {
      const second = await wallet.createAccount();
      await wallet.setActiveAccount(second.address);

      const active = await wallet.getActiveAccount();
      expect(active?.address).toBe(second.address);
    });

    it('should throw when setting invalid active account', async () => {
      await expect(wallet.setActiveAccount('0x0000000000000000000000000000000000000000')).rejects.toThrow('not found');
    });
  });

  describe('chain operations', () => {
    beforeEach(async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
    });

    it('should default to Ethereum mainnet', () => {
      expect(wallet.getChainId()).toBe(1);
    });

    it('should switch chains', async () => {
      await wallet.switchChain(137); // Polygon

      expect(wallet.getChainId()).toBe(137);
    });

    it('should throw for unsupported chain', async () => {
      await expect(wallet.switchChain(999999)).rejects.toThrow('Unsupported chain');
    });
  });

  describe('signing', () => {
    beforeEach(async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
    });

    it('should sign message', async () => {
      const message = 'Hello, Ethereum!';
      const signature = await wallet.signMessage(message);

      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should sign typed data (EIP-712)', async () => {
      const domain = {
        name: 'Test App',
        version: '1',
        chainId: 1,
      };
      const types = {
        Message: [{ name: 'content', type: 'string' }],
      };
      const value = { content: 'Hello' };

      const signature = await wallet.signTypedData(domain, types, value);

      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should throw when locked', async () => {
      await wallet.lock();

      await expect(wallet.signMessage('test')).rejects.toThrow('locked');
    });
  });

  describe('exportMnemonic', () => {
    it('should export mnemonic with correct password', async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
      await wallet.lock();

      const exported = await wallet.exportMnemonic(TEST_PASSWORD);

      expect(exported).toBe(TEST_MNEMONIC);
    });

    it('should throw with wrong password', async () => {
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
      await wallet.lock();

      await expect(wallet.exportMnemonic('wrong-password')).rejects.toThrow('Invalid password');
    });
  });

  describe('persistence', () => {
    it('should persist wallet across instances', async () => {
      // Create and import wallet
      await wallet.importFromMnemonic(TEST_MNEMONIC, TEST_PASSWORD);
      await wallet.createAccount('Second');
      await wallet.lock();

      // Create new wallet instance with same storage
      const wallet2 = LocalWallet.create(storage, { autoLockTimeoutMs: 0 });

      expect(await wallet2.isInitialized()).toBe(true);
      expect(wallet2.isLocked()).toBe(true);

      // Unlock and verify accounts
      const success = await wallet2.unlock(TEST_PASSWORD);
      expect(success).toBe(true);

      const accounts = await wallet2.getAccounts();
      expect(accounts.length).toBe(2);
      expect(accounts[1].name).toBe('Second');
    });
  });
});
