# React Hooks Reference

## Overview

The `@panoplia/react` package provides a set of hooks for integrating wallet functionality into React applications.

## WalletProvider

The context provider that must wrap your application.

```tsx
import { WalletProvider } from '@panoplia/react';

function App() {
  return (
    <WalletProvider
      defaultChainId={1}           // Optional: default chain (Ethereum)
      autoLockTimeoutMs={900000}   // Optional: 15 min auto-lock
      storage={customStorage}      // Optional: custom storage adapter
    >
      <YourApp />
    </WalletProvider>
  );
}
```

---

## useWallet

Core wallet operations: lifecycle, creation, and state.

```tsx
import { useWallet } from '@panoplia/react';

function WalletManager() {
  const {
    // State
    wallet,         // LocalWallet instance
    state,          // 'uninitialized' | 'locked' | 'unlocked'
    isInitialized,  // Has a wallet been created?
    isLocked,       // Is the wallet currently locked?
    isLoading,      // Is an operation in progress?
    error,          // Last error, if any

    // Actions
    unlock,         // (password: string) => Promise<boolean>
    lock,           // () => Promise<void>
    createWallet,   // (password: string, wordCount?: 12 | 24) => Promise<{mnemonic, account}>
    importWallet,   // (mnemonic: string, password: string) => Promise<Account>
  } = useWallet();

  // Example: Create a new wallet
  const handleCreate = async () => {
    try {
      const { mnemonic, account } = await createWallet('secure-password');
      console.log('Backup your mnemonic:', mnemonic);
      console.log('First account:', account.address);
    } catch (err) {
      console.error('Failed to create wallet:', err);
    }
  };

  // Example: Unlock wallet
  const handleUnlock = async (password: string) => {
    const success = await unlock(password);
    if (!success) {
      alert('Wrong password');
    }
  };

  return (
    <div>
      <p>State: {state}</p>
      <p>Locked: {isLocked ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

---

## useAccounts

Account management: list, select, and create accounts.

```tsx
import { useAccounts } from '@panoplia/react';

function AccountSelector() {
  const {
    // State
    accounts,        // Account[] - all accounts
    activeAccount,   // Account | null - currently selected
    address,         // string | null - active account address
    accountCount,    // number
    isLocked,        // boolean
    isLoading,       // boolean

    // Actions
    setActiveAccount, // (address: string) => Promise<void>
    createAccount,    // (name?: string) => Promise<Account>

    // Helpers
    getAccount,       // (address: string) => Account | undefined
    isOwnAddress,     // (address: string) => boolean
  } = useAccounts();

  const handleCreateAccount = async () => {
    const newAccount = await createAccount('Savings');
    console.log('Created:', newAccount.address);
  };

  return (
    <div>
      <h3>Accounts ({accountCount})</h3>
      <ul>
        {accounts.map((account) => (
          <li
            key={account.address}
            onClick={() => setActiveAccount(account.address)}
            style={{
              fontWeight: account.address === address ? 'bold' : 'normal'
            }}
          >
            {account.name || `Account ${account.index + 1}`}
            <br />
            <small>{account.address}</small>
          </li>
        ))}
      </ul>
      <button onClick={handleCreateAccount}>+ Add Account</button>
    </div>
  );
}
```

### Account Type

```typescript
interface Account {
  address: string;        // Checksummed Ethereum address
  name?: string;          // User-defined name
  derivationPath: string; // e.g., "m/44'/60'/0'/0/0"
  index: number;          // Account index (0, 1, 2, ...)
}
```

---

## useBalance

Fetch and track account balances.

```tsx
import { useBalance } from '@panoplia/react';

