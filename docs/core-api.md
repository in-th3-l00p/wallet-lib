# Core API Reference

## @panoplia/core

The core package provides encryption, HD wallet functionality, and chain configurations.

### Encryption

#### encrypt(plaintext, password)

Encrypt a string using NaCl secretbox with scrypt key derivation.

```typescript
import { encrypt, decrypt } from '@panoplia/core';

const encrypted = encrypt('my secret mnemonic', 'user-password');
// Returns: EncryptedPayload { ciphertext, nonce, salt, version }
```

#### decrypt(payload, password)

Decrypt an encrypted payload.

```typescript
const plaintext = decrypt(encrypted, 'user-password');
// Returns: 'my secret mnemonic'

// Throws if password is wrong
try {
  decrypt(encrypted, 'wrong-password');
} catch (e) {
  console.log(e.message); // 'Decryption failed: invalid password or corrupted data'
}
```

#### deriveKey(password, salt)

Derive a 256-bit encryption key from a password using scrypt.

```typescript
import { deriveKey, generateSalt } from '@panoplia/core';

const salt = generateSalt(); // 32 random bytes
const key = deriveKey('password', salt);
// Returns: Uint8Array (32 bytes)
```

#### serializePayload / deserializePayload

Convert encrypted payloads to/from JSON-safe format.

```typescript
import { serializePayload, deserializePayload } from '@panoplia/core';

// Serialize for storage
const serialized = serializePayload(encrypted);
const json = JSON.stringify(serialized);

// Deserialize after retrieval
const parsed = JSON.parse(json);
const payload = deserializePayload(parsed);
```

---

### HD Wallet

#### generateMnemonic(wordCount?)

Generate a new BIP-39 mnemonic phrase.

```typescript
import { generateMnemonic } from '@panoplia/core';

const mnemonic12 = generateMnemonic();     // 12 words (default)
const mnemonic24 = generateMnemonic(24);   // 24 words
```

#### validateMnemonic(phrase)

Check if a mnemonic phrase is valid.

```typescript
import { validateMnemonic } from '@panoplia/core';

validateMnemonic('abandon abandon abandon...');  // true
validateMnemonic('invalid words here');           // false
```

#### deriveAccount(mnemonic, accountIndex, coinType?)

Derive an HD wallet account at a specific index.

```typescript
import { deriveAccount, COIN_TYPES } from '@panoplia/core';

const wallet = deriveAccount(mnemonic, 0);
// Returns HDNodeWallet at m/44'/60'/0'/0/0

console.log(wallet.address);     // '0x...'
console.log(wallet.privateKey);  // '0x...'
console.log(wallet.path);        // "m/44'/60'/0'/0/0"

// Custom coin type
const ethClassic = deriveAccount(mnemonic, 0, COIN_TYPES.ETHEREUM_CLASSIC);
```

#### deriveAccounts(mnemonic, count, startIndex?)

Derive multiple accounts at once.

```typescript
import { deriveAccounts } from '@panoplia/core';

const accounts = deriveAccounts(mnemonic, 5);
// Returns Account[] with indices 0-4

const moreAccounts = deriveAccounts(mnemonic, 3, 10);
// Returns Account[] with indices 10-12
```

#### normalizeMnemonic(phrase)

Normalize a mnemonic (lowercase, trim, collapse whitespace).

```typescript
import { normalizeMnemonic } from '@panoplia/core';

const normalized = normalizeMnemonic('  ABANDON  Abandon  ABOUT  ');
// Returns: 'abandon abandon about'
```

---

### Chains

#### Pre-configured Chains

```typescript
import {
  ethereum,
  sepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  base,
  baseSepolia,
  avalanche,
  bsc,
} from '@panoplia/core';

console.log(ethereum.chainId);  // 1
console.log(polygon.name);      // 'Polygon'
```

#### getChain(chainId)

Get chain configuration by ID.

```typescript
import { getChain } from '@panoplia/core';

const chain = getChain(137);
console.log(chain?.name);  // 'Polygon'

const unknown = getChain(999999);
console.log(unknown);  // undefined
```

#### getMainnetChains() / getTestnetChains()

Get lists of mainnet or testnet chains.

```typescript
import { getMainnetChains, getTestnetChains } from '@panoplia/core';

const mainnets = getMainnetChains();  // [ethereum, polygon, arbitrum, ...]
const testnets = getTestnetChains();  // [sepolia, polygonAmoy, ...]
```

#### addChain(chain)

Add a custom chain configuration.

```typescript
import { addChain, getChain } from '@panoplia/core';

addChain({
  chainId: 12345,
  name: 'My Custom Chain',
  nativeCurrency: { name: 'Token', symbol: 'TKN', decimals: 18 },
  rpcUrls: ['https://rpc.mychain.com'],
  blockExplorers: [{ name: 'Explorer', url: 'https://explorer.mychain.com' }],
});

const myChain = getChain(12345);
```

#### Helper Functions

```typescript
import {
  getRpcUrl,
  getExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
} from '@panoplia/core';

getRpcUrl(1);                           // 'https://eth.llamarpc.com'
getExplorerUrl(1);                      // 'https://etherscan.io'
getTransactionUrl(1, '0x...');          // 'https://etherscan.io/tx/0x...'
getAddressUrl(137, '0x...');            // 'https://polygonscan.com/address/0x...'
```

---

### Types

```typescript
import type {
  Account,
  Chain,
  WalletProvider,
  WalletState,
  StorageAdapter,
  EncryptedPayload,
  SerializedEncryptedPayload,
  TypedDataTypes,
} from '@panoplia/core';
```

#### Account

