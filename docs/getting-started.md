# Getting Started with Panoplia Wallet SDK

## Installation

```bash
# Using npm
npm install @panoplia/core @panoplia/local-wallet @panoplia/react

# Using pnpm
pnpm add @panoplia/core @panoplia/local-wallet @panoplia/react

# Using yarn
yarn add @panoplia/core @panoplia/local-wallet @panoplia/react
```

## Quick Start (React)

### 1. Wrap Your App with WalletProvider

```tsx
// App.tsx
import { WalletProvider } from '@panoplia/react';

function App() {
  return (
    <WalletProvider>
      <YourApp />
    </WalletProvider>
  );
}
```

### 2. Create or Import a Wallet

```tsx
// CreateWallet.tsx
import { useWallet } from '@panoplia/react';
import { useState } from 'react';

function CreateWallet() {
  const { createWallet, importWallet, isInitialized } = useWallet();
  const [password, setPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');

  const handleCreate = async () => {
    const result = await createWallet(password);
    // IMPORTANT: Show mnemonic to user for backup!
    alert(`Backup your seed phrase:\n\n${result.mnemonic}`);
  };

  const handleImport = async () => {
    await importWallet(mnemonic, password);
  };

  if (isInitialized) {
    return <div>Wallet already exists!</div>;
  }

  return (
    <div>
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleCreate}>Create New Wallet</button>

      <hr />

      <textarea
        placeholder="Enter seed phrase..."
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
      />
      <button onClick={handleImport}>Import Existing Wallet</button>
    </div>
  );
}
```

### 3. Unlock and Use the Wallet

```tsx
// Dashboard.tsx
import { useWallet, useAccounts, useBalance } from '@panoplia/react';
import { useState } from 'react';

function Dashboard() {
  const { isLocked, unlock, lock } = useWallet();
  const { activeAccount, accounts } = useAccounts();
  const { formatted, symbol } = useBalance();
  const [password, setPassword] = useState('');

  if (isLocked) {
    return (
      <div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={() => unlock(password)}>Unlock</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome!</h2>
      <p>Address: {activeAccount?.address}</p>
      <p>Balance: {formatted} {symbol}</p>
      <button onClick={lock}>Lock Wallet</button>
    </div>
  );
}
```

## Quick Start (Vanilla JavaScript)

```typescript
import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';

// Create storage and wallet
const storage = createIndexedDBStorage();
const wallet = LocalWallet.create(storage);

// Create a new wallet
const { mnemonic, account } = await wallet.generateWallet('my-secure-password');
console.log('Backup this mnemonic:', mnemonic);
console.log('Your address:', account.address);

// Lock and unlock
await wallet.lock();
const success = await wallet.unlock('my-secure-password');

// Sign a message
const signature = await wallet.signMessage('Hello, Ethereum!');

// Get balance
const balance = await wallet.getBalance(account.address);
```

## Configuration Options

### WalletProvider Props

```tsx
<WalletProvider
  // Custom storage adapter (defaults to IndexedDB)
  storage={customStorage}

  // Default chain ID (defaults to Ethereum mainnet = 1)
  defaultChainId={137}  // Polygon

  // Auto-lock timeout in ms (defaults to 15 minutes, 0 to disable)
  autoLockTimeoutMs={5 * 60 * 1000}  // 5 minutes
>
  {children}
</WalletProvider>
```

### LocalWallet Options

```typescript
const wallet = LocalWallet.create(storage, {
  defaultChainId: 137,        // Start on Polygon
  autoLockTimeoutMs: 300000,  // 5 minute auto-lock
});
```

## Supported Chains

The SDK comes pre-configured with these chains:

| Chain | ID | Import Name |
|-------|----|----|
| Ethereum | 1 | `ethereum` |
| Sepolia | 11155111 | `sepolia` |
| Polygon | 137 | `polygon` |
| Arbitrum | 42161 | `arbitrum` |
| Optimism | 10 | `optimism` |
| Base | 8453 | `base` |
| Avalanche | 43114 | `avalanche` |
| BNB Chain | 56 | `bsc` |

```typescript
import { ethereum, polygon, getChain } from '@panoplia/core';

console.log(ethereum.chainId);  // 1
console.log(polygon.name);      // "Polygon"

const chain = getChain(42161);  // Get Arbitrum config
```

## Next Steps

- [React Hooks Reference](./react-hooks.md)
- [Core API Reference](./core-api.md)
- [Security Best Practices](./security.md)
- [Examples](../examples/)
