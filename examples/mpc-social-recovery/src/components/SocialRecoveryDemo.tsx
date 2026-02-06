import { useState } from 'react';
import {
  SocialRecoveryWallet,
  type SetupResult,
} from '@panoplia/social-recovery';

interface GuardianInput {
  name: string;
  contact: string;
  sharePassword: string;
}

export function SocialRecoveryDemo() {
  const [step, setStep] = useState<'config' | 'guardians' | 'complete'>('config');
  const [wallet, setWallet] = useState<SocialRecoveryWallet | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Config state
  const [totalShares, setTotalShares] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [ownerShares, setOwnerShares] = useState(1);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [timelockHours, setTimelockHours] = useState(48);

  // Guardian state
  const [guardians, setGuardians] = useState<GuardianInput[]>([
    { name: '', contact: '', sharePassword: '' },
    { name: '', contact: '', sharePassword: '' },
    { name: '', contact: '', sharePassword: '' },
    { name: '', contact: '', sharePassword: '' },
  ]);

  // Signing state
  const [message, setMessage] = useState('Hello from Social Recovery Wallet!');
  const [signature, setSignature] = useState('');
  const [selectedGuardianShares, setSelectedGuardianShares] = useState<number[]>([]);
  const [guardianPasswords, setGuardianPasswords] = useState<string[]>([]);
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);

  const guardianCount = totalShares - ownerShares;

  const handleConfigSubmit = () => {
    if (ownerPassword.length < 4) {
      setError('Owner password must be at least 4 characters');
      return;
    }

    // Adjust guardians array to match count
    setGuardians(
      Array.from({ length: guardianCount }, (_, i) =>
        guardians[i] || { name: '', contact: '', sharePassword: '' }
      )
    );
    setGuardianPasswords(new Array(guardianCount).fill(''));
    setError('');
    setStep('guardians');
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Validate guardian inputs
      for (let i = 0; i < guardians.length; i++) {
        const g = guardians[i];
        if (!g.name || !g.contact || !g.sharePassword) {
          throw new Error(`Please fill in all fields for Guardian ${i + 1}`);
        }
        if (g.sharePassword.length < 4) {
          throw new Error(`Guardian ${i + 1} password must be at least 4 characters`);
        }
      }

      const socialWallet = new SocialRecoveryWallet({
        totalShares,
        threshold,
        ownerShares,
        timelockHours,
      });

      const result = await socialWallet.setup(
        ownerPassword,
        guardians.map((g) => ({
          name: g.name,
          contact: g.contact,
          contactType: 'email' as const,
          sharePassword: g.sharePassword,
        }))
      );

      setWallet(socialWallet);
      setSetupResult(result);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockOwner = () => {
    if (!wallet) return;

    try {
      const success = wallet.unlockOwnerShares(ownerPassword);
      if (success) {
        setOwnerUnlocked(true);
        setError('');
      } else {
        setError('Failed to unlock owner share - incorrect password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
    }
  };

  const handleAddGuardianShare = (index: number) => {
    if (!wallet || !setupResult) return;

    const password = guardianPasswords[index];
    if (!password) {
      setError('Please enter the guardian password');
      return;
    }

    try {
      const success = wallet.addGuardianShare(
        setupResult.guardianInvites[index].encryptedShare,
        password
      );
      if (success) {
        setSelectedGuardianShares([...selectedGuardianShares, index]);
        setError('');
      } else {
        setError('Failed to add guardian share - incorrect password');
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

  const handleLock = () => {
    if (wallet) {
      wallet.lock();
      setOwnerUnlocked(false);
      setSelectedGuardianShares([]);
      setSignature('');
    }
  };

  const handleReset = () => {
    setStep('config');
    setWallet(null);
    setSetupResult(null);
    setOwnerUnlocked(false);
    setSelectedGuardianShares([]);
    setSignature('');
    setError('');
  };

  const collectedCount = (ownerUnlocked ? ownerShares : 0) + selectedGuardianShares.length;
  const canSign = collectedCount >= threshold;

  const getStepClass = (currentStep: string, targetStep: string, completedSteps: string[]): string => {
    if (currentStep === targetStep) return 'active';
    if (completedSteps.includes(currentStep)) return 'completed';
    return '';
  };

  return (
    <div>
      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step ${getStepClass(step, 'config', ['guardians', 'complete'])}`}>
          <div className="step-number">1</div>
          <span>Configure</span>
        </div>
        <div className="step-line" />
        <div className={`step ${getStepClass(step, 'guardians', ['complete'])}`}>
          <div className="step-number">2</div>
          <span>Guardians</span>
        </div>
        <div className="step-line" />
        <div className={`step ${step === 'complete' ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>Complete</span>
        </div>
      </div>

      {step === 'config' && (
        <div className="card">
          <h2>Configure Social Recovery</h2>
          <p className="info-text" style={{ marginBottom: '1.5rem' }}>
            Set up your wallet with trusted guardians who can help recover your wallet if you lose access.
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
                  if (ownerShares >= val) setOwnerShares(1);
                }}
              >
                {[3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>{n} total shares</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Threshold (Required to Sign)</label>
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

          <div className="form-row">
            <div className="form-group">
              <label>Owner Shares</label>
              <select
                value={ownerShares}
                onChange={(e) => setOwnerShares(Number(e.target.value))}
              >
                {Array.from({ length: totalShares - 2 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n} shares for you</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Recovery Timelock</label>
              <select
                value={timelockHours}
                onChange={(e) => setTimelockHours(Number(e.target.value))}
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>1 week</option>
              </select>
            </div>
          </div>

          <div className="message-box message-info">
            <strong>Configuration Summary:</strong><br />
            - You keep {ownerShares} share(s)<br />
            - {totalShares - ownerShares} guardians needed<br />
            - {threshold} shares required to sign<br />
            - Normal use: Your share + {threshold - ownerShares} guardian(s)<br />
            - Recovery: {threshold} guardians (after {timelockHours}h timelock)
          </div>

          <div className="form-group">
            <label>Owner Password</label>
            <input
              type="password"
              placeholder="Password to encrypt your share"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
            />
          </div>

          {error && <div className="message-box message-error">{error}</div>}

          <button className="btn btn-primary" onClick={handleConfigSubmit}>
            Continue to Guardian Setup
          </button>
        </div>
      )}

      {step === 'guardians' && (
        <div className="card">
          <h2>Add Guardians</h2>
          <p className="info-text" style={{ marginBottom: '1.5rem' }}>
            Enter information for your {guardianCount} guardians. Each will receive an encrypted share.
          </p>

          {guardians.map((guardian, i) => (
            <div key={i} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Guardian {i + 1}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Mom, Best Friend"
                    value={guardian.name}
                    onChange={(e) => {
                      const newGuardians = [...guardians];
                      newGuardians[i] = { ...guardian, name: e.target.value };
                      setGuardians(newGuardians);
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Contact (Email)</label>
                  <input
                    type="email"
                    placeholder="guardian@email.com"
                    value={guardian.contact}
                    onChange={(e) => {
                      const newGuardians = [...guardians];
                      newGuardians[i] = { ...guardian, contact: e.target.value };
                      setGuardians(newGuardians);
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Share Password (for this guardian)</label>
                <input
                  type="password"
                  placeholder="Password to encrypt this guardian's share"
                  value={guardian.sharePassword}
                  onChange={(e) => {
                    const newGuardians = [...guardians];
                    newGuardians[i] = { ...guardian, sharePassword: e.target.value };
                    setGuardians(newGuardians);
                  }}
                />
              </div>
            </div>
          ))}

          {error && <div className="message-box message-error">{error}</div>}

          <div className="btn-group">
            <button className="btn btn-secondary" onClick={() => setStep('config')}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSetup}
              disabled={loading}
            >
              {loading ? 'Creating Wallet...' : 'Create Social Recovery Wallet'}
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && wallet && setupResult && (
        <>
          <div className="card">
            <h2>Wallet Created Successfully!</h2>
            <div className="wallet-address">
              <strong>Address:</strong> {wallet.getAddress()}
            </div>
            <div className="message-box message-success">
              Your social recovery wallet is ready! Keep your owner password safe and ensure your guardians securely store their share passwords.
            </div>
          </div>

          <div className="card">
            <h2>Guardian Invites</h2>
            <p className="info-text" style={{ marginBottom: '1rem' }}>
              Send these verification codes to your guardians via a secure channel.
            </p>
            <div className="guardian-list">
              {setupResult.guardianInvites.map(({ guardian, invite }) => (
                <div className="guardian-item" key={guardian.id}>
                  <div className="guardian-info">
                    <h4>{guardian.name}</h4>
                    <p>{guardian.contact}</p>
                    <p style={{ color: '#00d9ff', fontFamily: 'monospace' }}>
                      Code: {invite.verificationCode}
                    </p>
                  </div>
                  <span className="status-badge status-pending">Pending</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Test Signing</h2>
            <p className="info-text" style={{ marginBottom: '1rem' }}>
              Unlock your share and {threshold - ownerShares} guardian share(s) to sign.
              Collected: <span className="highlight">{collectedCount}/{threshold}</span>
            </p>

            <div className="share-indicator" style={{ marginBottom: '1rem' }}>
              {Array.from({ length: totalShares }).map((_, i) => {
                const isOwner = i < ownerShares;
                const isCollected = isOwner ? ownerUnlocked : selectedGuardianShares.includes(i - ownerShares);
                return (
                  <div
                    key={i}
                    className={`share-dot ${isCollected ? 'collected' : ''}`}
                    title={isOwner ? 'Owner share' : `Guardian ${i - ownerShares + 1}`}
                  />
                );
              })}
            </div>

            {/* Owner Share */}
            <div className="guardian-item" style={{ marginBottom: '1rem' }}>
              <div className="guardian-info">
                <h4>Your Share</h4>
                <p>Owner share (index 1)</p>
              </div>
              {ownerUnlocked ? (
                <span className="status-badge status-active">Unlocked</span>
              ) : (
                <button className="btn btn-secondary" onClick={handleUnlockOwner}>
                  Unlock
                </button>
              )}
            </div>

            {/* Guardian Shares */}
            <h3 style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>Guardian Shares</h3>
            <div className="guardian-list">
              {setupResult.guardianInvites.map(({ guardian }, i) => (
                <div className="guardian-item" key={guardian.id}>
                  <div className="guardian-info">
                    <h4>{guardian.name}</h4>
                    <p>Share index: {guardian.shareIndex}</p>
                  </div>
                  {selectedGuardianShares.includes(i) ? (
                    <span className="status-badge status-active">Unlocked</span>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder="Password"
                        value={guardianPasswords[i] || ''}
                        onChange={(e) => {
                          const newPasswords = [...guardianPasswords];
                          newPasswords[i] = e.target.value;
                          setGuardianPasswords(newPasswords);
                        }}
                        style={{ width: '150px' }}
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAddGuardianShare(i)}
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <div className="message-box message-error" style={{ marginTop: '1rem' }}>{error}</div>}

            <div className="demo-section">
              <div className="form-group">
                <label>Message to Sign</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="btn-group">
                <button className="btn btn-secondary" onClick={handleLock}>
                  Lock Wallet
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSign}
                  disabled={!canSign || loading}
                >
                  {loading ? 'Signing...' : canSign ? 'Sign Message' : `Need ${threshold - collectedCount} more`}
                </button>
              </div>

              {signature && (
                <div className="signature-result">
                  <h4>Signature</h4>
                  <div className="code-block">{signature}</div>
                </div>
              )}
            </div>
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
