import { useState } from 'react';
import { useWallet } from '@panoplia/react';

export function CreateWallet() {
  const { createWallet, importWallet, error } = useWallet();

  const [mode, setMode] = useState<'choose' | 'create' | 'import'>('choose');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [localError, setLocalError] = useState('');
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false);

  const validatePassword = () => {
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    setLocalError('');
    return true;
  };

  const handleCreate = async () => {
    if (!validatePassword()) return;

    setIsCreating(true);
    try {
      const result = await createWallet(password);
      setGeneratedMnemonic(result.mnemonic);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImport = async () => {
    if (!validatePassword()) return;

    if (!mnemonic.trim()) {
      setLocalError('Please enter your seed phrase');
      return;
    }

    setIsCreating(true);
    try {
      await importWallet(mnemonic, password);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Failed to import wallet');
    } finally {
      setIsCreating(false);
    }
  };

  // Show mnemonic backup screen
  if (generatedMnemonic) {
    return (
      <div>
        <div className="mnemonic-display">
          <h3>Your Secret Recovery Phrase</h3>
          <p className="warning">
            Write these words down and store them safely. This is the ONLY way to recover your wallet.
            Never share this with anyone!
          </p>
          <div className="mnemonic-words">{generatedMnemonic}</div>
        </div>

        <label>
          <input
            type="checkbox"
            checked={mnemonicConfirmed}
            onChange={(e) => setMnemonicConfirmed(e.target.checked)}
          />
          {' '}I have written down my recovery phrase
        </label>

        <div style={{ marginTop: 16 }}>
          <button disabled={!mnemonicConfirmed} onClick={() => setGeneratedMnemonic('')}>
            Continue to Wallet
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'choose') {
    return (
      <div>
        <h2>Get Started</h2>
        <div className="card">
          <p>Create a new wallet or import an existing one.</p>
          <button onClick={() => setMode('create')}>Create New Wallet</button>
          <button className="secondary" onClick={() => setMode('import')}>
            Import Existing Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>{mode === 'create' ? 'Create New Wallet' : 'Import Wallet'}</h2>

      {mode === 'import' && (
        <textarea
          placeholder="Enter your 12 or 24 word recovery phrase..."
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          rows={3}
        />
      )}

      <input
        type="password"
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      {(localError || error) && (
        <div className="error">{localError || error?.message}</div>
      )}

      <div style={{ marginTop: 16 }}>
        <button
          onClick={mode === 'create' ? handleCreate : handleImport}
          disabled={isCreating}
        >
          {isCreating ? 'Please wait...' : mode === 'create' ? 'Create Wallet' : 'Import Wallet'}
        </button>
        <button className="secondary" onClick={() => setMode('choose')}>
          Back
        </button>
      </div>
    </div>
  );
}