function BalanceDisplay() {
  const {
    // State
    balance,     // bigint | null - raw balance in wei
    formatted,   // string | null - human-readable (e.g., "1.5")
    symbol,      // string - currency symbol (e.g., "ETH")
    isLoading,   // boolean
    error,       // Error | null

    // Actions
    refetch,     // () => Promise<void>
  } = useBalance();

  return (
    <div>
      {isLoading ? (
        <span>Loading...</span>
      ) : error ? (
        <span>Error: {error.message}</span>
      ) : (
        <span>{formatted} {symbol}</span>
      )}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Options

```tsx
const { balance } = useBalance({
  // Query a specific address (defaults to active account)
  address: '0x...',

  // Query on a specific chain (defaults to current chain)
  chainId: 137,

  // Auto-refresh interval in ms (0 to disable)
  refreshInterval: 10000,  // Every 10 seconds

  // Enable/disable fetching
  enabled: true,
});
```

---

## useChain

Network/chain management.

```tsx
import { useChain } from '@panoplia/react';

function NetworkSelector() {
  const {
    // State
    chainId,          // number - current chain ID
    chain,            // Chain | null - full chain config
    isTestnet,        // boolean
    nativeCurrency,   // { name, symbol, decimals }
    explorerUrl,      // string | undefined

    // Actions
    switchChain,      // (chainId: number) => Promise<void>

    // Chain lists
    mainnetChains,    // Chain[]
    testnetChains,    // Chain[]
    supportedChains,  // Chain[] (all)

    // Helpers
    isChainSupported, // (chainId: number) => boolean
    getChainInfo,     // (chainId: number) => Chain | undefined
  } = useChain();

  return (
    <div>
      <h3>Current Network: {chain?.name}</h3>
      <select
        value={chainId}
        onChange={(e) => switchChain(Number(e.target.value))}
      >
        {supportedChains.map((c) => (
          <option key={c.chainId} value={c.chainId}>
            {c.name} {c.testnet ? '(Testnet)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Chain Type

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

---

## useTransaction

Send transactions with status tracking.

```tsx
import { useTransaction } from '@panoplia/react';
import { parseEther } from 'ethers';

function SendForm() {
  const {
    // Actions
    sendTransaction, // (tx: TransactionRequest) => Promise<TransactionResponse | null>
    reset,           // () => void - reset state for new tx

    // State
    status,          // 'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed'
    txHash,          // string | null
    txResponse,      // TransactionResponse | null
    error,           // Error | null
    isPending,       // boolean
    explorerUrl,     // string | null - link to block explorer
  } = useTransaction();

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = async () => {
    const response = await sendTransaction({
      to,
      value: parseEther(amount),
    });

    if (response) {
      console.log('Transaction sent:', response.hash);
      // Optionally wait for confirmation
      await response.wait();
      console.log('Transaction confirmed!');
    }
  };

  return (
    <div>
      <input
        placeholder="Recipient address"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <input
        placeholder="Amount (ETH)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <button onClick={handleSend} disabled={isPending}>
        {isPending ? 'Sending...' : 'Send'}
      </button>

      {txHash && (
        <p>
          <a href={explorerUrl} target="_blank" rel="noopener">
            View on Explorer
          </a>
        </p>
      )}

      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </div>
  );
}
```

---

## useSignMessage

Sign messages and typed data (EIP-191 and EIP-712).

```tsx
import { useSignMessage } from '@panoplia/react';

function SignMessageForm() {
  const {
    // Actions
    signMessage,    // (message: string | Uint8Array) => Promise<string | null>
    signTypedData,  // (domain, types, value) => Promise<string | null>
    reset,          // () => void

    // State
    status,         // 'idle' | 'signing' | 'signed' | 'failed'
    signature,      // string | null
    error,          // Error | null
    isSigning,      // boolean
  } = useSignMessage();

  const [message, setMessage] = useState('');

  // Sign a simple message (EIP-191)
  const handleSign = async () => {
    const sig = await signMessage(message);
    if (sig) {
      console.log('Signature:', sig);
    }
  };

  // Sign typed data (EIP-712)
  const handleSignTyped = async () => {
    const domain = {
      name: 'My App',
      version: '1',
      chainId: 1,
      verifyingContract: '0x...',
    };

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      owner: '0x...',
      spender: '0x...',
      value: '1000000000000000000',
      nonce: 0,
      deadline: Math.floor(Date.now() / 1000) + 3600,
    };

    const sig = await signTypedData(domain, types, value);
    if (sig) {
      console.log('Typed signature:', sig);
    }
  };

  return (
    <div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message to sign..."
      />

      <button onClick={handleSign} disabled={isSigning}>
        {isSigning ? 'Signing...' : 'Sign Message'}
      </button>

      {signature && (
        <div>
          <h4>Signature:</h4>
          <code style={{ wordBreak: 'break-all' }}>{signature}</code>
        </div>
      )}
    </div>
  );
}
```

---

## useWalletContext

Access the raw wallet context (for advanced use cases).

```tsx
import { useWalletContext } from '@panoplia/react';

function AdvancedComponent() {
  const context = useWalletContext();

  // Access the wallet instance directly
  const wallet = context.wallet;

  // All state and actions are available
  console.log(context.state);
  console.log(context.accounts);
}
```

---

## TypeScript Types

All types are exported from `@panoplia/react`:

```typescript
import type {
  Account,
  Chain,
  WalletProvider,
  WalletState,
  TypedDataTypes,
  WalletContextState,
  WalletProviderProps,
  UseBalanceOptions,
  TransactionStatus,
  SignatureStatus,
} from '@panoplia/react';
```
