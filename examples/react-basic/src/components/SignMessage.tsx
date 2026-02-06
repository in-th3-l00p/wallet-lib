import { useState } from 'react';
import { useSignMessage } from '@panoplia/react';

export function SignMessage() {
  const { signMessage, signature, status, error, reset } = useSignMessage();
  const [message, setMessage] = useState('');

  const handleSign = async () => {
    if (!message.trim()) return;
    await signMessage(message);
  };

  const handleReset = () => {
    reset();
    setMessage('');
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Sign Message</h3>
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Sign a message to prove you own this address. This doesn't cost any gas.
      </p>

      <textarea
        placeholder="Enter message to sign..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
      />

      {error && <div className="error">{error.message}</div>}

      <button
        onClick={handleSign}
        disabled={status === 'signing' || !message.trim()}
      >
        {status === 'signing' ? 'Signing...' : 'Sign Message'}
      </button>

      {signature && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>
            Signature:
          </div>
          <div
            className="address"
            style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}
          >
            {signature}
          </div>
          <button
            className="secondary"
            style={{ marginTop: 8 }}
            onClick={() => navigator.clipboard.writeText(signature)}
          >
            Copy Signature
          </button>
          <button className="secondary" style={{ marginTop: 8 }} onClick={handleReset}>
            Sign Another
          </button>
        </div>
      )}
    </div>
  );
}
