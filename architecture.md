# Panoplia Wallet SDK - Architecture

## Overview

Panoplia is a modular wallet SDK designed for building secure, non-custodial cryptocurrency wallets for web and desktop applications. It separates concerns into distinct packages that can be used independently or together.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Application Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Web App       │  │  Electron App   │  │   Browser Extension     │  │
│  │   (React)       │  │  (React)        │  │   (React)               │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
└───────────┼─────────────────────┼───────────────────────┼───────────────┘
            │                     │                       │
┌───────────▼─────────────────────▼───────────────────────▼───────────────┐
│                         @panoplia/react                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │WalletProvider│  │  useWallet   │  │ useAccounts  │  │ useBalance  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                       @panoplia/local-wallet                             │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        LocalWallet                                │   │
│  │  • Account Management    • Transaction Signing                    │   │
│  │  • Chain Switching       • Message Signing (EIP-191, EIP-712)     │   │
│  │  • Lock/Unlock           • Mnemonic Import/Export                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      Storage Adapters                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │  IndexedDB      │  │    SQLite       │  │   Memory        │   │   │
│  │  │  (Web)          │  │  (Electron)     │  │   (Testing)     │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                          @panoplia/core                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Encryption    │  │   HD Wallet     │  │      Chains             │  │
│  │  NaCl+scrypt    │  │  BIP-39/44      │  │  EVM Configurations     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                         Types                                     │   │
│  │  WalletProvider • Account • Chain • StorageAdapter                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

### @panoplia/core

The foundation layer providing:

| Component | Purpose |
|-----------|---------|
| **types.ts** | TypeScript interfaces (`WalletProvider`, `Account`, `Chain`, `StorageAdapter`) |
| **encryption.ts** | NaCl secretbox encryption with scrypt key derivation |
| **hd-wallet.ts** | BIP-39 mnemonic generation, BIP-44 key derivation |
| **chains.ts** | Pre-configured EVM chain definitions (Ethereum, Polygon, Arbitrum, etc.) |

### @panoplia/local-wallet

Self-custodial wallet implementation:

| Component | Purpose |
|-----------|---------|
| **LocalWallet** | Main wallet class implementing `WalletProvider` interface |
| **IndexedDBStorage** | Browser-compatible encrypted storage |
| **StorageAdapter** | Interface for pluggable storage backends |

### @panoplia/react

React integration layer:

| Component | Purpose |
|-----------|---------|
| **WalletProvider** | Context provider managing wallet state |
| **useWallet** | Core wallet operations (lock, unlock, create, import) |
| **useAccounts** | Account management (list, select, create) |
| **useBalance** | Balance fetching with auto-refresh |
| **useChain** | Network switching and chain info |
| **useTransaction** | Transaction sending with status tracking |
| **useSignMessage** | Message and typed data signing |

## Use Cases

### 1. DeFi Web Application

A decentralized exchange or lending protocol that needs embedded wallet functionality.

```
┌─────────────────────────────────────────────┐
│              DeFi Application               │
│  ┌───────────────────────────────────────┐  │
│  │         Trading Interface             │  │
│  │  • Swap tokens                        │  │
│  │  • Provide liquidity                  │  │
│  │  • View portfolio                     │  │
│  └───────────────────────────────────────┘  │
│                     │                       │
│  ┌───────────────────────────────────────┐  │
│  │        Panoplia Wallet SDK            │  │
│  │  • Sign transactions locally          │  │
│  │  • Multi-chain support                │  │
│  │  • No external wallet required        │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Benefits:**
- Seamless UX (no wallet popups)
- Works offline (transactions can be signed without network)
- User owns their keys

### 2. Gaming Platform

A blockchain game that needs to manage in-game assets and currencies.

```
┌─────────────────────────────────────────────┐
│              Gaming Platform                │
│  ┌───────────────────────────────────────┐  │
│  │         Game Interface                │  │
│  │  • Purchase items (NFTs)              │  │
│  │  • Trade with players                 │  │
│  │  • Earn rewards                       │  │
│  └───────────────────────────────────────┘  │
│                     │                       │
│  ┌───────────────────────────────────────┐  │
│  │        Panoplia Wallet SDK            │  │
│  │  • Auto-sign low-value transactions   │  │
│  │  • Session keys for gameplay          │  │
│  │  • Batch transactions                 │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Benefits:**
- Frictionless gaming experience
- Can implement spending limits
- Works across multiple chains

