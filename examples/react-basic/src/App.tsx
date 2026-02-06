import { useWallet } from '@panoplia/react';
import { CreateWallet } from './components/CreateWallet';
import { UnlockWallet } from './components/UnlockWallet';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const { isInitialized, isLocked, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Loading wallet...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1>Panoplia Wallet</h1>

      {!isInitialized ? (
        <CreateWallet />
      ) : isLocked ? (
        <UnlockWallet />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
