# Panoplia Wallet SDK - Development Guide

## Project Overview

Panoplia is a modular, secure wallet SDK for web and desktop applications. It provides encrypted local wallet storage, HD wallet derivation (BIP-39/44), multi-chain support, and React integration.

## Architecture

```
packages/
├── core/           # Shared types, encryption, HD wallet, chain configs
├── local-wallet/   # LocalWallet implementation with IndexedDB storage
├── react/          # React hooks and context provider
├── cloud-wallet/   # (TODO) Cloud wallet client
└── connectors/     # (TODO) WalletConnect, injected providers

services/
└── cloud-wallets/  # (TODO) Rust REST API

apps/
└── demo-web/       # (TODO) Demo React application
```

## Current Implementation Status

### Completed (Phase 1-3)
- [x] Monorepo setup (pnpm + turborepo)
- [x] `@panoplia/core` - Types, encryption (NaCl + scrypt), HD wallet, 12 EVM chains
- [x] `@panoplia/local-wallet` - LocalWallet with IndexedDB storage
- [x] `@panoplia/react` - WalletProvider, hooks (useWallet, useAccounts, useBalance, useChain, useTransaction, useSignMessage)
- [x] Unit tests for all crypto operations (105 tests passing)

### TODO (Phase 4-7)
- [ ] SQLite storage adapter for Electron desktop apps
- [ ] Rust cloud-wallets REST API
- [ ] `@panoplia/cloud-wallet` TypeScript client
- [ ] Social recovery with Shamir's Secret Sharing
- [ ] WalletConnect v2 integration
- [ ] EIP-6963 injected provider detection

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Development mode (watch)
pnpm dev

# Clean build artifacts
pnpm clean
```

## Key Technical Decisions

### Encryption
- **Algorithm**: NaCl secretbox (XSalsa20-Poly1305)
- **KDF**: scrypt with N=2^18, r=8, p=1 (~1 second derivation)
- **Libraries**: `tweetnacl` + `@noble/hashes` (audited, no native deps)

### HD Wallet
- **Standard**: BIP-39 (mnemonic) + BIP-44 (derivation paths)
- **Default Path**: `m/44'/60'/0'/0/{index}` (Ethereum)
- **Library**: `ethers.js` v6

### Storage
- **Web**: IndexedDB via `idb` library
- **Desktop (TODO)**: SQLite via `better-sqlite3`
- **Data**: All sensitive data encrypted before storage

### React Integration
- Context-based state management
- Hooks for common operations
- Auto-lock timer support

## File Structure Conventions

```
packages/{name}/
├── src/
│   ├── index.ts          # Public exports
│   ├── {feature}.ts      # Feature implementation
│   └── {feature}.test.ts # Tests alongside source
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Testing

- **Framework**: Vitest
- **Coverage**: Encryption round-trips, HD derivation vectors, wallet lifecycle
- **Mocking**: `fake-indexeddb` for IndexedDB in Node.js

```bash
# Run specific package tests
cd packages/core && pnpm test

# Run with watch mode
pnpm test:watch
```

## Adding New Features

### Adding a New Chain

Edit `packages/core/src/chains.ts`:

```typescript
export const newChain: Chain = {
  chainId: 12345,
  name: 'New Chain',
  nativeCurrency: { name: 'Token', symbol: 'TKN', decimals: 18 },
  rpcUrls: ['https://rpc.newchain.com'],
  blockExplorers: [{ name: 'Explorer', url: 'https://explorer.newchain.com' }],
};

// Add to chains map
chains[newChain.chainId] = newChain;
```

### Adding a New React Hook

1. Create `packages/react/src/hooks/useNewHook.ts`
2. Export from `packages/react/src/hooks/index.ts`
3. Re-export from `packages/react/src/index.ts`

### Adding a Storage Adapter

Implement the `StorageAdapter` interface from `@panoplia/core`:

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

## Security Considerations

1. **Never log mnemonics or private keys**
2. **Clear sensitive data from memory** after use (best-effort in JS)
3. **Use constant-time comparison** for password verification
4. **Validate all user inputs** (addresses, amounts, chain IDs)
5. **Rate limit** unlock attempts in production

## Next Implementation Steps

### Phase 4: Desktop Support
1. Create `packages/local-wallet/src/storage/sqlite.ts`
2. Add `better-sqlite3` dependency
3. Implement `StorageAdapter` interface
4. Add Keytar integration for system keychain

### Phase 5: Cloud Backend
1. Create `services/cloud-wallets/` Rust project
2. Set up Actix-web with PostgreSQL (sqlx)
3. Implement JWT authentication
4. Create encrypted wallet CRUD endpoints
5. Add guardian management for social recovery

### Phase 6: Cloud Wallet Client
1. Create `packages/cloud-wallet/`
2. Implement REST client with fetch
3. Add local cache with IndexedDB
4. Implement sync logic

### Phase 7: Social Recovery
1. Add `shamir-secret-sharing` to cloud-wallet
2. Implement guardian invite flow
3. Add recovery initiation with timelock
4. Create recovery approval workflow

## Debugging Tips

- **Encryption failures**: Check password encoding (UTF-8)
- **Derivation issues**: Verify mnemonic normalization (lowercase, single spaces)
- **IndexedDB errors**: Check browser dev tools → Application → IndexedDB
- **Type errors**: Run `pnpm build` to regenerate `.d.ts` files

## Contributing

1. Create feature branch from `main`
2. Write tests for new functionality
3. Ensure `pnpm test` passes
4. Update documentation as needed
5. Submit PR with clear description
