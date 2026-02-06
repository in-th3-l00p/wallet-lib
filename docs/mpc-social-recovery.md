# MPC and Social Recovery Guide

## Overview

The Panoplia Wallet SDK provides advanced security features through Multi-Party Computation (MPC) and Social Recovery. These features allow you to:

1. **Split your private key** into multiple shares using Shamir's Secret Sharing
2. **Require multiple shares** to sign transactions (threshold signatures)
3. **Distribute shares to guardians** for social recovery
4. **Recover your wallet** through trusted guardians if you lose access

## Packages

| Package | Description |
|---------|-------------|
| `@panoplia/mpc` | Core MPC functionality: Shamir's Secret Sharing, threshold signatures |
| `@panoplia/social-recovery` | Guardian management, recovery flows with timelock |

## Installation

```bash
npm install @panoplia/mpc @panoplia/social-recovery
```

---

## Quick Start: MPC Wallet

### Create an MPC Wallet

```typescript
import { MPCWallet } from '@panoplia/mpc';

// Create a 3-of-5 threshold wallet
const result = MPCWallet.create(
  {
    totalShares: 5,
    threshold: 3,
  },
  [
    'password-share-1',
    'password-share-2',
    'password-share-3',
    'password-share-4',
    'password-share-5',
  ]
);

console.log('Wallet address:', result.state.address);
console.log('Public key:', result.state.publicKey);

// Distribute encrypted shares to different storage locations
// Share 1: Local device
// Share 2: Cloud backup
// Share 3-5: Guardians
```

### Sign with MPC Wallet

```typescript
const mpcWallet = new MPCWallet();
mpcWallet.loadState(result.state);

// Add shares (need at least threshold = 3)
mpcWallet.addShare(result.encryptedShares[0], 'password-share-1');
mpcWallet.addShare(result.encryptedShares[1], 'password-share-2');
mpcWallet.addShare(result.encryptedShares[2], 'password-share-3');

// Now we can sign
if (mpcWallet.canSign()) {
  const signature = await mpcWallet.signMessage('Hello, MPC!');
  console.log('Signature:', signature);
}

// Clear shares when done (security)
mpcWallet.clearShares();
```

### Import Existing Key into MPC

```typescript
const existingPrivateKey = '0x...';

const result = MPCWallet.importKey(
  existingPrivateKey,
  { totalShares: 5, threshold: 3 },
  ['pass1', 'pass2', 'pass3', 'pass4', 'pass5']
);

// Same address as original key
console.log('Address:', result.state.address);
```

---

## Quick Start: Social Recovery

### Set Up Social Recovery

```typescript
import { SocialRecoveryWallet } from '@panoplia/social-recovery';

// Create wallet with 1 owner share + 4 guardian shares
// Threshold of 3 means: owner + 2 guardians OR 3 guardians without owner
const wallet = new SocialRecoveryWallet({
  totalShares: 5,
  threshold: 3,
  ownerShares: 1,
  timelockHours: 48, // 48-hour delay for recovery
});

const setupResult = await wallet.setup(
  'owner-password',
  [
    { name: 'Mom', contact: 'mom@email.com', contactType: 'email', sharePassword: 'mom-share-pass' },
    { name: 'Dad', contact: 'dad@email.com', contactType: 'email', sharePassword: 'dad-share-pass' },
    { name: 'Best Friend', contact: 'friend@email.com', contactType: 'email', sharePassword: 'friend-pass' },
    { name: 'Lawyer', contact: 'lawyer@firm.com', contactType: 'email', sharePassword: 'lawyer-pass' },
  ]
);

console.log('Wallet address:', wallet.getAddress());

// Send invites to guardians (via your preferred method)
for (const { guardian, invite, encryptedShare } of setupResult.guardianInvites) {
  console.log(`Send to ${guardian.name} (${guardian.contact}):`);
  console.log(`- Verification code: ${invite.verificationCode}`);
  console.log(`- Encrypted share: ${JSON.stringify(encryptedShare)}`);
}

// Store the owner's plain share securely!
console.log('BACKUP YOUR SHARE:', setupResult.ownerPlainShares[0]);
```

### Normal Operation (Owner + Guardian)

```typescript
// Owner unlocks their share
wallet.unlockOwnerShares('owner-password');

// If needed, add a guardian's share for threshold
// (In this example, owner has 1 share, threshold is 3, so need 2 more)
wallet.addGuardianShare(guardianEncryptedShare, 'guardian-share-password');
wallet.addGuardianShare(anotherGuardianShare, 'another-password');

// Now can sign
if (wallet.canSign()) {
  const signature = await wallet.signMessage('Authorized transaction');
}

// Lock when done
wallet.lock();
```

### Recovery Flow (When Owner Loses Access)

