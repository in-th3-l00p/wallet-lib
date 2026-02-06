# Security Best Practices

## Overview

Panoplia Wallet SDK is designed with security as a top priority. This document outlines the security model and best practices for using the SDK safely.

## Encryption Model

### Key Derivation

User passwords are transformed into encryption keys using **scrypt**:

```
Password → scrypt(N=2^18, r=8, p=1) → 256-bit Key
```

Parameters:
- **N=2^18**: ~262,144 iterations (CPU/memory cost)
- **r=8**: Block size
- **p=1**: Parallelization factor
- **dkLen=32**: 256-bit output key

This configuration provides:
- ~1 second derivation time on modern hardware
- Resistance to brute-force attacks
- Resistance to GPU/ASIC attacks (memory-hard)

### Symmetric Encryption

Sensitive data is encrypted using **NaCl secretbox** (XSalsa20-Poly1305):

- **Algorithm**: XSalsa20 stream cipher
- **Authentication**: Poly1305 MAC
- **Nonce**: 24 bytes, randomly generated per encryption
- **Key**: 256 bits (from scrypt)

This provides:
- Authenticated encryption (integrity + confidentiality)
- No padding oracle attacks
- Fast encryption/decryption

### What Gets Encrypted

| Data | Encrypted? | Storage |
|------|------------|---------|
| Mnemonic phrase | ✅ Yes | IndexedDB |
| Private keys | Never stored | Derived on-demand |
| Account metadata | ❌ No | IndexedDB |
| Password verification | ✅ Yes | IndexedDB |

## Security Recommendations

### 1. Password Requirements

Enforce strong passwords in your application:

```typescript
function validatePassword(password: string): boolean {
  // Minimum 12 characters
  if (password.length < 12) return false;

  // Mix of character types
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  return hasUpper && hasLower && hasNumber && hasSpecial;
}
```

### 2. Mnemonic Handling

**CRITICAL**: The mnemonic phrase is the master key to all funds.

```typescript
// ✅ DO: Show mnemonic only once during creation
const { mnemonic, account } = await wallet.generateWallet(password);
showMnemonicBackupScreen(mnemonic);  // User must write it down
// Clear mnemonic from any state after user confirms backup

// ❌ DON'T: Store mnemonic in application state
const [mnemonic, setMnemonic] = useState(''); // NEVER DO THIS

// ❌ DON'T: Log mnemonics
console.log(mnemonic);  // NEVER DO THIS

// ❌ DON'T: Send mnemonic to analytics/error tracking
Sentry.captureMessage(mnemonic);  // NEVER DO THIS
```

### 3. Export Functionality

If you allow mnemonic export, add friction:

```typescript
function ExportMnemonic() {
  const [step, setStep] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  // Step 1: Warning
  if (step === 1) {
    return (
      <div>
        <h2>⚠️ Security Warning</h2>
        <p>Your seed phrase gives full access to your wallet.</p>
        <p>Never share it with anyone.</p>
        <p>Never enter it on any website.</p>
        <label>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I understand the risks
        </label>
        <button disabled={!confirmed} onClick={() => setStep(2)}>
          Continue
        </button>
      </div>
    );
  }

  // Step 2: Password verification
  // Step 3: Show mnemonic (briefly, with copy button)
}
```

### 4. Auto-Lock

Always enable auto-lock in production:

```tsx
<WalletProvider
  autoLockTimeoutMs={5 * 60 * 1000}  // 5 minutes
>
```

Consider shorter timeouts for high-value wallets.

### 5. Rate Limiting

Implement rate limiting for unlock attempts:

```typescript
const unlockAttempts = useRef(0);
const lockoutUntil = useRef(0);

async function handleUnlock(password: string) {
  // Check if locked out
  if (Date.now() < lockoutUntil.current) {
    const remaining = Math.ceil((lockoutUntil.current - Date.now()) / 1000);
    alert(`Too many attempts. Try again in ${remaining} seconds.`);
    return;
  }

  const success = await unlock(password);

  if (!success) {
    unlockAttempts.current++;

    // Exponential backoff
    if (unlockAttempts.current >= 5) {
      const lockoutSeconds = Math.pow(2, unlockAttempts.current - 4) * 30;
      lockoutUntil.current = Date.now() + lockoutSeconds * 1000;
    }
  } else {
    unlockAttempts.current = 0;
  }
}
```

