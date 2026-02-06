import { useWalletContext } from '../context.js';

/**
 * Hook to access the wallet instance and state
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { wallet, isLocked, unlock, lock } = useWallet();
 *
 *   if (isLocked) {
 *     return <UnlockForm onUnlock={unlock} />;
 *   }
 *
 *   return <WalletDashboard />;
 * }
 * ```
 */
export function useWallet() {
  const {
    wallet,
    state,
    isInitialized,
    isLocked,
    isLoading,
    error,
    unlock,
    lock,
    createWallet,
    importWallet,
  } = useWalletContext();

  return {
    /** The wallet instance (LocalWallet or CloudWallet) */
    wallet,
    /** Current wallet state: 'uninitialized' | 'locked' | 'unlocked' */
    state,
    /** Whether a wallet has been created/imported */
    isInitialized,
    /** Whether the wallet is currently locked */
    isLocked,
    /** Whether an async operation is in progress */
    isLoading,
    /** Last error that occurred, if any */
    error,
    /** Unlock the wallet with password */
    unlock,
    /** Lock the wallet (clear sensitive data from memory) */
    lock,
    /** Create a new wallet with password, returns mnemonic for backup */
    createWallet,
    /** Import existing wallet from mnemonic phrase */
    importWallet,
  };
}
