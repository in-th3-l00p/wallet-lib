import { useState, useEffect } from 'react';
import {
  SocialRecoveryWallet,
  type SetupResult,
  type RecoveryRequest,
} from '@panoplia/social-recovery';
import { decrypt, deserializePayload } from '@panoplia/core';

export function RecoveryFlowDemo() {
  const [step, setStep] = useState<'setup' | 'initiate' | 'approve' | 'timelock' | 'complete'>('setup');
  const [wallet, setWallet] = useState<SocialRecoveryWallet | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [recoveryRequest, setRecoveryRequest] = useState<RecoveryRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoveredKey, setRecoveredKey] = useState('');

  // Pre-configured guardians for demo
  const demoGuardians = [
    { name: 'Alice', contact: 'alice@example.com', sharePassword: 'alice-pass-123' },
    { name: 'Bob', contact: 'bob@example.com', sharePassword: 'bob-pass-456' },
    { name: 'Carol', contact: 'carol@example.com', sharePassword: 'carol-pass-789' },
    { name: 'David', contact: 'david@example.com', sharePassword: 'david-pass-012' },
  ];

  // Timelock state
  const [timelockRemaining, setTimelockRemaining] = useState(0);

  // Approval tracking
  const [approvedGuardians, setApprovedGuardians] = useState<number[]>([]);

  useEffect(() => {
    if (step === 'timelock' && recoveryRequest && wallet) {
      const interval = setInterval(() => {
        const remaining = wallet.getRecoveryTimelockRemaining(recoveryRequest.id);
        setTimelockRemaining(remaining);

        if (remaining === 0 && wallet.isRecoveryReady(recoveryRequest.id)) {
          setStep('complete');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, recoveryRequest, wallet]);

  const handleQuickSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Create wallet with 0 timelock for demo purposes
      const socialWallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
        timelockHours: 0, // No timelock for demo
        expirationDays: 1,
      });

      const result = await socialWallet.setup(
        'owner-secret-password',
        demoGuardians.map((g) => ({
          name: g.name,
          contact: g.contact,
          contactType: 'email' as const,
          sharePassword: g.sharePassword,
        }))
      );

      setWallet(socialWallet);
      setSetupResult(result);
      setStep('initiate');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateRecovery = () => {
    if (!wallet) return;

    try {
      const request = wallet.initiateRecovery({
        initiator: 'recovery@newdevice.com',
        reason: 'Lost phone with wallet access',
      });
      setRecoveryRequest(request);
      setStep('approve');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate recovery');
    }
  };

  const handleGuardianApprove = (guardianIndex: number) => {
    if (!wallet || !recoveryRequest || !setupResult) return;

    try {
      // Get the guardian info
      const guardian = setupResult.guardianInvites[guardianIndex].guardian;

      // In a real scenario, the guardian would:
      // 1. Receive notification of recovery request
      // 2. Verify it's legitimate
      // 3. Decrypt their share using their password
      // 4. Provide the decrypted share value

      // For this demo, we simulate by decrypting using known passwords
      const shareValue = getDecryptedShareValue(guardianIndex);

      wallet.addRecoveryApproval(
        recoveryRequest.id,
        guardian.id,
        shareValue
      );

      setApprovedGuardians([...approvedGuardians, guardianIndex]);

      // Update recovery request status
      const pending = wallet.getPendingRecovery();
      if (pending) {
        setRecoveryRequest({ ...pending });

        // Check if we've reached threshold
        if (pending.status === 'approved' || pending.status === 'ready') {
          if (wallet.isRecoveryReady(recoveryRequest.id)) {
            setStep('complete');
          } else {
            setStep('timelock');
          }
        }
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add approval');
    }
  };

  // Helper to get decrypted share value for demo
  // In reality, each guardian would decrypt their own share
  const getDecryptedShareValue = (guardianIndex: number): string => {
    if (!setupResult) return '';

    // In a real scenario, each guardian would:
    // 1. Receive notification of recovery request
    // 2. Verify it's legitimate
    // 3. Decrypt their share using their password
    // 4. Provide the decrypted share value

    // For this demo, we simulate by decrypting using known passwords
    const encShare = setupResult.guardianInvites[guardianIndex].encryptedShare;
    const password = demoGuardians[guardianIndex].sharePassword;

    // Decrypt the share (simulating what the guardian would do)
    const payload = deserializePayload(encShare.encryptedShare);
    return decrypt(payload, password);
  };

  const handleExecuteRecovery = () => {
    if (!wallet || !recoveryRequest) return;

    try {
      const key = wallet.executeRecovery(recoveryRequest.id);
      setRecoveredKey(key);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute recovery');
    }
  };

  const handleCancelRecovery = () => {
    if (!wallet || !recoveryRequest) return;

    try {
      wallet.cancelRecovery(recoveryRequest.id);
      setRecoveryRequest(null);
      setApprovedGuardians([]);
      setStep('initiate');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const handleReset = () => {
    setStep('setup');
    setWallet(null);
    setSetupResult(null);
    setRecoveryRequest(null);
    setApprovedGuardians([]);
    setRecoveredKey('');
    setError('');
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const progress = recoveryRequest
    ? wallet?.getRecoveryProgress(recoveryRequest.id)
    : { current: 0, required: 3, percentage: 0 };

  const getStepClass = (currentStep: string, targetStep: string, completedSteps: string[]): string => {
    if (currentStep === targetStep) return 'active';
    if (completedSteps.includes(currentStep)) return 'completed';
    return '';
  };

  return (
    <div>
      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step ${getStepClass(step, 'setup', ['initiate', 'approve', 'timelock', 'complete'])}`}>
          <div className="step-number">1</div>
          <span>Setup</span>
        </div>
        <div className="step-line" />
        <div className={`step ${getStepClass(step, 'initiate', ['approve', 'timelock', 'complete'])}`}>
          <div className="step-number">2</div>
          <span>Initiate</span>
        </div>
        <div className="step-line" />
        <div className={`step ${getStepClass(step, 'approve', ['timelock', 'complete'])}`}>
          <div className="step-number">3</div>
          <span>Approve</span>
        </div>
        <div className="step-line" />
        <div className={`step ${getStepClass(step, 'timelock', ['complete'])}`}>
          <div className="step-number">4</div>
          <span>Timelock</span>
        </div>
        <div className="step-line" />
        <div className={`step ${step === 'complete' ? 'active' : ''}`}>
          <div className="step-number">5</div>
          <span>Recover</span>
        </div>
      </div>

      {step === 'setup' && (
        <div className="card">
          <h2>Recovery Flow Demo</h2>
          <p className="info-text" style={{ marginBottom: '1.5rem' }}>
            This demo simulates the social recovery process when a user loses access to their wallet.
            We'll create a pre-configured wallet with 4 guardians and walk through the recovery flow.
          </p>

          <div className="message-box message-info">
            <strong>Demo Configuration:</strong><br />
            - 5 total shares (1 owner + 4 guardians)<br />
            - 3 shares required for recovery<br />
            - No timelock (for demo purposes)<br />
            - Guardians: Alice, Bob, Carol, David
          </div>

          {error && <div className="message-box message-error">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handleQuickSetup}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Creating Wallet...' : 'Create Demo Wallet'}
          </button>
        </div>
      )}

      {step === 'initiate' && wallet && (
        <div className="card">
          <h2>Wallet Created - Simulate Lost Access</h2>
          <div className="wallet-address">
            <strong>Address:</strong> {wallet.getAddress()}
          </div>

          <div className="message-box message-info">
            <strong>Scenario:</strong> You've lost your phone and can't access your wallet.
            You need to recover using your guardians.
          </div>

          <p className="info-text" style={{ margin: '1rem 0' }}>
            To start the recovery process, you (or someone you trust) needs to initiate a recovery request.
            This will notify your guardians that you need their help.
          </p>

          {error && <div className="message-box message-error">{error}</div>}

          <button className="btn btn-primary" onClick={handleInitiateRecovery}>
            Initiate Recovery Request
          </button>
        </div>
      )}

      {step === 'approve' && recoveryRequest && setupResult && (
        <div className="card">
          <h2>Guardian Approval Phase</h2>
          <p className="info-text" style={{ marginBottom: '1rem' }}>
            Recovery request created! Now guardians need to approve and provide their shares.
            Need <span className="highlight">{progress?.required}</span> approvals.
          </p>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress?.percentage || 0}%` }}
            />
          </div>
          <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            {progress?.current} / {progress?.required} approvals
          </p>

          <h3>Guardians</h3>
          <div className="guardian-list">
            {setupResult.guardianInvites.map(({ guardian }, i) => (
              <div className="guardian-item" key={guardian.id}>
                <div className="guardian-info">
                  <h4>{guardian.name}</h4>
                  <p>{guardian.contact}</p>
                </div>
                {approvedGuardians.includes(i) ? (
                  <span className="status-badge status-approved">Approved</span>
                ) : (
                  <button
                    className="btn btn-success"
                    onClick={() => handleGuardianApprove(i)}
                  >
                    Approve & Share
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <div className="message-box message-error" style={{ marginTop: '1rem' }}>{error}</div>}

          <div className="btn-group" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-danger" onClick={handleCancelRecovery}>
              Cancel Recovery
            </button>
          </div>

          <div className="message-box message-info" style={{ marginTop: '1rem' }}>
            <strong>Note:</strong> In a real scenario, each guardian would receive a notification,
            verify the recovery request, and securely provide their decrypted share.
          </div>
        </div>
      )}

      {step === 'timelock' && recoveryRequest && (
        <div className="card">
          <h2>Timelock Period</h2>
          <p className="info-text" style={{ marginBottom: '1.5rem' }}>
            Threshold reached! The recovery is now in a timelock period.
            This gives the original owner time to cancel if this is a fraudulent attempt.
          </p>

          <div className="timelock-display">
            <h3>Time Remaining</h3>
            <div className="time">
              {timelockRemaining > 0 ? formatTime(timelockRemaining) : 'Ready!'}
            </div>
          </div>

          {timelockRemaining === 0 && (
            <div className="message-box message-success" style={{ marginTop: '1rem' }}>
              Timelock expired! Recovery can now be executed.
            </div>
          )}

          <div className="btn-group" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-danger" onClick={handleCancelRecovery}>
              Cancel (Owner Only)
            </button>
          </div>
        </div>
      )}

      {step === 'complete' && wallet && recoveryRequest && (
        <div className="card">
          <h2>Execute Recovery</h2>
          <p className="info-text" style={{ marginBottom: '1.5rem' }}>
            The timelock has expired and enough guardians have approved.
            You can now recover the private key.
          </p>

          {!recoveredKey ? (
            <>
              <div className="message-box message-info">
                <strong>Warning:</strong> This will combine the guardian shares to reconstruct
                your private key. Make sure you're on a secure device!
              </div>

              {error && <div className="message-box message-error" style={{ marginTop: '1rem' }}>{error}</div>}

              <button
                className="btn btn-primary"
                onClick={handleExecuteRecovery}
                style={{ marginTop: '1rem' }}
              >
                Execute Recovery
              </button>
            </>
          ) : (
            <>
              <div className="message-box message-success">
                Recovery successful! Your private key has been recovered.
              </div>

              <div style={{ marginTop: '1rem' }}>
                <h3>Recovered Private Key</h3>
                <div className="code-block" style={{ color: '#2ed573' }}>
                  0x{recoveredKey}
                </div>
                <p className="info-text" style={{ marginTop: '0.5rem' }}>
                  Use this key to import your wallet into a new device.
                  <strong style={{ color: '#ff4757' }}> Never share this key!</strong>
                </p>
              </div>

              <div className="message-box message-info" style={{ marginTop: '1rem' }}>
                <strong>Next Steps:</strong><br />
                1. Import this key into a new wallet application<br />
                2. Set up new social recovery with the same or new guardians<br />
                3. Securely delete the recovered key from this device
              </div>
            </>
          )}
        </div>
      )}

      {step !== 'setup' && (
        <div className="card">
          <h2>Request Details</h2>
          {recoveryRequest && (
            <div className="code-block">
              {JSON.stringify(
                {
                  id: recoveryRequest.id,
                  status: recoveryRequest.status,
                  initiator: recoveryRequest.initiator,
                  reason: recoveryRequest.reason,
                  approvals: recoveryRequest.approvals.length,
                  threshold: recoveryRequest.threshold,
                  createdAt: new Date(recoveryRequest.createdAt).toISOString(),
                },
                null,
                2
              )}
            </div>
          )}
          <button className="btn btn-danger" onClick={handleReset} style={{ marginTop: '1rem' }}>
            Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}
