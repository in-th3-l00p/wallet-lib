# Panoplia Wallet SDK Examples

This directory contains example applications demonstrating how to use the Panoplia Wallet SDK.

## Examples

### 1. React Basic (`react-basic/`)

A complete React application showcasing all wallet features:

- Wallet creation and import
- Password-based encryption
- Account management
- Balance display
- Transaction sending
- Message signing
- Network switching

**Run it:**

```bash
cd examples/react-basic
pnpm install
pnpm dev
```

Open http://localhost:5173 in your browser.

**Key files:**
- `src/App.tsx` - Main application routing based on wallet state
- `src/components/CreateWallet.tsx` - Wallet creation/import flow
- `src/components/Dashboard.tsx` - Main wallet interface
- `src/components/SendTransaction.tsx` - Transaction form
- `src/components/SignMessage.tsx` - Message signing

### 2. Vanilla JavaScript (`vanilla-js/`)

A framework-free implementation using just HTML and JavaScript:

- Direct usage of `@panoplia/local-wallet`
- No React or other framework required
- Console logging for debugging
- Simple UI with all core features

**Run it:**

```bash
cd examples/vanilla-js
pnpm install
pnpm dev
```

Open http://localhost:5173 in your browser.

**Key files:**
- `index.html` - UI structure and styling
- `main.js` - All wallet logic

## Running from the Monorepo Root

You can also run examples from the monorepo root:

```bash
# From /wallet-lib
cd examples/react-basic && pnpm install && pnpm dev

# Or
cd examples/vanilla-js && pnpm install && pnpm dev
```

## Features Demonstrated

| Feature | React Basic | Vanilla JS |
|---------|-------------|------------|
| Create wallet | ✅ | ✅ |
| Import from mnemonic | ✅ | ✅ |
| Lock/Unlock | ✅ | ✅ |
| Multiple accounts | ✅ | ✅ |
| View balance | ✅ | ✅ |
| Send transaction | ✅ | ❌ |
| Sign message | ✅ | ✅ |
| Switch networks | ✅ | ✅ |
| Auto-lock | ✅ | ✅ |

## Testing on Testnet

Both examples default to **Sepolia testnet** so you can test without real funds.

1. Create or import a wallet
2. Copy your address
3. Get testnet ETH from a faucet:
   - [Sepolia Faucet](https://sepoliafaucet.com/)
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
4. Wait for the transaction to confirm
5. Refresh your balance in the app

## Code Snippets

### Basic Wallet Usage (from Vanilla JS example)

```javascript
import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';

// Initialize
const storage = createIndexedDBStorage();
const wallet = LocalWallet.create(storage);

// Create new wallet
const { mnemonic, account } = await wallet.generateWallet('password123');
console.log('Backup this:', mnemonic);
console.log('Your address:', account.address);

// Lock and unlock
await wallet.lock();
await wallet.unlock('password123');

// Get balance
const balance = await wallet.getBalance(account.address);

// Sign message
const signature = await wallet.signMessage('Hello!');
```

### React Hook Usage

```jsx
import { useWallet, useBalance, useChain } from '@panoplia/react';

function MyWallet() {
  const { isLocked, unlock, createWallet } = useWallet();
  const { formatted, symbol } = useBalance();
  const { chain, switchChain } = useChain();

  if (isLocked) {
    return <button onClick={() => unlock('password')}>Unlock</button>;
  }

  return (
    <div>
      <p>Balance: {formatted} {symbol}</p>
      <p>Network: {chain?.name}</p>
    </div>
  );
}
```

## Troubleshooting

### "Cannot find module '@panoplia/...'"

Make sure to install dependencies:

```bash
pnpm install
```

### IndexedDB Errors

Try clearing your browser's IndexedDB:
1. Open DevTools (F12)
2. Go to Application → Storage → IndexedDB
3. Delete "panoplia-wallet" database
4. Refresh the page

### Balance Shows "Error"

- Check your internet connection
- The RPC endpoint might be rate-limited; try refreshing later
- Switch to a different network and back

## Building for Production

```bash
cd examples/react-basic
pnpm build
# Output in dist/

cd examples/vanilla-js
pnpm build
# Output in dist/
```

The built files are static and can be served from any web server.
