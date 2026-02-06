import { useState } from 'react';
import {
  MPCWallet,
  type EncryptedKeyShare,
  type MPCWalletState,
} from '@panoplia/mpc';

interface WalletData {
  state: MPCWalletState;
  encryptedShares: EncryptedKeyShare[];
}

export function MPCWalletDemo() {
  const [step, setStep] = useState<'create' | 'sign'>('create');
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [passwords, setPasswords] = useState(['', '', '', '', '']);
  const [threshold, setThreshold] = useState(3);
  const [totalShares, setTotalShares] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Signing state
  const [wallet, setWallet] = useState<MPCWallet | null>(null);
  const [collectedCount, setCollectedCount] = useState(0);
  const [unlockPasswords, setUnlockPasswords] = useState<string[]>([]);
  const [selectedShares, setSelectedShares] = useState<number[]>([]);
  const [message, setMessage] = useState('Hello, MPC World!');
  const [signature, setSignature] = useState('');

  const handleCreateWallet = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate passwords
      const validPasswords = passwords.slice(0, totalShares);
      if (validPasswords.some((p) => p.length < 4)) {
        throw new Error('All passwords must be at least 4 characters');
      }

      // Create MPC wallet
      const result = MPCWallet.create(
        { totalShares, threshold },
        validPasswords
      );

      setWalletData({
        state: result.state,
        encryptedShares: result.encryptedShares,
      });

      // Initialize wallet for signing
      const mpcWallet = new MPCWallet();
      mpcWallet.loadState(result.state);
      setWallet(mpcWallet);
      setUnlockPasswords(new Array(totalShares).fill(''));
      setSelectedShares([]);
      setCollectedCount(0);

      setStep('sign');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShare = (index: number) => {
    if (!wallet || !walletData) return;

    const password = unlockPasswords[index];
    if (!password) {
      setError('Please enter the password for this share');
      return;
    }

    try {
      const success = wallet.addShare(walletData.encryptedShares[index], password);
      if (success) {
        setSelectedShares([...selectedShares, index]);
        setCollectedCount(wallet.getCollectedShareCount());
        setError('');
      } else {
        setError('Failed to unlock share - incorrect password or already added');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add share');
    }
  };

  const handleSign = async () => {
    if (!wallet) return;

    setLoading(true);
    setError('');

    try {
      const sig = await wallet.signMessage(message);
      setSignature(sig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign');
    } finally {
      setLoading(false);
    }
  };

  const handleClearShares = () => {
    if (wallet) {
      wallet.clearShares();
      setCollectedCount(0);
      setSelectedShares([]);
      setSignature('');
    }
  };

  const handleReset = () => {
    setStep('create');
    setWalletData(null);
    setWallet(null);
    setCollectedCount(0);
    setSelectedShares([]);
    setSignature('');
    setError('');
  };

  return (
    <div>
      {step === 'create' && (
        <div className="card">
          <h2>Create MPC Wallet</h2>
          <p className="info-text" style={{ marginBottom: '1.5rem' }}>
            Split your private key into multiple shares using Shamir's Secret Sharing.
            You'll need at least <span className="highlight">{threshold} of {totalShares}</span> shares to sign transactions.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Total Shares</label>
              <select
                value={totalShares}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalShares(val);
                  if (threshold > val) setThreshold(val);
                  setPasswords(new Array(val).fill(''));
                }}
              >
                {[3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n} shares</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Threshold (Required)</label>
              <select
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              >
                {Array.from({ length: totalShares - 1 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>{n} shares needed</option>
                ))}
              </select>
            </div>
          </div>

          <h3 style={{ marginTop: '1rem' }}>Share Passwords</h3>
          <p className="info-text" style={{ marginBottom: '1rem' }}>
            Each share will be encrypted with its own password. Keep these safe!
          </p>

          {Array.from({ length: totalShares }).map((_, i) => (
            <div className="form-group" key={i}>
              <label>Share {i + 1} Password</label>
              <input
                type="password"
                placeholder={`Password for share ${i + 1}`}
                value={passwords[i] || ''}
                onChange={(e) => {
                  const newPasswords = [...passwords];
                  newPasswords[i] = e.target.value;
                  setPasswords(newPasswords);
                }}
              />
            </div>
          ))}

          {error && <div className="message-box message-error">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handleCreateWallet}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create MPC Wallet'}
          </button>
        </div>
      )}

      {step === 'sign' && walletData && (
        <>
          <div className="card">
            <h2>MPC Wallet Created</h2>
            <div className="wallet-address">
              <strong>Address:</strong> {walletData.state.address}
            </div>
            <div className="wallet-address">
              <strong>Key ID:</strong> {walletData.state.keyId}
            </div>
            <p className="info-text">
              Configuration: <span className="highlight">{threshold}-of-{totalShares}</span> threshold scheme
            </p>
          </div>

          <div className="card">
            <h2>Collect Shares to Sign</h2>
            <p className="info-text" style={{ marginBottom: '1rem' }}>
              You need to unlock at least <span className="highlight">{threshold}</span> shares to sign.
              Currently have: <span className="highlight">{collectedCount}</span>
            </p>

            <div className="share-indicator">
              {Array.from({ length: totalShares }).map((_, i) => (
                <div
                  key={i}
                  className={`share-dot ${selectedShares.includes(i) ? 'collected' : collectedCount < threshold ? 'needed' : ''}`}
                  title={`Share ${i + 1}`}
                />
              ))}
            </div>

            <div className="guardian-list">
              {walletData.encryptedShares.map((share, i) => (
                <div className="guardian-item" key={i}>
                  <div className="guardian-info">
                    <h4>Share {i + 1}</h4>
                    <p>Index: {share.index}</p>
                  </div>
                  {selectedShares.includes(i) ? (
                    <span className="status-badge status-active">Unlocked</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder="Password"
                        value={unlockPasswords[i] || ''}
                        onChange={(e) => {
                          const newPasswords = [...unlockPasswords];
                          newPasswords[i] = e.target.value;
                          setUnlockPasswords(newPasswords);
                        }}
                        style={{ width: '150px' }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAddShare(i)}
                      >
                        Unlock
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <div className="message-box message-error" style={{ marginTop: '1rem' }}>{error}</div>}

            <div className="btn-group">
              <button className="btn btn-secondary" onClick={handleClearShares}>
                Clear Shares
              </button>
            </div>
          </div>

          <div className="card">
            <h2>Sign Message</h2>
            <div className="form-group">
              <label>Message to Sign</label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter a message to sign"
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSign}
              disabled={!wallet?.canSign() || loading}
            >
              {loading ? 'Signing...' : wallet?.canSign() ? 'Sign Message' : `Need ${threshold - collectedCount} more shares`}
            </button>

            {signature && (
              <div className="signature-result">
                <h4>Signature</h4>
                <div className="code-block">{signature}</div>
              </div>
            )}
          </div>

          <div className="card">
            <button className="btn btn-danger" onClick={handleReset}>
              Reset Demo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
