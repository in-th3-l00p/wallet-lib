import React from 'react';
import ReactDOM from 'react-dom/client';
import { WalletProvider } from '@panoplia/react';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider
      defaultChainId={11155111} // Sepolia testnet
      autoLockTimeoutMs={5 * 60 * 1000} // 5 minutes
    >
      <App />
    </WalletProvider>
  </React.StrictMode>
);