### 3. Desktop Wallet Application

A standalone Electron application for managing crypto assets.

```
┌─────────────────────────────────────────────┐
│           Electron Desktop App              │
│  ┌───────────────────────────────────────┐  │
│  │        Wallet Dashboard               │  │
│  │  • View all accounts                  │  │
│  │  • Send/receive crypto                │  │
│  │  • Transaction history                │  │
│  └───────────────────────────────────────┘  │
│                     │                       │
│  ┌───────────────────────────────────────┐  │
│  │        Panoplia Wallet SDK            │  │
│  │  • SQLite storage (secure)            │  │
│  │  • System keychain integration        │  │
│  │  • Hardware wallet support (future)   │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Benefits:**
- Enhanced security with system keychain
- Faster storage with SQLite
- Can access hardware security modules

### 4. Browser Extension

A MetaMask-like browser extension for web3 interactions.

```
┌─────────────────────────────────────────────┐
│           Browser Extension                 │
│  ┌───────────────────────────────────────┐  │
│  │         Popup Interface               │  │
│  │  • Quick balance view                 │  │
│  │  • Transaction approval               │  │
│  │  • dApp connections                   │  │
│  └───────────────────────────────────────┘  │
│                     │                       │
│  ┌───────────────────────────────────────┐  │
│  │        Panoplia Wallet SDK            │  │
│  │  • IndexedDB in extension context     │  │
│  │  • EIP-1193 provider injection        │  │
│  │  • Cross-origin messaging             │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Benefits:**
- Works with any dApp
- Consistent UX across sites
- Full control over approvals

### 5. Embedded Wallet in SaaS Platform

A B2B SaaS that provides wallet-as-a-service for their customers.

```
┌─────────────────────────────────────────────┐
│              SaaS Platform                  │
│  ┌───────────────────────────────────────┐  │
│  │      Customer-Facing Portal           │  │
│  │  • Onboard users without crypto UX    │  │
│  │  • Abstract blockchain complexity     │  │
│  │  • White-label wallet experience      │  │
│  └───────────────────────────────────────┘  │
│                     │                       │
│  ┌───────────────────────────────────────┐  │
│  │        Panoplia Wallet SDK            │  │
│  │  • Generate wallets on signup         │  │
│  │  • Cloud backup (optional)            │  │
│  │  • Social recovery for lost access    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Benefits:**
- Simplified onboarding
- Non-custodial by default
- Optional cloud backup with user consent

## Security Model

### Encryption at Rest

```
┌─────────────────────────────────────────────┐
│              User Password                  │
│                    │                        │
│                    ▼                        │
│  ┌───────────────────────────────────────┐  │
│  │   scrypt (N=2^18, r=8, p=1)           │  │
│  │   + random 32-byte salt               │  │
│  └───────────────────────────────────────┘  │
│                    │                        │
│                    ▼                        │
│           256-bit Encryption Key            │
│                    │                        │
│                    ▼                        │
│  ┌───────────────────────────────────────┐  │
│  │   NaCl secretbox (XSalsa20-Poly1305)  │  │
│  │   + random 24-byte nonce              │  │
│  └───────────────────────────────────────┘  │
│                    │                        │
│                    ▼                        │
│  ┌───────────────────────────────────────┐  │
│  │        Encrypted Mnemonic             │  │
│  │        (stored in IndexedDB)          │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Key Derivation (BIP-44)

```
                    Mnemonic
                       │
                       ▼
              ┌────────────────┐
              │  Master Seed   │
              └────────┬───────┘
                       │
          m/44'/60'/0'/0
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   Account 0      Account 1      Account 2
   (index 0)      (index 1)      (index 2)
```