```typescript
interface Account {
  address: string;        // Checksummed address
  name?: string;          // User-defined name
  derivationPath: string; // BIP-44 path
  index: number;          // Account index
}
```

#### Chain

```typescript
interface Chain {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorers?: { name: string; url: string }[];
  testnet?: boolean;
}
```

#### WalletProvider

The interface that wallet implementations must satisfy.

```typescript
interface WalletProvider {
  // Account management
  getAccounts(): Promise<Account[]>;
  getActiveAccount(): Promise<Account | null>;
  setActiveAccount(address: string): Promise<void>;
  createAccount(name?: string): Promise<Account>;
  importFromMnemonic(mnemonic: string, password: string): Promise<Account>;
  generateWallet(password: string, wordCount?: 12 | 24): Promise<{ mnemonic: string; account: Account }>;

  // Signing
  signTransaction(tx: TransactionRequest): Promise<string>;
  signMessage(message: string | Uint8Array): Promise<string>;
  signTypedData(domain: TypedDataDomain, types: TypedDataTypes, value: Record<string, unknown>): Promise<string>;

  // Chain operations
  getChainId(): number;
  switchChain(chainId: number): Promise<void>;
  getBalance(address: string, chainId?: number): Promise<bigint>;
  sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>;

  // Lifecycle
  lock(): Promise<void>;
  unlock(password: string): Promise<boolean>;
  isLocked(): boolean;
  getState(): WalletState;
  isInitialized(): Promise<boolean>;

  // Export
  exportMnemonic(password: string): Promise<string>;
}
```

#### StorageAdapter

Interface for custom storage backends.

```typescript
interface StorageAdapter {
  setWalletData(key: string, data: Uint8Array): Promise<void>;
  getWalletData(key: string): Promise<Uint8Array | null>;
  deleteWalletData(key: string): Promise<void>;
  hasWalletData(key: string): Promise<boolean>;
  listKeys(): Promise<string[]>;
  clear(): Promise<void>;
}
```

---

## @panoplia/local-wallet

### LocalWallet

The main wallet class for local (browser/desktop) storage.

#### Creating a Wallet Instance

```typescript
import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';

const storage = createIndexedDBStorage();
const wallet = LocalWallet.create(storage, {
  defaultChainId: 1,           // Optional
  autoLockTimeoutMs: 900000,   // Optional (15 min default)
});
```

#### Wallet Lifecycle

```typescript
// Check if wallet exists
const exists = await wallet.isInitialized();

// Create new wallet
const { mnemonic, account } = await wallet.generateWallet('password');

// Or import existing wallet
const account = await wallet.importFromMnemonic('abandon abandon...', 'password');

// Lock wallet (clears keys from memory)
await wallet.lock();

// Unlock wallet
const success = await wallet.unlock('password');

// Check lock state
wallet.isLocked();  // true or false
wallet.getState();  // 'uninitialized' | 'locked' | 'unlocked'
```

#### Account Management

```typescript
// Get all accounts
const accounts = await wallet.getAccounts();

// Get active account
const active = await wallet.getActiveAccount();

// Set active account
await wallet.setActiveAccount('0x...');

// Create new account
const newAccount = await wallet.createAccount('Savings');
```

#### Signing

```typescript
// Sign a message (EIP-191)
const sig = await wallet.signMessage('Hello, Ethereum!');

// Sign typed data (EIP-712)
const typedSig = await wallet.signTypedData(domain, types, value);

// Sign a transaction
const signedTx = await wallet.signTransaction({
  to: '0x...',
  value: parseEther('0.1'),
});
```

#### Transactions

```typescript
import { parseEther } from 'ethers';

// Send a transaction
const response = await wallet.sendTransaction({
  to: '0x...',
  value: parseEther('0.1'),
});

// Wait for confirmation
const receipt = await response.wait();
console.log('Confirmed in block:', receipt.blockNumber);
```

#### Chain Operations

```typescript
// Get current chain
const chainId = wallet.getChainId();

// Switch chain
await wallet.switchChain(137);  // Polygon

// Get balance
const balance = await wallet.getBalance('0x...');
const polygonBalance = await wallet.getBalance('0x...', 137);
```

#### Export Mnemonic

```typescript
// Requires password verification
const mnemonic = await wallet.exportMnemonic('password');
// WARNING: Handle this securely!
```

---

### IndexedDBStorage

Pre-built storage adapter for web browsers.

```typescript
import { createIndexedDBStorage, IndexedDBStorage } from '@panoplia/local-wallet';

// Create instance
const storage = createIndexedDBStorage();

// Or instantiate directly
const storage = new IndexedDBStorage();

// Storage operations (usually not called directly)
await storage.setWalletData('key', new Uint8Array([1, 2, 3]));
const data = await storage.getWalletData('key');
await storage.deleteWalletData('key');
await storage.clear();

// Close connection when done
storage.close();
```

### Custom Storage Adapters

Implement the `StorageAdapter` interface for custom storage:

```typescript
import type { StorageAdapter } from '@panoplia/local-wallet';

class MyCustomStorage implements StorageAdapter {
  async setWalletData(key: string, data: Uint8Array): Promise<void> {
    // Store data
  }

  async getWalletData(key: string): Promise<Uint8Array | null> {
    // Retrieve data
  }

  async deleteWalletData(key: string): Promise<void> {
    // Delete data
  }

  async hasWalletData(key: string): Promise<boolean> {
    // Check existence
  }

  async listKeys(): Promise<string[]> {
    // List all keys
  }

  async clear(): Promise<void> {
    // Clear all data
  }
}

// Use with LocalWallet
const wallet = LocalWallet.create(new MyCustomStorage());
```
