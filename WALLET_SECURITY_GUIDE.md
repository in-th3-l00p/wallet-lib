# Panoplia Wallet SDK - Complete Security Guide

> **A comprehensive guide for building the most secure self-custodial wallet with MPC and Social Recovery across all platforms**

This guide walks you through creating a production-ready wallet application using the Panoplia Wallet SDK. You'll learn how to implement maximum security for your users while maintaining a great user experience across Web, Electron Desktop, React Native Mobile, and Browser Extensions.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Security Model](#2-security-model)
3. [Platform-Specific Setup](#3-platform-specific-setup)
4. [Creating a Basic Secure Wallet](#4-creating-a-basic-secure-wallet)
5. [Upgrading to MPC (Multi-Party Computation)](#5-upgrading-to-mpc-multi-party-computation)
6. [Implementing Social Recovery](#6-implementing-social-recovery)
7. [Complete Security Checklist](#7-complete-security-checklist)
8. [Production Deployment Guide](#8-production-deployment-guide)

---

## 1. Architecture Overview

### Package Structure

```
@panoplia/core              # Cryptographic primitives, types, HD wallet
@panoplia/local-wallet      # Self-custodial wallet implementation
@panoplia/mpc               # Multi-Party Computation (threshold signatures)
@panoplia/social-recovery   # Guardian-based recovery system
@panoplia/react             # React hooks and context provider
```

### Security Layers

```
Layer 3: Social Recovery
         ├── Guardian management
         ├── Timelock protection
         └── Recovery execution

Layer 2: MPC (Optional Upgrade)
         ├── Shamir's Secret Sharing
         ├── Threshold signatures (k-of-n)
         └── Distributed key management

Layer 1: Base Wallet
         ├── BIP-39 mnemonic generation
         ├── BIP-44 HD key derivation
         ├── NaCl encryption (XSalsa20-Poly1305)
         └── scrypt key derivation (N=2^18)

Layer 0: Platform Storage
         ├── IndexedDB (Web/Extension)
         ├── SQLite + Keychain (Electron/Mobile)
         └── Encrypted at rest
```

### Trust Model

```
FULLY TRUSTED (Client-Side Only):
  - Decrypted mnemonic (only in memory when unlocked)
  - Derived private keys (never persisted)
  - Share reconstruction (MPC)

ENCRYPTED AT REST:
  - Mnemonic phrase (in storage)
  - MPC shares (distributed)
  - Guardian share data

NEVER TRUSTED:
  - Network/RPC providers (read-only, verify responses)
  - Cloud backup servers (receive only encrypted blobs)
  - Third-party services
```

---

## 2. Security Model

### Encryption Pipeline

All sensitive data flows through this encryption pipeline before storage:

```
User Password
      │
      ▼
┌─────────────────────────────────────────┐
│  scrypt Key Derivation                  │
│  N=262144 (2^18), r=8, p=1, dkLen=32   │
│  ~1 second on modern hardware           │
└─────────────────────────────────────────┘
      │
      ▼
256-bit Encryption Key
      │
      ▼
┌─────────────────────────────────────────┐
│  NaCl secretbox                         │
│  XSalsa20 stream cipher                 │
│  Poly1305 authentication                │
│  24-byte random nonce                   │
└─────────────────────────────────────────┘
      │
      ▼
Encrypted Payload (ciphertext + nonce + salt)
      │
      ▼
Base64 + JSON Serialization
      │
      ▼
Platform Storage (IndexedDB/SQLite/etc.)
```

### What Gets Encrypted

| Data | Encrypted | Storage Location | Notes |
|------|-----------|------------------|-------|
| Mnemonic phrase | Yes | Local storage | The crown jewels |
| MPC shares | Yes | Distributed | Each with unique password |
| Guardian shares | Yes | Guardian devices | Password protected |
| Private keys | Never stored | Derived on-demand | Cleared after use |
| Account addresses | No | Local storage | Public information |
| Transaction history | No | Local/chain | Public on blockchain |

### Key Security Parameters

```typescript
// Encryption (packages/core/src/encryption.ts)
const SCRYPT_N = 2 ** 18;  // ~262K iterations
const SCRYPT_R = 8;         // Block size
const SCRYPT_P = 1;         // Parallelization
const KEY_LENGTH = 32;      // 256-bit key

// This makes brute-force attacks extremely expensive:
// - ~1 second per password attempt
// - ~$10,000+ to crack a 12-character random password
```

---

## 3. Platform-Specific Setup

### Web Application (React)

```bash
npm install @panoplia/core @panoplia/local-wallet @panoplia/react
# For MPC & Social Recovery:
npm install @panoplia/mpc @panoplia/social-recovery
```

```typescript
// src/App.tsx
import { WalletProvider } from '@panoplia/react';

function App() {
  return (
    <WalletProvider
      defaultChainId={1}           // Ethereum mainnet
      autoLockTimeoutMs={300000}   // 5 minutes auto-lock
    >
      <YourApp />
    </WalletProvider>
  );
}
```

**Storage**: IndexedDB (built-in, no additional setup)

### Electron Desktop

```bash
npm install @panoplia/core @panoplia/local-wallet @panoplia/react
npm install better-sqlite3 keytar  # Desktop-specific
```

```typescript
// main/storage.ts - Create SQLite adapter
import Database from 'better-sqlite3';
import * as keytar from 'keytar';
import type { StorageAdapter } from '@panoplia/core';

export class SQLiteStorage implements StorageAdapter {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS wallet_data (
        key TEXT PRIMARY KEY,
        value BLOB NOT NULL
      )
    `);
  }

  async setWalletData(key: string, data: Uint8Array): Promise<void> {
    this.db.prepare('INSERT OR REPLACE INTO wallet_data (key, value) VALUES (?, ?)')
      .run(key, Buffer.from(data));
  }

  async getWalletData(key: string): Promise<Uint8Array | null> {
    const row = this.db.prepare('SELECT value FROM wallet_data WHERE key = ?').get(key);
    return row ? new Uint8Array(row.value) : null;
  }

  async deleteWalletData(key: string): Promise<void> {
    this.db.prepare('DELETE FROM wallet_data WHERE key = ?').run(key);
  }

  async hasWalletData(key: string): Promise<boolean> {
    const row = this.db.prepare('SELECT 1 FROM wallet_data WHERE key = ?').get(key);
    return !!row;
  }

  async listKeys(): Promise<string[]> {
    const rows = this.db.prepare('SELECT key FROM wallet_data').all();
    return rows.map(r => r.key);
  }

  async clear(): Promise<void> {
    this.db.exec('DELETE FROM wallet_data');
  }
}

// Secure password storage in system keychain
export async function storeInKeychain(key: string, value: string): Promise<void> {
  await keytar.setPassword('panoplia-wallet', key, value);
}

export async function getFromKeychain(key: string): Promise<string | null> {
  return keytar.getPassword('panoplia-wallet', key);
}
```

```typescript
// renderer/App.tsx
import { WalletProvider } from '@panoplia/react';
import { SQLiteStorage } from '../main/storage';

// IPC to get storage from main process
const storage = window.electron.getStorage();

function App() {
  return (
    <WalletProvider storage={storage}>
      <YourApp />
    </WalletProvider>
  );
}
```

### React Native Mobile

```bash
npm install @panoplia/core @panoplia/local-wallet
npm install @react-native-async-storage/async-storage
npm install react-native-keychain  # Secure enclave access
```

```typescript
// src/storage/ReactNativeStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import type { StorageAdapter } from '@panoplia/core';

export class ReactNativeStorage implements StorageAdapter {
  private prefix = '@panoplia:';

  async setWalletData(key: string, data: Uint8Array): Promise<void> {
    const base64 = Buffer.from(data).toString('base64');
    await AsyncStorage.setItem(this.prefix + key, base64);
  }

  async getWalletData(key: string): Promise<Uint8Array | null> {
    const base64 = await AsyncStorage.getItem(this.prefix + key);
    if (!base64) return null;
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  async deleteWalletData(key: string): Promise<void> {
    await AsyncStorage.removeItem(this.prefix + key);
  }

  async hasWalletData(key: string): Promise<boolean> {
    const value = await AsyncStorage.getItem(this.prefix + key);
    return value !== null;
  }

  async listKeys(): Promise<string[]> {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys
      .filter(k => k.startsWith(this.prefix))
      .map(k => k.slice(this.prefix.length));
  }

  async clear(): Promise<void> {
    const keys = await this.listKeys();
    await AsyncStorage.multiRemove(keys.map(k => this.prefix + k));
  }
}

// Use Secure Enclave for biometric unlock
export async function storeWithBiometrics(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, {
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getWithBiometrics(key: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword();
  if (result && result.username === key) {
    return result.password;
  }
  return null;
}
```

### Browser Extension

```bash
npm install @panoplia/core @panoplia/local-wallet @panoplia/react
```

```typescript
// src/background/storage.ts
import type { StorageAdapter } from '@panoplia/core';

export class ExtensionStorage implements StorageAdapter {
  async setWalletData(key: string, data: Uint8Array): Promise<void> {
    const base64 = btoa(String.fromCharCode(...data));
    await chrome.storage.local.set({ [key]: base64 });
  }

  async getWalletData(key: string): Promise<Uint8Array | null> {
    const result = await chrome.storage.local.get(key);
    if (!result[key]) return null;
    const binary = atob(result[key]);
    return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
  }

  async deleteWalletData(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  async hasWalletData(key: string): Promise<boolean> {
    const result = await chrome.storage.local.get(key);
    return key in result;
  }

  async listKeys(): Promise<string[]> {
    const result = await chrome.storage.local.get(null);
    return Object.keys(result);
  }

  async clear(): Promise<void> {
    await chrome.storage.local.clear();
  }
}
```

```json
// manifest.json (v3)
{
  "permissions": ["storage"],
  "background": {
    "service_worker": "background.js"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

## 4. Creating a Basic Secure Wallet

### Step 1: Initialize the Wallet

```typescript
import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';

// Create wallet instance with storage
const storage = createIndexedDBStorage();
const wallet = LocalWallet.create(storage);
```

### Step 2: Create a New Wallet with Strong Entropy

```typescript
// Generate a new wallet with 24-word mnemonic (256-bit entropy)
const { mnemonic, account } = await wallet.createWallet(
  userPassword,   // User's master password
  24              // 24 words for maximum security
);

// CRITICAL: Show mnemonic ONCE for backup
// User MUST write this down
displayBackupScreen(mnemonic);

// After backup confirmation, clear mnemonic from memory
// The wallet is now usable
console.log('Wallet created:', account.address);
```

### Step 3: Implement Secure Password Requirements

```typescript
// Enforce strong passwords
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Must contain special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Step 4: Implement Wallet Lifecycle

```typescript
// Using React hooks
import { useWallet, useAccounts } from '@panoplia/react';

function WalletManager() {
  const {
    isInitialized,
    isLocked,
    unlock,
    lock,
    createWallet
  } = useWallet();

  const { activeAccount, accounts } = useAccounts();

  // Auto-lock on inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        lock();
      }, 5 * 60 * 1000); // 5 minutes
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [lock]);

  if (!isInitialized) {
    return <CreateWalletFlow onComplete={createWallet} />;
  }

  if (isLocked) {
    return <UnlockScreen onUnlock={unlock} />;
  }

  return <WalletDashboard account={activeAccount} />;
}
```

### Step 5: Sign Transactions Securely

```typescript
import { useTransaction, useChain } from '@panoplia/react';
import { parseEther, formatEther } from 'ethers';

function SendTransaction() {
  const { send, status, hash, error } = useTransaction();
  const { chain } = useChain();

  const handleSend = async (to: string, amount: string) => {
    // Always show confirmation dialog
    const confirmed = await showConfirmationDialog({
      to,
      amount: formatEther(parseEther(amount)),
      network: chain.name,
      estimatedFee: await estimateGas(to, amount)
    });

    if (!confirmed) return;

    try {
      const response = await send({
        to,
        value: parseEther(amount),
        // Gas settings handled by provider
      });

      console.log('Transaction sent:', response.hash);
    } catch (err) {
      console.error('Transaction failed:', err);
    }
  };

  return (
    <div>
      {status === 'signing' && <p>Please confirm in wallet...</p>}
      {status === 'broadcasting' && <p>Broadcasting transaction...</p>}
      {status === 'confirmed' && <p>Success! TX: {hash}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## 5. Upgrading to MPC (Multi-Party Computation)

MPC splits your private key into multiple shares. You need a minimum number of shares (threshold) to sign transactions. This protects against single points of failure.

### Why MPC?

| Scenario | Without MPC | With MPC (3-of-5) |
|----------|-------------|-------------------|
| Phone stolen | Complete loss | Attacker has 1 share, can't sign |
| Cloud backup compromised | Complete loss | Attacker has 1 share, can't sign |
| One guardian compromised | N/A | Still need 2 more shares |
| You lose your device | Complete loss | Recover with 3 guardians |

### Step 1: Import Existing Wallet into MPC

```typescript
import { MPCWallet } from '@panoplia/mpc';
import { LocalWallet } from '@panoplia/local-wallet';

async function upgradeToMPC(
  existingWallet: LocalWallet,
  password: string
) {
  // Get the private key from existing wallet
  const privateKey = await existingWallet.exportPrivateKey(password);

  // Create 5 shares, require 3 to sign
  const mpcResult = MPCWallet.importKey(
    privateKey,
    {
      totalShares: 5,
      threshold: 3,
      shareLabels: [
        'Your Device',
        'Cloud Backup',
        'Guardian: Mom',
        'Guardian: Dad',
        'Guardian: Friend'
      ]
    },
    [
      'device-password-strong-123!',
      'cloud-backup-password-456@',
      'mom-share-password-789#',
      'dad-share-password-012$',
      'friend-share-password-345%'
    ]
  );

  // IMPORTANT: Address remains the same!
  console.log('Same address:', mpcResult.state.address);

  // Clear original private key from memory
  // Now only shares exist

  return mpcResult;
}
```

### Step 2: Distribute Shares Securely

```typescript
async function distributeShares(mpcResult: CreateMPCWalletResult) {
  const { encryptedShares, state } = mpcResult;

  // Share 0: Store on device (localStorage/SecureStorage)
  await secureLocalStorage.set('mpc-share-0', JSON.stringify(encryptedShares[0]));

  // Share 1: Encrypted cloud backup
  await cloudBackup.store({
    keyId: state.keyId,
    share: encryptedShares[1],
    // Server only sees encrypted blob
  });

  // Shares 2-4: Send to guardians
  for (let i = 2; i < 5; i++) {
    await sendToGuardian({
      guardianEmail: guardians[i - 2].email,
      encryptedShare: encryptedShares[i],
      walletAddress: state.address,
      instructions: `
        This is your guardian share for wallet ${state.address}.
        Keep this safe! You'll need the password to unlock it.
        The wallet owner may contact you if they need to recover their wallet.
      `
    });
  }
}
```

### Step 3: Sign with MPC Wallet

```typescript
import { MPCWallet } from '@panoplia/mpc';

async function signWithMPC(
  mpcState: MPCWalletState,
  message: string
) {
  const mpcWallet = new MPCWallet();
  mpcWallet.loadState(mpcState);

  // Collect shares (need 3 of 5)

  // Share 1: From device
  const deviceShare = await secureLocalStorage.get('mpc-share-0');
  mpcWallet.addShare(JSON.parse(deviceShare), 'device-password-strong-123!');

  // Share 2: From cloud
  const cloudShare = await cloudBackup.retrieve(mpcState.keyId);
  mpcWallet.addShare(cloudShare, 'cloud-backup-password-456@');

  // Now we have 2 shares, need 1 more...
  // Option A: Request from guardian
  // Option B: Use another device

  // For normal operations, user might have 2 devices
  const secondDeviceShare = await requestFromSecondDevice();
  mpcWallet.addShare(secondDeviceShare, 'second-device-password');

  // Check if we can sign
  if (!mpcWallet.canSign()) {
    throw new Error(`Need ${mpcWallet.getConfig().threshold} shares`);
  }

  // Sign the message
  const signature = await mpcWallet.signMessage(message);

  // CRITICAL: Clear shares from memory
  mpcWallet.clearShares();

  return signature;
}
```

### Step 4: MPC for Different Security Levels

```typescript
// LOW SECURITY: 2-of-3 (convenient, less secure)
// - Device + Cloud can sign
// - Good for small amounts
const lowSecurity = MPCWallet.create(
  { totalShares: 3, threshold: 2 },
  passwords
);

// MEDIUM SECURITY: 3-of-5 (balanced)
// - Device + Cloud + 1 Guardian needed
// - Recovery possible with 3 guardians
const mediumSecurity = MPCWallet.create(
  { totalShares: 5, threshold: 3 },
  passwords
);

// HIGH SECURITY: 5-of-7 (institutional grade)
// - Requires coordination of 5 parties
// - Extremely difficult to compromise
const highSecurity = MPCWallet.create(
  { totalShares: 7, threshold: 5 },
  passwords
);
```

---

## 6. Implementing Social Recovery

Social Recovery provides a safety net when you lose access to your wallet. Trusted guardians can help you recover your funds after a security delay.

### How Social Recovery Works

```
SETUP PHASE:
┌─────────────────────────────────────────────────────────────┐
│  1. Create wallet with MPC (5 shares, threshold 3)          │
│  2. Owner keeps 1 share                                      │
│  3. 4 Guardians each receive 1 encrypted share              │
│  4. Normal operation: Owner + 2 Guardians sign              │
│  5. Recovery: 3 Guardians can recover without owner         │
└─────────────────────────────────────────────────────────────┘

RECOVERY PHASE:
┌─────────────────────────────────────────────────────────────┐
│  T=0h:   Recovery initiated (owner lost access)             │
│  T=0h:   Guardian 1 approves + provides share               │
│  T=12h:  Guardian 2 approves + provides share               │
│  T=24h:  Guardian 3 approves + provides share               │
│          → Threshold reached, TIMELOCK STARTS               │
│  T=24-72h: Original owner can CANCEL (fraud protection)     │
│  T=72h:  Timelock expires, recovery can execute             │
│  T=72h:  Private key reconstructed from 3 shares            │
│  T=72h:  Owner imports key to new device                    │
└─────────────────────────────────────────────────────────────┘
```

### Step 1: Set Up Social Recovery Wallet

```typescript
import { SocialRecoveryWallet } from '@panoplia/social-recovery';

async function setupSocialRecovery() {
  // Create the wallet with guardian configuration
  const wallet = new SocialRecoveryWallet({
    totalShares: 5,      // 1 owner + 4 guardians
    threshold: 3,        // Need 3 to sign/recover
    ownerShares: 1,      // You keep 1 share
    timelockHours: 48,   // 48-hour delay for recovery
    expirationDays: 7,   // Recovery request expires in 7 days
  });

  // Set up with guardian information
  const setupResult = await wallet.setup(
    'your-strong-password-here!',
    [
      {
        name: 'Mom',
        contact: 'mom@family.com',
        contactType: 'email',
        sharePassword: 'mom-unique-password-123!'
      },
      {
        name: 'Dad',
        contact: 'dad@family.com',
        contactType: 'email',
        sharePassword: 'dad-unique-password-456@'
      },
      {
        name: 'Best Friend',
        contact: 'friend@email.com',
        contactType: 'email',
        sharePassword: 'friend-unique-password-789#'
      },
      {
        name: 'Lawyer',
        contact: 'lawyer@lawfirm.com',
        contactType: 'email',
        sharePassword: 'lawyer-unique-password-012$'
      }
    ]
  );

  console.log('Wallet Address:', wallet.getAddress());

  // BACKUP YOUR SHARE (CRITICAL!)
  console.log('Your share (BACKUP THIS!):', setupResult.ownerPlainShares[0]);

  return { wallet, setupResult };
}
```

### Step 2: Send Guardian Invitations

```typescript
async function sendGuardianInvites(setupResult: SetupResult) {
  for (const { guardian, invite, encryptedShare } of setupResult.guardianInvites) {
    // Send via your communication system
    await sendEmail({
      to: guardian.contact,
      subject: 'You have been selected as a wallet guardian',
      body: `
        ${guardian.name},

        You have been selected as a guardian for a cryptocurrency wallet.

        WHAT THIS MEANS:
        - You hold a piece of the wallet recovery key
        - If the owner loses access, you may be asked to help recover
        - You CANNOT access the wallet on your own
        - Keep your share password safe: you'll need it for recovery

        YOUR VERIFICATION CODE: ${invite.verificationCode}
        (Use this to confirm you received the invitation)

        ENCRYPTED SHARE DATA:
        ${JSON.stringify(encryptedShare)}

        Save this email securely. You may be contacted for recovery.

        Questions? Contact the wallet owner.
      `
    });

    console.log(`Invite sent to ${guardian.name} (${guardian.contact})`);
  }
}
```

### Step 3: Guardian Accepts Invitation

```typescript
// Guardian's side - accepting the invitation
async function guardianAcceptsInvite(
  wallet: SocialRecoveryWallet,
  guardianId: string,
  inviteId: string,
  verificationCode: string
) {
  const accepted = wallet.processGuardianResponse({
    inviteId,
    guardianId,
    accepted: true,
    verificationCode,  // The 6-digit code from email
    respondedAt: Date.now()
  });

  if (accepted) {
    console.log('Guardian successfully accepted!');
  } else {
    console.log('Invalid verification code');
  }
}
```

### Step 4: Normal Operation (Owner + Guardians)

```typescript
async function normalSigningOperation(
  wallet: SocialRecoveryWallet,
  setupResult: SetupResult,
  message: string
) {
  // Unlock owner's share
  wallet.unlockOwnerShares('your-strong-password-here!');

  // Need 2 more shares (3 total for threshold)
  // Request from 2 guardians
  const guardian1Share = await requestShareFromGuardian(
    setupResult.guardianInvites[0].guardian,
    setupResult.guardianInvites[0].encryptedShare
  );
  wallet.addGuardianShare(
    setupResult.guardianInvites[0].encryptedShare,
    'mom-unique-password-123!'
  );

  const guardian2Share = await requestShareFromGuardian(
    setupResult.guardianInvites[1].guardian,
    setupResult.guardianInvites[1].encryptedShare
  );
  wallet.addGuardianShare(
    setupResult.guardianInvites[1].encryptedShare,
    'dad-unique-password-456@'
  );

  // Now we have 3 shares, can sign
  if (wallet.canSign()) {
    const signature = await wallet.signMessage(message);
    console.log('Signed:', signature);
  }

  // Lock wallet when done
  wallet.lock();
}
```

### Step 5: Recovery Flow (Owner Lost Access)

```typescript
// SCENARIO: Owner lost their phone and can't access wallet

// Step 1: Someone initiates recovery (could be owner from new device)
async function initiateRecovery(wallet: SocialRecoveryWallet) {
  const recoveryRequest = wallet.initiateRecovery({
    initiator: 'owner-new-email@example.com',
    reason: 'Lost phone, need to recover wallet'
  });

  console.log('Recovery initiated:', recoveryRequest.id);
  console.log('Status:', recoveryRequest.status);  // 'pending'

  // Notify guardians
  await notifyGuardiansOfRecovery(recoveryRequest);

  return recoveryRequest;
}

// Step 2: Guardians approve one by one
async function guardianApprovesRecovery(
  wallet: SocialRecoveryWallet,
  requestId: string,
  guardianId: string,
  decryptedShareValue: string  // Guardian decrypts their share with password
) {
  wallet.addRecoveryApproval(requestId, guardianId, decryptedShareValue);

  const progress = wallet.getRecoveryProgress(requestId);
  console.log(`Approvals: ${progress.current}/${progress.required}`);

  if (progress.percentage === 100) {
    console.log('Threshold reached! Timelock started.');
    const remaining = wallet.getRecoveryTimelockRemaining(requestId);
    console.log(`Recovery ready in: ${remaining / 1000 / 60 / 60} hours`);
  }
}

// Step 3: Wait for timelock (48 hours by default)
// This gives original owner time to cancel if fraudulent

// Step 4: Execute recovery after timelock
async function executeRecovery(
  wallet: SocialRecoveryWallet,
  requestId: string
) {
  if (!wallet.isRecoveryReady(requestId)) {
    const remaining = wallet.getRecoveryTimelockRemaining(requestId);
    throw new Error(`Recovery not ready. ${remaining}ms remaining.`);
  }

  // Reconstruct the private key
  const recoveredPrivateKey = wallet.executeRecovery(requestId);

  console.log('RECOVERY SUCCESSFUL!');
  console.log('Private Key:', recoveredPrivateKey);

  // NEXT STEPS:
  // 1. Import this key to a new wallet
  // 2. Set up NEW social recovery (old guardians may be compromised)
  // 3. Consider transferring to completely new address

  return recoveredPrivateKey;
}

// FRAUD PROTECTION: Original owner can cancel
async function cancelFraudulentRecovery(
  wallet: SocialRecoveryWallet,
  requestId: string
) {
  // If owner still has access and sees unauthorized recovery attempt
  wallet.cancelRecovery(requestId);
  console.log('Recovery cancelled. Consider removing compromised guardians.');
}
```

### Step 6: Guardian Best Practices

```typescript
// Guidelines for selecting guardians:

const guardianSelectionGuide = {
  // Diversity: Don't put all eggs in one basket
  diversity: [
    'Different households (not all family in same house)',
    'Different geographic regions',
    'Mix of relationships (family, friends, professionals)',
    'Different communication channels (email, phone, etc.)'
  ],

  // Reliability: They need to respond when needed
  reliability: [
    'Tech-savvy enough to follow instructions',
    'Reachable through multiple channels',
    'Likely to keep the same contact info',
    'Trustworthy with sensitive information'
  ],

  // Security: They should protect their share
  security: [
    'Understands importance of password security',
    'Won\'t share their password with others',
    'Uses secure email/communication',
    'Won\'t lose the share data'
  ],

  // Trust: They shouldn\'t collude against you
  trust: [
    'No financial incentive to steal',
    'Diverse relationships (3 guardians can\'t be best friends)',
    'Professional guardians (lawyer) add accountability',
    'Consider requiring 2+ guardians from different circles'
  ]
};
```

---

## 7. Complete Security Checklist

### Wallet Creation

- [ ] **Use 24-word mnemonic** for maximum entropy
- [ ] **Enforce strong passwords** (12+ chars, mixed case, numbers, symbols)
- [ ] **Show mnemonic only once** with backup confirmation
- [ ] **Never store mnemonic in state** or logs
- [ ] **Clear sensitive data** from memory after use

### Storage Security

- [ ] **Use platform-appropriate storage** (IndexedDB, SQLite, Keychain)
- [ ] **Encrypt all sensitive data** before storage
- [ ] **Implement auto-lock** (5-15 minute timeout)
- [ ] **Rate-limit unlock attempts** (exponential backoff)

### MPC Configuration

- [ ] **Minimum 3-of-5 threshold** for meaningful security
- [ ] **Unique passwords per share** (never reuse)
- [ ] **Distribute shares** to independent locations
- [ ] **Test recovery** before storing significant funds

### Social Recovery

- [ ] **48+ hour timelock** for fraud protection
- [ ] **Diverse guardians** (different households/regions)
- [ ] **Verification codes** sent via separate channel
- [ ] **Regular guardian check-ins** (annual reminders)

### Transaction Security

- [ ] **Always show confirmation** before signing
- [ ] **Display full transaction details** (to, amount, network, fees)
- [ ] **Validate addresses** with checksums
- [ ] **Warn on first-time recipients**

### Network Security

- [ ] **HTTPS only** in production
- [ ] **Content Security Policy** headers
- [ ] **Don't trust RPC responses** blindly
- [ ] **Use multiple RPC providers** for redundancy

### Application Security

- [ ] **No sensitive data in URLs** or query params
- [ ] **Sanitize all inputs** (addresses, amounts)
- [ ] **Implement phishing protection** (show domain prominently)
- [ ] **Regular security audits**

---

## 8. Production Deployment Guide

### Pre-Launch Checklist

```typescript
// 1. Environment validation
if (process.env.NODE_ENV === 'production') {
  // Ensure HTTPS
  if (location.protocol !== 'https:') {
    location.replace(`https:${location.href.slice(5)}`);
  }

  // Disable console in production
  console.log = () => {};
  console.debug = () => {};
}

// 2. Error boundary for wallet operations
class WalletErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    // Log to error tracking (without sensitive data!)
    errorTracker.capture(error, {
      // NEVER include: mnemonic, privateKey, shares
      walletAddress: this.state.address,
      operation: this.state.lastOperation,
    });
  }
}

// 3. Analytics without sensitive data
const safeAnalytics = {
  track: (event: string, data: object) => {
    // Strip any potential sensitive fields
    const safeData = { ...data };
    delete safeData.mnemonic;
    delete safeData.privateKey;
    delete safeData.password;
    delete safeData.share;

    analytics.track(event, safeData);
  }
};
```

### Security Headers (Server Config)

```nginx
# nginx.conf
server {
    # Force HTTPS
    listen 443 ssl http2;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CSP for wallet apps
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self';
        style-src 'self' 'unsafe-inline';
        connect-src 'self' https://*.infura.io https://*.alchemy.com;
        img-src 'self' data: https:;
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
    " always;
}
```

### Recommended Testing Strategy

```typescript
// 1. Unit tests for crypto operations
describe('Encryption', () => {
  it('encrypts and decrypts correctly', async () => {
    const plaintext = 'test-secret';
    const password = 'strong-password-123!';

    const encrypted = encrypt(plaintext, password);
    const decrypted = decrypt(encrypted, password);

    expect(decrypted).toBe(plaintext);
  });

  it('fails with wrong password', () => {
    const encrypted = encrypt('secret', 'correct-password');
    expect(() => decrypt(encrypted, 'wrong-password')).toThrow();
  });
});

// 2. Integration tests for wallet lifecycle
describe('Wallet Lifecycle', () => {
  it('creates, locks, and unlocks wallet', async () => {
    const wallet = LocalWallet.create(storage);

    // Create
    const { mnemonic, account } = await wallet.createWallet('password', 24);
    expect(mnemonic.split(' ')).toHaveLength(24);
    expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // Lock
    await wallet.lock();
    expect(wallet.isLocked()).toBe(true);

    // Unlock
    const success = await wallet.unlock('password');
    expect(success).toBe(true);
    expect(wallet.isLocked()).toBe(false);
  });
});

// 3. E2E tests for recovery flows
describe('Social Recovery', () => {
  it('completes full recovery flow', async () => {
    // Setup
    const wallet = new SocialRecoveryWallet({ threshold: 3 });
    await wallet.setup(password, guardians);

    // Initiate recovery
    const request = wallet.initiateRecovery({ initiator: 'test', reason: 'test' });

    // Guardian approvals
    for (let i = 0; i < 3; i++) {
      wallet.addRecoveryApproval(request.id, guardians[i].id, shares[i]);
    }

    // Execute (with 0 timelock for testing)
    const recoveredKey = wallet.executeRecovery(request.id);
    expect(recoveredKey).toBeTruthy();
  });
});
```

---

## Summary

This guide covered how to build the most secure wallet possible using the Panoplia Wallet SDK:

1. **Base Security**: Strong encryption, secure storage, auto-lock
2. **MPC Layer**: Split keys into shares, require threshold to sign
3. **Social Recovery**: Guardian-based recovery with timelock protection
4. **Platform Support**: Web, Electron, React Native, Browser Extension

The combination of MPC and Social Recovery provides:
- **No single point of failure** - Lose your phone? Other shares still safe.
- **Fraud protection** - 48-hour timelock to cancel unauthorized recovery
- **Self-custody** - You control your keys, no third-party custody
- **User-friendly recovery** - No need to memorize or store seed phrases long-term

For additional documentation, see:
- `/docs/getting-started.md` - Quick start guide
- `/docs/api-reference.md` - Complete API documentation
- `/docs/mpc-social-recovery.md` - Detailed MPC and recovery docs
- `/examples/mpc-social-recovery/` - Interactive demo application

---

*Built with Panoplia Wallet SDK - Secure, Self-Custodial, Multi-Platform*
