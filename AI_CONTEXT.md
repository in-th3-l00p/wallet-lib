# Panoplia Wallet SDK - AI Context

> Last updated: 2026-02-06

This file contains context for continuing development with AI assistance.

---

## Project Overview

**Panoplia Wallet SDK** is a comprehensive cryptocurrency wallet SDK supporting:
- Self-custodial wallets with BIP-39/44 HD derivation
- MPC (Multi-Party Computation) with threshold signatures
- Social recovery with guardian management
- Multi-platform support (Web, Electron, React Native, Browser Extension)

---

## Repository Structure

```
wallet-lib/
├── packages/
│   ├── core/                    # Cryptographic primitives, types, HD wallet
│   │   ├── src/
│   │   │   ├── types.ts         # WalletProvider interface, Account, Chain
│   │   │   ├── encryption.ts    # NaCl secretbox + scrypt KDF
│   │   │   ├── hd-wallet.ts     # BIP-39 mnemonic + BIP-44 derivation
│   │   │   └── chains.ts        # EVM chain configs
│   │   └── 76 tests
│   │
│   ├── local-wallet/            # Self-custodial wallet implementation
│   │   ├── src/
│   │   │   ├── storage/         # Platform adapters (IndexedDB, SQLite, etc.)
│   │   │   └── wallet.ts        # LocalWallet class
│   │   └── 28 tests
│   │
│   ├── mpc/                     # Multi-Party Computation
│   │   ├── src/
│   │   │   ├── threshold-signature.ts  # Shamir's Secret Sharing
│   │   │   └── mpc-wallet.ts    # MPCWallet class
│   │   └── 18 tests
│   │
│   ├── social-recovery/         # Guardian-based recovery
│   │   ├── src/
│   │   │   ├── guardian.ts      # GuardianManager class
│   │   │   ├── recovery.ts      # RecoveryManager class
│   │   │   └── social-recovery-wallet.ts
│   │   └── 32 tests
│   │
│   ├── react/                   # React hooks and context
│   │   ├── src/
│   │   │   ├── provider.tsx     # WalletProvider context
│   │   │   └── hooks/           # useWallet, useAccounts, useBalance, etc.
│   │   └── 1 test
│   │
│   ├── cloud-wallet/            # Cloud backup client (planned)
│   └── connectors/              # External wallet connections (planned)
│
├── examples/
│   └── mpc-social-recovery/     # Demo app for MPC + Social Recovery
│       ├── src/
│       │   ├── App.tsx          # Main app with 3 tabs
│       │   └── components/
│       │       ├── MPCWalletDemo.tsx
│       │       ├── SocialRecoveryDemo.tsx
│       │       └── RecoveryFlowDemo.tsx
│       └── package.json
│
├── services/
│   └── cloud-wallets/           # Rust REST API (planned)
│
├── WALLET_SECURITY_GUIDE.md     # Comprehensive security documentation
├── turbo.json                   # Turborepo config
├── pnpm-workspace.yaml          # pnpm workspace config
└── package.json
```

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Monorepo | pnpm workspaces + turborepo |
| Language | TypeScript 5.x |
| Ethereum | ethers.js v6 |
| Encryption | tweetnacl (NaCl secretbox - XSalsa20-Poly1305) |
| Key Derivation | @noble/hashes (scrypt N=2^18) |
| Elliptic Curves | @noble/secp256k1 |
| Testing | vitest |
| React State | Context API + hooks |

---

## Security Model

### Encryption Pipeline
```
User Password → scrypt (N=2^18, r=8, p=1) → 256-bit Key → NaCl secretbox
```

### Key Storage
- **Web/Extension**: IndexedDB with encrypted blobs
- **Electron**: SQLite + system Keychain for master password
- **React Native**: AsyncStorage + Keychain/Keystore

### MPC (Threshold Signatures)
- Shamir's Secret Sharing for key splitting
- k-of-n threshold configuration (e.g., 2-of-3)
- Shares distributed across devices/guardians