```typescript
// Step 1: Someone initiates recovery
const recoveryRequest = wallet.initiateRecovery({
  initiator: 'new-email@example.com',
  reason: 'Lost phone with wallet access',
});

console.log('Recovery request ID:', recoveryRequest.id);
console.log('Status:', recoveryRequest.status); // 'pending'

// Step 2: Guardians approve and provide shares
// (Each guardian decrypts their share and provides it)
wallet.addRecoveryApproval(recoveryRequest.id, 'guardian-1-id', 'decrypted-share-1');
wallet.addRecoveryApproval(recoveryRequest.id, 'guardian-2-id', 'decrypted-share-2');
wallet.addRecoveryApproval(recoveryRequest.id, 'guardian-3-id', 'decrypted-share-3');

// Step 3: After threshold reached, timelock starts
const request = wallet.getPendingRecovery();
console.log('Status:', request.status); // 'approved'
console.log('Timelock expires:', new Date(request.timelockExpiresAt));

// Step 4: Wait for timelock (48 hours by default)
// This gives the original owner time to cancel if it's fraudulent

// Step 5: After timelock, execute recovery
if (wallet.isRecoveryReady(recoveryRequest.id)) {
  const recoveredPrivateKey = wallet.executeRecovery(recoveryRequest.id);
  console.log('Recovered key:', recoveredPrivateKey);
  // Use this key to set up a new wallet
}

// OR: Original owner cancels fraudulent recovery
wallet.cancelRecovery(recoveryRequest.id);
```

---

## Architecture

### Share Distribution Models

#### Model 1: Owner + Guardians

```
Total: 5 shares, Threshold: 3, Owner shares: 1

Owner: 1 share (encrypted on device)
Guardian 1: 1 share (encrypted, stored by guardian)
Guardian 2: 1 share
Guardian 3: 1 share
Guardian 4: 1 share

Normal signing: Owner (1) + any 2 guardians (2) = 3 ✓
Recovery: Any 3 guardians = 3 ✓
```

#### Model 2: Multi-Device Owner

```
Total: 3 shares, Threshold: 2, Owner shares: 3

Device 1 (phone): 1 share
Device 2 (laptop): 1 share
Device 3 (cloud backup): 1 share

Signing: Any 2 devices = 2 ✓
Lost one device: Other 2 still work ✓
```

#### Model 3: High Security

```
Total: 7 shares, Threshold: 5, Owner shares: 2

Owner device 1: 1 share
Owner device 2: 1 share
Guardian 1: 1 share
Guardian 2: 1 share
Guardian 3: 1 share
Guardian 4: 1 share
Guardian 5: 1 share

Signing: Owner (2) + any 3 guardians (3) = 5 ✓
Recovery: Any 5 guardians = 5 ✓ (harder to collude)
```

### Security Considerations

1. **Threshold Selection**
   - Higher threshold = more security, less convenience
   - Lower threshold = easier to use, but easier to compromise
   - Recommend: `threshold >= (totalShares / 2) + 1`

2. **Guardian Selection**
   - Choose trusted individuals who won't collude
   - Geographic and social diversity
   - Mix of relationships (family, friends, professionals)

3. **Timelock Protection**
   - Recovery attempts trigger timelock (default 48 hours)
   - Original owner can cancel during this period
   - Prevents quick attacks even if guardians are compromised

4. **Share Storage**
   - Owner shares: Encrypted on device + cloud backup
   - Guardian shares: Encrypted, stored by guardian
   - Never store all shares in one location

---

## API Reference

### @panoplia/mpc

#### `splitSecret(secret, totalShares, threshold)`

Split a secret using Shamir's Secret Sharing.

```typescript
import { splitSecret } from '@panoplia/mpc';

const shares = splitSecret(
  '0123456789abcdef...', // 64 hex chars (256-bit private key)
  5,                      // total shares
  3                       // threshold
);
// Returns: Share[] with { x: number, y: string }
```

#### `combineShares(shares)`

Reconstruct the secret from shares.

```typescript
import { combineShares } from '@panoplia/mpc';

const secret = combineShares(shares.slice(0, 3)); // Any 3 shares
```

#### `MPCWallet`

Main class for MPC wallet operations.

```typescript
import { MPCWallet } from '@panoplia/mpc';

// Create new wallet
const result = MPCWallet.create(config, passwords);

// Or import existing key
const result = MPCWallet.importKey(privateKey, config, passwords);

// Use wallet
const wallet = new MPCWallet();
wallet.loadState(result.state);
wallet.addShare(encryptedShare, password);
await wallet.signMessage(message);
wallet.clearShares();
```

### @panoplia/social-recovery

#### `SocialRecoveryWallet`

Complete social recovery solution.

