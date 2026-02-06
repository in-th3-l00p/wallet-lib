# Panoplia Wallet SDK Documentation

Welcome to the Panoplia Wallet SDK documentation. This SDK enables you to build secure, non-custodial cryptocurrency wallets for web and desktop applications.

## Documentation Index

### Getting Started

- **[Getting Started](./getting-started.md)** - Installation, quick start guides for React and vanilla JavaScript

### API Reference

- **[React Hooks Reference](./react-hooks.md)** - Complete reference for all React hooks (`useWallet`, `useAccounts`, `useBalance`, `useChain`, `useTransaction`, `useSignMessage`)
- **[Core API Reference](./core-api.md)** - Reference for `@panoplia/core` and `@panoplia/local-wallet` packages

### Security

- **[Security Best Practices](./security.md)** - Encryption model, security recommendations, and checklist

### Examples

- **[Examples](../examples/README.md)** - Working example applications

## Quick Links

### Installation

```bash
npm install @panoplia/core @panoplia/local-wallet @panoplia/react
```

### Basic React Setup

```tsx
import { WalletProvider, useWallet, useBalance } from '@panoplia/react';

function App() {
  return (
    <WalletProvider>
      <MyWallet />
    </WalletProvider>
  );
}

function MyWallet() {
  const { isLocked, unlock, createWallet } = useWallet();
  const { formatted, symbol } = useBalance();

  // Your wallet UI...
}
```

### Basic JavaScript Setup

```javascript
import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';

const wallet = LocalWallet.create(createIndexedDBStorage());
const { mnemonic } = await wallet.generateWallet('password');
```

## Package Overview

| Package | Description |
|---------|-------------|
| `@panoplia/core` | Types, encryption, HD wallet, chain configs |
| `@panoplia/local-wallet` | LocalWallet with IndexedDB storage |
| `@panoplia/react` | React hooks and WalletProvider |

## Features

- **Non-custodial** - Users control their own keys
- **Encrypted storage** - NaCl + scrypt encryption
- **HD wallet** - BIP-39/44 compliant
- **Multi-chain** - 12+ EVM chains pre-configured
- **React hooks** - Easy integration with React apps
- **TypeScript** - Full type definitions

## Support

- GitHub Issues: Report bugs and request features
- Documentation: This site
- Examples: See `/examples` directory

## License

MIT License