### Trust Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    TRUSTED ZONE                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Browser/Electron Process                            │    │
│  │  • Mnemonic decrypted only when unlocked            │    │
│  │  • Private keys derived on-demand, never stored     │    │
│  │  • Keys cleared from memory on lock                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Encrypted data only
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   UNTRUSTED ZONE                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐     │
│  │  IndexedDB       │  │  Cloud Backup (optional)     │     │
│  │  (encrypted)     │  │  (server never sees keys)    │     │
│  └──────────────────┘  └──────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Creating a New Wallet

```
User clicks "Create Wallet"
         │
         ▼
┌─────────────────────────────┐
│  1. Generate entropy        │
│     (crypto.getRandomValues) │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  2. Create BIP-39 mnemonic  │
│     (12 or 24 words)        │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  3. Derive first account    │
│     (m/44'/60'/0'/0/0)      │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  4. Encrypt mnemonic        │
│     (user's password)       │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  5. Store in IndexedDB      │
└─────────────────────────────┘
         │
         ▼
Display mnemonic for backup
(user must write it down)
```

### Signing a Transaction

```
dApp requests transaction
         │
         ▼
┌─────────────────────────────┐
│  1. Check wallet unlocked   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  2. Get active account      │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  3. Derive private key      │
│     (from mnemonic in RAM)  │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  4. Sign transaction        │
│     (ethers.js)             │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  5. Clear private key       │
│     from memory             │
└─────────────────────────────┘
         │
         ▼
Return signed transaction
```

## Supported Chains

| Chain | Chain ID | Native Currency | Type |
|-------|----------|-----------------|------|
| Ethereum | 1 | ETH | Mainnet |
| Sepolia | 11155111 | ETH | Testnet |
| Polygon | 137 | MATIC | Mainnet |
| Polygon Amoy | 80002 | MATIC | Testnet |
| Arbitrum One | 42161 | ETH | Mainnet |
| Arbitrum Sepolia | 421614 | ETH | Testnet |
| Optimism | 10 | ETH | Mainnet |
| Optimism Sepolia | 11155420 | ETH | Testnet |
| Base | 8453 | ETH | Mainnet |
| Base Sepolia | 84532 | ETH | Testnet |
| Avalanche C-Chain | 43114 | AVAX | Mainnet |
| BNB Smart Chain | 56 | BNB | Mainnet |

## Future Architecture (Cloud Wallet)

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Side                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              @panoplia/cloud-wallet                  │    │
│  │  • Encrypt wallet client-side                       │    │
│  │  • Upload encrypted blob to server                  │    │
│  │  • Manage guardians for social recovery             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (TLS 1.3)
                              │ Encrypted wallet blob
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Server Side                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           cloud-wallets (Rust + Actix-web)           │    │
│  │  • Store encrypted blobs (server is blind)          │    │
│  │  • Manage recovery requests with timelock           │    │
│  │  • Notify guardians via email/webhook               │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PostgreSQL Database                     │    │
│  │  • users: authentication, email                     │    │
│  │  • encrypted_wallets: opaque blobs                  │    │
│  │  • guardians: public keys, contact info             │    │
│  │  • recovery_requests: status, timelock              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

| Operation | Typical Time | Notes |
|-----------|--------------|-------|
| Key derivation (unlock) | ~1 second | scrypt is intentionally slow |
| Account derivation | < 10ms | BIP-44 derivation |
| Transaction signing | < 50ms | ECDSA signing |
| Balance query | 100-500ms | Network dependent |
| IndexedDB read/write | < 10ms | Local storage |

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 80+ | ✅ Full | Primary target |
| Firefox 78+ | ✅ Full | |
| Safari 14+ | ✅ Full | |
| Edge 80+ | ✅ Full | Chromium-based |
| Mobile Chrome | ✅ Full | |
| Mobile Safari | ✅ Full | iOS 14+ |

## Limitations

1. **No hardware security** - Web apps cannot access Secure Enclave/TPM
2. **Memory not protected** - JavaScript cannot guarantee memory clearing
3. **No biometrics** - WebAuthn support planned for future
4. **Single-threaded** - Heavy crypto operations may block UI briefly