```typescript
import { SocialRecoveryWallet } from '@panoplia/social-recovery';

const wallet = new SocialRecoveryWallet({
  totalShares: 5,
  threshold: 3,
  ownerShares: 1,
  timelockHours: 48,
});

// Setup
const result = await wallet.setup(ownerPassword, guardianInfo);

// Normal use
wallet.unlockOwnerShares(password);
wallet.addGuardianShare(share, password);
await wallet.signMessage(message);
wallet.lock();

// Recovery
wallet.initiateRecovery({ initiator, reason });
wallet.addRecoveryApproval(requestId, guardianId, shareValue);
wallet.executeRecovery(requestId);
```

#### `GuardianManager`

Manage guardians independently.

```typescript
import { GuardianManager } from '@panoplia/social-recovery';

const manager = new GuardianManager();

// Add guardian
const guardian = manager.addGuardian({
  name: 'Mom',
  contact: 'mom@email.com',
  contactType: 'email',
  shareIndex: 2,
});

// Create invite
const invite = manager.createInvite({
  guardianId: guardian.id,
  walletAddress: '0x...',
  ownerName: 'John',
  threshold: 3,
  totalGuardians: 4,
  encryptedShare: '...',
});

// Process response
manager.processResponse({
  inviteId: invite.id,
  guardianId: guardian.id,
  accepted: true,
  verificationCode: invite.verificationCode,
  respondedAt: Date.now(),
});
```

#### `RecoveryManager`

Manage recovery requests independently.

```typescript
import { RecoveryManager } from '@panoplia/social-recovery';

const manager = new RecoveryManager({
  timelockHours: 48,
  expirationDays: 7,
  cooldownHours: 24,
});

// Initiate
const request = manager.initiateRecovery({
  walletAddress: '0x...',
  keyId: '...',
  initiator: 'user@email.com',
  reason: 'Lost device',
  threshold: 3,
});

// Add approvals
manager.addApproval(request.id, { guardianId, shareIndex, shareValue });

// Check status
manager.isReadyForExecution(request.id);
manager.getTimelockRemaining(request.id);
manager.getApprovalProgress(request.id);

// Execute or cancel
manager.executeRecovery(request.id);
manager.cancelRecovery(request.id);
```

---

## Integration Examples

### With React

```tsx
import { useState } from 'react';
import { SocialRecoveryWallet } from '@panoplia/social-recovery';

function MPCWalletSetup() {
  const [wallet] = useState(() => new SocialRecoveryWallet({
    totalShares: 5,
    threshold: 3,
    ownerShares: 1,
  }));
  const [step, setStep] = useState<'setup' | 'guardians' | 'done'>('setup');
  const [invites, setInvites] = useState<any[]>([]);

  const handleSetup = async (password: string, guardians: any[]) => {
    const result = await wallet.setup(password, guardians);
    setInvites(result.guardianInvites);
    setStep('guardians');
  };

  const handleComplete = () => {
    // Save wallet state
    const data = wallet.exportData();
    localStorage.setItem('mpc-wallet', data);
    setStep('done');
  };

  // ... render UI for each step
}
```

### With Local Wallet (Upgrade Existing)

```typescript
import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';
import { SocialRecoveryWallet } from '@panoplia/social-recovery';

// Get private key from existing wallet
const localWallet = LocalWallet.create(createIndexedDBStorage());
await localWallet.unlock('password');
const mnemonic = await localWallet.exportMnemonic('password');
const privateKey = deriveAccount(mnemonic, 0).privateKey;

// Upgrade to social recovery
const socialWallet = new SocialRecoveryWallet();
const result = await socialWallet.importKey(privateKey, 'new-password', guardians);

// Same address, now with MPC + social recovery
console.log(socialWallet.getAddress()); // Same as before
```

---

## Best Practices

### Guardian Selection

1. **Diversity**: Choose guardians from different social circles
2. **Reliability**: Pick people who will respond when needed
3. **Security**: Choose people who understand the importance of keeping shares safe
4. **Communication**: Ensure you can reach them through multiple channels

### Share Management

1. **Owner shares**: Keep encrypted backups in multiple locations
2. **Guardian shares**: Help guardians store shares securely
3. **Regular checks**: Periodically verify guardians still have their shares
4. **Rotation**: Update guardians if relationships change

### Recovery Preparedness

1. **Test recovery**: Do a test recovery with guardians
2. **Document process**: Write down recovery steps for guardians
3. **Emergency contacts**: Keep guardian contact info in multiple places
4. **Update info**: Keep guardian contact information current

### Security Hardening

1. **Strong passwords**: Use unique, strong passwords for each share
2. **2FA for guardians**: Encourage guardians to protect their shares with 2FA
3. **Timelock**: Don't reduce timelock below 24 hours
4. **Monitor**: Set up alerts for recovery attempts
