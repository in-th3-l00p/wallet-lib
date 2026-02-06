import { useCallback } from 'react';
import { useWalletContext } from '../context.js';

/**
 * Hook to manage wallet accounts
 *
 * @example
 * ```tsx
 * function AccountSelector() {
 *   const { accounts, activeAccount, setActiveAccount, createAccount } = useAccounts();
 *
 *   return (
 *     <div>
 *       <h2>Active: {activeAccount?.name}</h2>
 *       <ul>
 *         {accounts.map(account => (
 *           <li key={account.address} onClick={() => setActiveAccount(account.address)}>
 *             {account.name} - {account.address}
 *           </li>
 *         ))}
 *       </ul>
 *       <button onClick={() => createAccount('New Account')}>Add Account</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAccounts() {
  const {
    accounts,
    activeAccount,
    setActiveAccount,
    createAccount,
    isLocked,
    isLoading,
  } = useWalletContext();

  /**
   * Get account by address
   */
  const getAccount = useCallback(
    (address: string) => {
      return accounts.find((a) => a.address.toLowerCase() === address.toLowerCase());
    },
    [accounts]
  );

  /**
   * Check if an address belongs to this wallet
   */
  const isOwnAddress = useCallback(
    (address: string) => {
      return accounts.some((a) => a.address.toLowerCase() === address.toLowerCase());
    },
    [accounts]
  );

  return {
    /** All accounts in the wallet */
    accounts,
    /** Currently active account */
    activeAccount,
    /** Active account address (convenience) */
    address: activeAccount?.address ?? null,
    /** Number of accounts */
    accountCount: accounts.length,
    /** Set the active account by address */
    setActiveAccount,
    /** Create a new derived account */
    createAccount,
    /** Get account by address */
    getAccount,
    /** Check if an address belongs to this wallet */
    isOwnAddress,
    /** Whether wallet is locked (accounts not available) */
    isLocked,
    /** Whether an operation is in progress */
    isLoading,
  };
}
