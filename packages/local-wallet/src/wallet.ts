import {
  JsonRpcProvider,
  Wallet,
  type TransactionRequest,
  type TransactionResponse,
  type TypedDataDomain,
} from 'ethers';
import {
  type Account,
  type StorageAdapter,
  type TypedDataTypes,
  type WalletProvider,
  type WalletState,
  type SerializedEncryptedPayload,
  encrypt,
  decrypt,
  serializePayload,
  deserializePayload,
  generateMnemonic,
  validateMnemonic,
  deriveAccount,
  normalizeMnemonic,
  getChain,
  getRpcUrl,
  ethereum,
} from '@panoplia/core';
import { STORAGE_KEYS, type StoredAccountMeta, type WalletSettings } from './storage/interface.js';

/**
 * Password verification magic string
 * Used to verify password correctness without decrypting mnemonic
 */
const PASSWORD_VERIFY_MAGIC = 'panoplia-wallet-v1';

/**
 * Local wallet configuration options
 */
export interface LocalWalletConfig {
  /** Storage adapter (defaults to IndexedDB) */
  storage: StorageAdapter;
  /** Default chain ID (defaults to Ethereum mainnet) */
  defaultChainId?: number;
  /** Auto-lock timeout in milliseconds (defaults to 15 minutes) */
  autoLockTimeoutMs?: number;
}

/**
 * Local wallet implementation
 * Stores encrypted mnemonic in browser storage (IndexedDB)
 * Implements the WalletProvider interface
 */
export class LocalWallet implements WalletProvider {
  private storage: StorageAdapter;
  private currentChainId: number;
  private autoLockTimeoutMs: number;

