import { useState } from 'react';
import { MPCWalletDemo } from './components/MPCWalletDemo';
import { SocialRecoveryDemo } from './components/SocialRecoveryDemo';
import { RecoveryFlowDemo } from './components/RecoveryFlowDemo';

type Tab = 'mpc' | 'social-recovery' | 'recovery-flow';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('mpc');

  return (
    <div className="app">
      <header className="header">
        <h1>Panoplia MPC & Social Recovery</h1>
        <p>Secure your wallet with threshold signatures and trusted guardians</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'mpc' ? 'active' : ''}`}
          onClick={() => setActiveTab('mpc')}
        >
          MPC Wallet
        </button>
        <button
          className={`tab ${activeTab === 'social-recovery' ? 'active' : ''}`}
          onClick={() => setActiveTab('social-recovery')}
        >
          Social Recovery Setup
        </button>
        <button
          className={`tab ${activeTab === 'recovery-flow' ? 'active' : ''}`}
          onClick={() => setActiveTab('recovery-flow')}
        >
          Recovery Flow
        </button>
      </div>

      {activeTab === 'mpc' && <MPCWalletDemo />}
      {activeTab === 'social-recovery' && <SocialRecoveryDemo />}
      {activeTab === 'recovery-flow' && <RecoveryFlowDemo />}
    </div>
  );
}
