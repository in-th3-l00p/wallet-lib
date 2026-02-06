import { useState } from 'react';
import { useAccounts } from '@panoplia/react';

export function AccountList() {
  const { accounts, activeAccount, setActiveAccount, createAccount, isLoading } = useAccounts();
  const [newAccountName, setNewAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAccount = async () => {
    setIsCreating(true);
    try {
      await createAccount(newAccountName || undefined);
      setNewAccountName('');
    } catch (e) {
      console.error('Failed to create account:', e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Accounts</h3>

      <ul className="account-list">
        {accounts.map((account) => (
          <li
            key={account.address}
            className={`account-item ${account.address === activeAccount?.address ? 'active' : ''}`}
            onClick={() => setActiveAccount(account.address)}
          >
            <div style={{ fontWeight: 'bold' }}>
              {account.name || `Account ${account.index + 1}`}
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#666',
                marginTop: 4,
              }}
            >
              {account.address.slice(0, 10)}...{account.address.slice(-8)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#999', marginTop: 4 }}>
              Path: {account.derivationPath}
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 16 }}>
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>
          Add New Account
        </div>
        <input
          type="text"
          placeholder="Account name (optional)"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
        />
        <button
          onClick={handleCreateAccount}
          disabled={isCreating || isLoading}
        >
          {isCreating ? 'Creating...' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}
