import { useCallback, useState } from 'react';
import type { TypedDataDomain } from 'ethers';
import type { TypedDataTypes } from '@panoplia/core';
import { useWalletContext } from '../context.js';

/**
 * Signature state
 */
export type SignatureStatus = 'idle' | 'signing' | 'signed' | 'failed';

/**
 * Hook for signing messages and typed data
 *
 * @example
 * ```tsx
 * function SignMessageForm() {
 *   const { signMessage, signature, status, error } = useSignMessage();
 *   const [message, setMessage] = useState('');
 *
 *   const handleSign = async () => {
 *     await signMessage(message);
 *   };
 *
 *   return (
 *     <div>
 *       <textarea value={message} onChange={e => setMessage(e.target.value)} />
 *       <button onClick={handleSign} disabled={status === 'signing'}>
 *         {status === 'signing' ? 'Signing...' : 'Sign Message'}
 *       </button>
 *       {signature && <code>{signature}</code>}
 *       {error && <p>Error: {error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSignMessage() {
  const { wallet, isLocked } = useWalletContext();

  const [status, setStatus] = useState<SignatureStatus>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setSignature(null);
    setError(null);
  }, []);

  /**
   * Sign a personal message (EIP-191)
   */
  const signMessage = useCallback(
    async (message: string | Uint8Array): Promise<string | null> => {
      if (!wallet || isLocked) {
        setError(new Error('Wallet is locked'));
        setStatus('failed');
        return null;
      }

      try {
        setStatus('signing');
        setError(null);
        setSignature(null);

        const sig = await wallet.signMessage(message);
        setSignature(sig);
        setStatus('signed');
        return sig;
      } catch (err) {
        const sigError = err instanceof Error ? err : new Error('Signing failed');
        setError(sigError);
        setStatus('failed');
        return null;
      }
    },
    [wallet, isLocked]
  );

  /**
   * Sign typed data (EIP-712)
   */
  const signTypedData = useCallback(
    async (
      domain: TypedDataDomain,
      types: TypedDataTypes,
      value: Record<string, unknown>
    ): Promise<string | null> => {
      if (!wallet || isLocked) {
        setError(new Error('Wallet is locked'));
        setStatus('failed');
        return null;
      }

      try {
        setStatus('signing');
        setError(null);
        setSignature(null);

        const sig = await wallet.signTypedData(domain, types, value);
        setSignature(sig);
        setStatus('signed');
        return sig;
      } catch (err) {
        const sigError = err instanceof Error ? err : new Error('Signing failed');
        setError(sigError);
        setStatus('failed');
        return null;
      }
    },
    [wallet, isLocked]
  );

  return {
    /** Sign a personal message (EIP-191) */
    signMessage,
    /** Sign typed data (EIP-712) */
    signTypedData,
    /** Current signing status */
    status,
    /** Signature result (after signing) */
    signature,
    /** Error if signing failed */
    error,
    /** Whether signing is in progress */
    isSigning: status === 'signing',
    /** Reset state for a new signature */
    reset,
  };
}