  // In-memory state (cleared on lock)
  private decryptedMnemonic: string | null = null;
  private accounts: StoredAccountMeta[] = [];
  private activeAccountAddress: string | null = null;
  private provider: JsonRpcProvider | null = null;
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: LocalWalletConfig) {
    this.storage = config.storage;
    this.currentChainId = config.defaultChainId ?? ethereum.chainId;
    this.autoLockTimeoutMs = config.autoLockTimeoutMs ?? 15 * 60 * 1000; // 15 minutes
  }

  // === Wallet Lifecycle ===

  getState(): WalletState {
    if (this.decryptedMnemonic) return 'unlocked';
    // Check if initialized is async, so we can't use it here
    // This is a sync approximation - use isInitialized() for accurate check
    return 'locked';
  }

  isLocked(): boolean {
    return this.decryptedMnemonic === null;
  }

  async isInitialized(): Promise<boolean> {
    return this.storage.hasWalletData(STORAGE_KEYS.MNEMONIC);
  }

  async lock(): Promise<void> {
    // Clear sensitive data from memory
    if (this.decryptedMnemonic) {
      // Best-effort memory clearing in JS
      this.decryptedMnemonic = null;
    }
    this.activeAccountAddress = null;
    this.clearAutoLockTimer();
  }

  async unlock(password: string): Promise<boolean> {
    try {
      // Verify password using the verification token
      const verifyData = await this.storage.getWalletData(STORAGE_KEYS.PASSWORD_VERIFY);
      if (!verifyData) {
        throw new Error('Wallet not initialized');
      }

      const verifyPayload = JSON.parse(
        new TextDecoder().decode(verifyData)
      ) as SerializedEncryptedPayload;

      const decrypted = decrypt(deserializePayload(verifyPayload), password);
      if (decrypted !== PASSWORD_VERIFY_MAGIC) {
        return false;
      }

      // Load and decrypt mnemonic
      const mnemonicData = await this.storage.getWalletData(STORAGE_KEYS.MNEMONIC);
      if (!mnemonicData) {
        throw new Error('Mnemonic not found');
      }

      const mnemonicPayload = JSON.parse(
        new TextDecoder().decode(mnemonicData)
      ) as SerializedEncryptedPayload;

      this.decryptedMnemonic = decrypt(deserializePayload(mnemonicPayload), password);

      // Load account metadata
      await this.loadAccountMeta();

      // Load active account
      const activeData = await this.storage.getWalletData(STORAGE_KEYS.ACTIVE_ACCOUNT);
      if (activeData) {
        this.activeAccountAddress = new TextDecoder().decode(activeData);
      } else if (this.accounts.length > 0) {
        this.activeAccountAddress = this.accounts[0].address;
      }

      // Initialize provider
      this.initProvider();

      // Start auto-lock timer
      this.resetAutoLockTimer();

      return true;
    } catch (error) {
      // Clear any partial state on failure
      this.decryptedMnemonic = null;
      return false;
    }
  }

  // === Wallet Generation/Import ===

  async generateWallet(
    password: string,
    wordCount: 12 | 24 = 12
  ): Promise<{ mnemonic: string; account: Account }> {
    if (await this.isInitialized()) {
      throw new Error('Wallet already initialized. Clear storage first.');
    }

    const mnemonic = generateMnemonic(wordCount);
    const account = await this.initializeWallet(mnemonic, password);

    return { mnemonic, account };
  }

  async importFromMnemonic(mnemonic: string, password: string): Promise<Account> {
    const normalized = normalizeMnemonic(mnemonic);

    if (!validateMnemonic(normalized)) {
      throw new Error('Invalid mnemonic phrase');
    }

    if (await this.isInitialized()) {
      throw new Error('Wallet already initialized. Clear storage first.');
    }

    return this.initializeWallet(normalized, password);
  }

  private async initializeWallet(mnemonic: string, password: string): Promise<Account> {
    // Encrypt and store mnemonic
    const mnemonicPayload = encrypt(mnemonic, password);
    await this.storage.setWalletData(
      STORAGE_KEYS.MNEMONIC,
      new TextEncoder().encode(JSON.stringify(serializePayload(mnemonicPayload)))
    );

    // Store password verification token
    const verifyPayload = encrypt(PASSWORD_VERIFY_MAGIC, password);
    await this.storage.setWalletData(
      STORAGE_KEYS.PASSWORD_VERIFY,
      new TextEncoder().encode(JSON.stringify(serializePayload(verifyPayload)))
    );

    // Store wallet settings
    const settings: WalletSettings = {
      defaultChainId: this.currentChainId,
      autoLockTimeoutMs: this.autoLockTimeoutMs,
      createdAt: Date.now(),
    };
    await this.storage.setWalletData(
      STORAGE_KEYS.SETTINGS,
      new TextEncoder().encode(JSON.stringify(settings))
    );

    // Derive first account
    const derived = deriveAccount(mnemonic, 0);
    const account: StoredAccountMeta = {
      address: derived.address,
      name: 'Account 1',
      derivationPath: derived.path!,
      index: 0,
      createdAt: Date.now(),
    };

    // Store account metadata
    await this.storage.setWalletData(
      STORAGE_KEYS.ACCOUNTS,
      new TextEncoder().encode(JSON.stringify([account]))
    );

    // Set active account
    await this.storage.setWalletData(
      STORAGE_KEYS.ACTIVE_ACCOUNT,
      new TextEncoder().encode(account.address)
    );

    // Set in-memory state
    this.decryptedMnemonic = mnemonic;
    this.accounts = [account];
    this.activeAccountAddress = account.address;
    this.initProvider();
    this.resetAutoLockTimer();

    return {
      address: account.address,
      name: account.name,
      derivationPath: account.derivationPath,
      index: account.index,
    };
  }

  // === Account Management ===

  async getAccounts(): Promise<Account[]> {
    if (!this.accounts.length) {
      await this.loadAccountMeta();
    }
    return this.accounts.map((a) => ({
      address: a.address,
      name: a.name,
      derivationPath: a.derivationPath,
      index: a.index,
    }));
  }

  async getActiveAccount(): Promise<Account | null> {
    if (!this.activeAccountAddress) return null;
    const accounts = await this.getAccounts();
    return accounts.find((a) => a.address === this.activeAccountAddress) ?? null;
  }

  async setActiveAccount(address: string): Promise<void> {
    const accounts = await this.getAccounts();
    const account = accounts.find((a) => a.address.toLowerCase() === address.toLowerCase());
    if (!account) {
      throw new Error('Account not found');
    }

    this.activeAccountAddress = account.address;
    await this.storage.setWalletData(
      STORAGE_KEYS.ACTIVE_ACCOUNT,
      new TextEncoder().encode(account.address)
    );

    this.resetAutoLockTimer();
  }

  async createAccount(name?: string): Promise<Account> {
    this.requireUnlocked();

    const nextIndex = Math.max(...this.accounts.map((a) => a.index), -1) + 1;
    const derived = deriveAccount(this.decryptedMnemonic!, nextIndex);

    const account: StoredAccountMeta = {
      address: derived.address,
      name: name ?? `Account ${nextIndex + 1}`,
      derivationPath: derived.path!,
      index: nextIndex,
      createdAt: Date.now(),
    };

    this.accounts.push(account);
    await this.saveAccountMeta();

    this.resetAutoLockTimer();

    return {
      address: account.address,
      name: account.name,
      derivationPath: account.derivationPath,
      index: account.index,
    };
  }

  // === Signing ===

  async signTransaction(tx: TransactionRequest): Promise<string> {
    this.requireUnlocked();

    const activeAccount = await this.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account');
    }

    const signer = this.getSigner(activeAccount.index);
    const signedTx = await signer.signTransaction(tx);

    this.resetAutoLockTimer();
    return signedTx;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    this.requireUnlocked();

    const activeAccount = await this.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account');
    }

    const signer = this.getSigner(activeAccount.index);
    const signature = await signer.signMessage(message);

    this.resetAutoLockTimer();
    return signature;
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: TypedDataTypes,
    value: Record<string, unknown>
  ): Promise<string> {
    this.requireUnlocked();

    const activeAccount = await this.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account');
    }

    const signer = this.getSigner(activeAccount.index);
    const signature = await signer.signTypedData(domain, types, value);

    this.resetAutoLockTimer();
    return signature;
  }

  // === Chain Operations ===

  getChainId(): number {
    return this.currentChainId;
  }

  async switchChain(chainId: number): Promise<void> {
    const chain = getChain(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    this.currentChainId = chainId;
    this.initProvider();

    this.resetAutoLockTimer();
  }

  async getBalance(address: string, chainId?: number): Promise<bigint> {
    const targetChainId = chainId ?? this.currentChainId;
    const rpcUrl = getRpcUrl(targetChainId);
    if (!rpcUrl) {
      throw new Error(`No RPC URL for chain ID: ${targetChainId}`);
    }

    const provider =
      targetChainId === this.currentChainId
        ? this.provider ?? new JsonRpcProvider(rpcUrl)
        : new JsonRpcProvider(rpcUrl);

    const balance = await provider.getBalance(address);

    this.resetAutoLockTimer();
    return balance;
  }

  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    this.requireUnlocked();

    const activeAccount = await this.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account');
    }

    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const signer = this.getSigner(activeAccount.index).connect(this.provider);
    const response = await signer.sendTransaction(tx);

    this.resetAutoLockTimer();
    return response;
  }

  // === Export ===

  async exportMnemonic(password: string): Promise<string> {
    // Verify password first
    const unlocked = await this.unlock(password);
    if (!unlocked) {
      throw new Error('Invalid password');
    }

    if (!this.decryptedMnemonic) {
      throw new Error('Mnemonic not available');
    }

    this.resetAutoLockTimer();
    return this.decryptedMnemonic;
  }

  // === Private Helpers ===

  private requireUnlocked(): void {
    if (this.isLocked()) {
      throw new Error('Wallet is locked');
    }
  }

  private getSigner(accountIndex: number): Wallet {
    if (!this.decryptedMnemonic) {
      throw new Error('Wallet is locked');
    }
    const derived = deriveAccount(this.decryptedMnemonic, accountIndex);
    return new Wallet(derived.privateKey);
  }

  private initProvider(): void {
    const rpcUrl = getRpcUrl(this.currentChainId);
    if (rpcUrl) {
      this.provider = new JsonRpcProvider(rpcUrl);
    }
  }

  private async loadAccountMeta(): Promise<void> {
    const data = await this.storage.getWalletData(STORAGE_KEYS.ACCOUNTS);
    if (data) {
      this.accounts = JSON.parse(new TextDecoder().decode(data)) as StoredAccountMeta[];
    } else {
      this.accounts = [];
    }
  }

  private async saveAccountMeta(): Promise<void> {
    await this.storage.setWalletData(
      STORAGE_KEYS.ACCOUNTS,
      new TextEncoder().encode(JSON.stringify(this.accounts))
    );
  }

  private resetAutoLockTimer(): void {
    this.clearAutoLockTimer();

    if (this.autoLockTimeoutMs > 0) {
      this.autoLockTimer = setTimeout(() => {
        void this.lock();
      }, this.autoLockTimeoutMs);
    }
  }

  private clearAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  // === Static Factory ===

  /**
   * Create a LocalWallet with the given storage adapter
   */
  static create(storage: StorageAdapter, options?: Omit<LocalWalletConfig, 'storage'>): LocalWallet {
    return new LocalWallet({ storage, ...options });
  }
}
