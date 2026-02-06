import { useState } from 'react';
import { useWallet, useAccounts, useBalance, useChain } from '@panoplia/react';
import { SendTransaction } from './SendTransaction';
import { SignMessage } from './SignMessage';
import { AccountList } from './AccountList';

type Tab = 'balance' | 'send' | 'sign' | 'accounts';

export function Dashboard() {
  const { lock } = useWallet();
  const { activeAccount } = useAccounts();
  const { formatted, symbol, isLoading: balanceLoading, refetch } = useBalance({
    refreshInterval: 30000, // Refresh every 30 seconds
  });
  const { chain, chainId, switchChain, supportedChains } = useChain();

  const [activeTab, setActiveTab] = useState<Tab>('balance');

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>{chain?.name || 'Unknown Network'}</strong>
          {chain?.testnet && <span style={{ color: '#f90', marginLeft: 8 }}>(Testnet)</span>}
        </div>
        <button className="secondary" onClick={lock}>
          Lock Wallet
        </button>
      </div>

      {/* Active Account */}
      {activeAccount && (
        <div className="card">
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {activeAccount.name || `Account ${activeAccount.index + 1}`}
          </div>
          <div className="address">{activeAccount.address}</div>
        </div>
      )}

      {/* Balance */}
      <div className="card">
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>Balance</div>
        {balanceLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="balance">
            {formatted ?? '0'} {symbol}
          </div>
        )}
        <button
          className="secondary"
          style={{ marginTop: 8, padding: '8px 16px', fontSize: '0.9rem' }}
          onClick={refetch}
        >
          Refresh
        </button>
      </div>

      {/* Network Selector */}
      <div className="card">
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>Network</div>
        <div className="chain-selector">
          {supportedChains.slice(0, 6).map((c) => (
            <button
              key={c.chainId}
              className={`chain-button ${c.chainId === chainId ? 'active' : 'secondary'}`}
              onClick={() => switchChain(c.chainId)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'balance' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          Send
        </button>
        <button
          className={`tab ${activeTab === 'sign' ? 'active' : ''}`}
          onClick={() => setActiveTab('sign')}
        >
          Sign
        </button>
        <button
          className={`tab ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          Accounts
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'balance' && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Welcome to Panoplia Wallet</h3>
          <p>
            This is a demo wallet running on <strong>{chain?.name}</strong>.
            {chain?.testnet && ' You can get testnet tokens from a faucet to try it out.'}
          </p>
          {chain?.testnet && (
            <p>
              <a
                href={`https://sepoliafaucet.com/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Sepolia ETH from faucet →
              </a>
            </p>
          )}
        </div>
      )}

      {activeTab === 'send' && <SendTransaction />}
      {activeTab === 'sign' && <SignMessage />}
      {activeTab === 'accounts' && <AccountList />}
    </div>
  );
}
