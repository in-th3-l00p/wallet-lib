import { useState } from 'react';
import { parseEther, isAddress } from 'ethers';
import { useTransaction, useChain } from '@panoplia/react';

export function SendTransaction() {
  const { sendTransaction, status, txHash, error, explorerUrl, reset } = useTransaction();
  const { chain } = useChain();

  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSend = async () => {
    setLocalError('');

    // Validate address
    if (!isAddress(to)) {
      setLocalError('Invalid recipient address');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setLocalError('Invalid amount');
      return;
    }

    try {
      const value = parseEther(amount);
      await sendTransaction({ to, value });
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Transaction failed');
    }
  };

  const handleReset = () => {
    reset();
    setTo('');
    setAmount('');
    setLocalError('');
  };

  if (txHash) {
    return (
      <div className="card">
        <div className="success">
          <strong>Transaction Sent!</strong>
          <p style={{ wordBreak: 'break-all', marginBottom: 8 }}>
            Hash: {txHash}
          </p>
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
              View on {chain?.blockExplorers?.[0]?.name || 'Explorer'} →
            </a>
          )}
        </div>
        <button onClick={handleReset} style={{ marginTop: 16 }}>
          Send Another
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Send {chain?.nativeCurrency.symbol || 'ETH'}</h3>

      <input
        type="text"
        placeholder="Recipient address (0x...)"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />

      <input
        type="text"
        placeholder={`Amount (${chain?.nativeCurrency.symbol || 'ETH'})`}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {(localError || error) && (
        <div className="error">{localError || error?.message}</div>
      )}

      <button
        onClick={handleSend}
        disabled={status === 'pending' || status === 'confirming'}
      >
        {status === 'pending'
          ? 'Sending...'
          : status === 'confirming'
          ? 'Confirming...'
          : 'Send Transaction'}
      </button>
    </div>
  );
}
