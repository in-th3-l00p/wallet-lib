import { useState } from 'react';
import { useWallet } from '@panoplia/react';

export function UnlockWallet() {
  const { unlock } = useWallet();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnlocking(true);

    try {
      const success = await unlock(password);
      if (!success) {
        setError('Incorrect password');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to unlock');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div>
      <h2>Welcome Back</h2>
      <div className="card">
        <p>Enter your password to unlock your wallet.</p>

        <form onSubmit={handleUnlock}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={isUnlocking || !password}>
            {isUnlocking ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