### Social Recovery
- Guardian invites with verification codes
- Timelock protection (48-72 hours default)
- Threshold approval (e.g., 3-of-5 guardians)

---

## Completed Work

### Phase 1-4: Core SDK ✅
- [x] Monorepo setup with pnpm + turborepo
- [x] @panoplia/core - encryption, HD wallet, chain configs
- [x] @panoplia/local-wallet - IndexedDB, SQLite, React Native storage
- [x] @panoplia/react - WalletProvider, hooks

### Phase 5-6: MPC ✅
- [x] @panoplia/mpc - threshold signatures, key splitting
- [x] Shamir's Secret Sharing implementation
- [x] MPCWallet class with sign/verify

### Phase 7: Social Recovery ✅
- [x] @panoplia/social-recovery - guardian management
- [x] RecoveryManager with timelock
- [x] SocialRecoveryWallet integration

### Documentation ✅
- [x] WALLET_SECURITY_GUIDE.md - comprehensive guide for all platforms

### Example Apps ✅
- [x] examples/mpc-social-recovery - demo React app

---

## Test Status

All 155 tests passing:
- @panoplia/core: 76 tests
- @panoplia/local-wallet: 28 tests
- @panoplia/react: 1 test
- @panoplia/mpc: 18 tests
- @panoplia/social-recovery: 32 tests

---

## Pending/Planned Work

### Cloud Backend (Phase 5 from plan)
- [ ] Rust REST API with Actix-web
- [ ] PostgreSQL schema (users, encrypted_wallets, guardians)
- [ ] JWT authentication
- [ ] Rate limiting

### Cloud Wallet Client (Phase 6)
- [ ] @panoplia/cloud-wallet TypeScript client
- [ ] Sync encrypted wallet to server
- [ ] Local cache for offline access

### Connectors
- [ ] WalletConnect v2 integration
- [ ] MetaMask/EIP-6963 injected provider detection

### Additional Features
- [ ] Hardware wallet support (Ledger/Trezor)
- [ ] Biometric unlock (mobile/desktop)
- [ ] E2E tests with Playwright

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Wallet interface | packages/core/src/types.ts |
| Encryption | packages/core/src/encryption.ts |
| HD derivation | packages/core/src/hd-wallet.ts |
| Local wallet | packages/local-wallet/src/wallet.ts |
| MPC wallet | packages/mpc/src/mpc-wallet.ts |
| Threshold sigs | packages/mpc/src/threshold-signature.ts |
| Guardians | packages/social-recovery/src/guardian.ts |
| Recovery | packages/social-recovery/src/recovery.ts |
| React hooks | packages/react/src/hooks/*.ts |
| Security guide | WALLET_SECURITY_GUIDE.md |

---

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @panoplia/core test
pnpm --filter @panoplia/mpc test

# Run example app
cd examples/mpc-social-recovery && pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## Recent Bug Fixes

1. **Unused imports in MPC package** - Removed unused sha256, DKGResult imports
2. **Unused parameters in social-recovery** - Prefixed with underscore (_reason)
3. **Test assertions** - Fixed guardian status check ('accepted' not 'active')
4. **ESM imports in example** - Changed require() to ES imports
5. **TypeScript step comparison** - Created helper functions for step class logic

---

## Architecture Decisions

1. **NaCl over AES-GCM**: Better security properties, no padding oracle attacks
2. **scrypt over Argon2**: Wider browser support, still memory-hard
3. **ethers.js v6**: Best TypeScript support, maintained actively
4. **Shamir's SSS for MPC**: Simple, proven, no complex MPC protocols needed
5. **Timelock for recovery**: Prevents immediate theft if guardians compromised

---

## Notes for Future Development

- The cloud backend should NEVER see plaintext keys - all encryption client-side
- Guardian shares should be encrypted with guardian's public key before sending
- Consider adding WebAuthn for passwordless authentication
- Mobile apps should use Secure Enclave/Keystore when available
- Extension storage uses chrome.storage.local with encryption layer