### 6. Transaction Verification

Always show transaction details before signing:

```typescript
function TransactionConfirmation({ tx, onConfirm, onCancel }) {
  return (
    <div>
      <h3>Confirm Transaction</h3>
      <p><strong>To:</strong> {tx.to}</p>
      <p><strong>Amount:</strong> {formatEther(tx.value)} ETH</p>
      <p><strong>Gas:</strong> {tx.gasLimit?.toString()}</p>
      <p><strong>Network:</strong> {chain.name}</p>

      <button onClick={onCancel}>Cancel</button>
      <button onClick={onConfirm}>Confirm</button>
    </div>
  );
}
```

### 7. Input Validation

Validate all addresses before use:

```typescript
import { isAddress, getAddress } from 'ethers';

function validateAndNormalizeAddress(input: string): string | null {
  if (!isAddress(input)) {
    return null;
  }
  return getAddress(input);  // Checksummed
}
```

### 8. Phishing Protection

Warn users about phishing:

```typescript
// Show domain prominently
function WalletHeader() {
  return (
    <header>
      <span className="domain-badge">
        🔒 {window.location.hostname}
      </span>
    </header>
  );
}

// Warn on suspicious origins
if (!['yourdomain.com', 'localhost'].includes(window.location.hostname)) {
  alert('Warning: You may be on a phishing site!');
}
```

### 9. Content Security Policy

If you control the deployment, set strict CSP headers:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  connect-src 'self' https://*.infura.io https://*.alchemy.com;
  style-src 'self' 'unsafe-inline';
```

### 10. HTTPS Only

Never deploy wallet applications over HTTP:

```typescript
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.href = location.href.replace('http:', 'https:');
}
```

## Known Limitations

### Browser Environment

1. **No hardware security**: Web apps cannot access Secure Enclave, TPM, or other hardware security modules.

2. **Memory not protected**: JavaScript cannot guarantee that sensitive data is cleared from memory (garbage collection is non-deterministic).

3. **Extensions can intercept**: Malicious browser extensions may be able to read page content.

### Mitigations

For higher security requirements, consider:

1. **Hardware wallets**: Integrate with Ledger/Trezor via WalletConnect
2. **Desktop apps**: Use Electron with system keychain (Keytar)
3. **Biometrics**: Plan to add WebAuthn support for additional authentication factor

## Security Checklist

Before deploying a wallet application:

- [ ] Passwords are validated for strength
- [ ] Mnemonic is shown only once and never stored in state
- [ ] Auto-lock is enabled with appropriate timeout
- [ ] Unlock attempts are rate-limited
- [ ] All transactions require explicit user confirmation
- [ ] Addresses are validated before use
- [ ] HTTPS is enforced
- [ ] CSP headers are configured
- [ ] No sensitive data in logs or analytics
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are audited and up-to-date

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to the maintainers
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Cryptographic Libraries

The SDK uses audited, well-maintained libraries:

| Library | Purpose | Audits |
|---------|---------|--------|
| tweetnacl | NaCl secretbox encryption | [Multiple audits](https://github.com/nicehash/tweetnacl-js#audits) |
| @noble/hashes | scrypt key derivation | [Trail of Bits audit](https://github.com/paulmillr/noble-hashes#security) |
| ethers.js | Ethereum operations | Battle-tested, widely used |

## Further Reading

- [BIP-39: Mnemonic code for generating deterministic keys](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [BIP-44: Multi-Account Hierarchy for Deterministic Wallets](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [NaCl: Networking and Cryptography library](https://nacl.cr.yp.to/)
- [scrypt: Password-Based Key Derivation Function](https://www.tarsnap.com/scrypt.html)
