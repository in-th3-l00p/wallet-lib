import { useCallback, useState } from 'react';
import type { TransactionRequest, TransactionResponse } from 'ethers';
import { getTransactionUrl } from '@panoplia/core';
import { useWalletContext } from '../context.js';

/**
 * Transaction state
 */
export type TransactionStatus = 'idle' | 'pending' | 'confirming' | 'confirmed' | 'failed';

/**
 * Hook result for transaction operations
 */
export interface UseTransactionResult {
  /** Send a transaction */
  sendTransaction: (tx: TransactionRequest) => Promise<TransactionResponse | null>;
  /** Current transaction status */
  status: TransactionStatus;
  /** Transaction hash (after sending) */
  txHash: string | null;
  /** Transaction response (after sending) */
  txResponse: TransactionResponse | null;
  /** Error if transaction failed */
  error: Error | null;
  /** Whether transaction is in progress */
  isPending: boolean;
  /** Block explorer URL for the transaction */
  explorerUrl: string | null;
  /** Reset state for a new transaction */
  reset: () => void;
}

/**
 * Hook for sending transactions
 *
 * @example
 * ```tsx
 * function SendForm() {
 *   const { sendTransaction, status, txHash, error, explorerUrl } = useTransaction();
 *   const [to, setTo] = useState('');
 *   const [amount, setAmount] = useState('');
 *
 *   const handleSend = async () => {
 *     await sendTransaction({
 *       to,
 *       value: parseEther(amount),
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <input value={to} onChange={e => setTo(e.target.value)} placeholder="To address" />
 *       <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
 *       <button onClick={handleSend} disabled={status === 'pending'}>
 *         {status === 'pending' ? 'Sending...' : 'Send'}
 *       </button>
 *       {txHash && <a href={explorerUrl}>View on Explorer</a>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransaction(): UseTransactionResult {
  const { wallet, chainId, isLocked } = useWalletContext();

  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txResponse, setTxResponse] = useState<TransactionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setTxHash(null);
    setTxResponse(null);
    setError(null);
  }, []);

  const sendTransaction = useCallback(
    async (tx: TransactionRequest): Promise<TransactionResponse | null> => {
      if (!wallet || isLocked) {
        setError(new Error('Wallet is locked'));
        setStatus('failed');
        return null;
      }

      try {
        setStatus('pending');
        setError(null);
        setTxHash(null);
        setTxResponse(null);

        const response = await wallet.sendTransaction(tx);
        setTxHash(response.hash);
        setTxResponse(response);
        setStatus('confirming');

        // Wait for confirmation (optional - can be removed if you want faster feedback)
        // Uncomment the following to wait for 1 confirmation:
        // await response.wait(1);
        // setStatus('confirmed');

        return response;
      } catch (err) {
        const txError = err instanceof Error ? err : new Error('Transaction failed');
        setError(txError);
        setStatus('failed');
        return null;
      }
    },
    [wallet, isLocked]
  );

  const explorerUrl = txHash ? getTransactionUrl(chainId, txHash) ?? null : null;

  return {
    sendTransaction,
    status,
    txHash,
    txResponse,
    error,
    isPending: status === 'pending' || status === 'confirming',
    explorerUrl,
    reset,
  };
}
