import { LocalWallet, createIndexedDBStorage } from '@panoplia/local-wallet';
import { getMainnetChains, getTestnetChains, getChain } from '@panoplia/core';
import { formatEther } from 'ethers';

// DOM Elements
const setupSection = document.getElementById('setup-section');
const mnemonicSection = document.getElementById('mnemonic-section');
const unlockSection = document.getElementById('unlock-section');
const dashboardSection = document.getElementById('dashboard-section');

const passwordInput = document.getElementById('password');
const passwordConfirmInput = document.getElementById('password-confirm');
const createBtn = document.getElementById('create-btn');
const importBtn = document.getElementById('import-btn');
const importSection = document.getElementById('import-section');
const mnemonicInput = document.getElementById('mnemonic-input');
const importConfirmBtn = document.getElementById('import-confirm-btn');
const setupError = document.getElementById('setup-error');

const mnemonicDisplay = document.getElementById('mnemonic-display');
const mnemonicConfirmBtn = document.getElementById('mnemonic-confirm-btn');

const unlockPasswordInput = document.getElementById('unlock-password');
const unlockBtn = document.getElementById('unlock-btn');
const unlockError = document.getElementById('unlock-error');

const lockBtn = document.getElementById('lock-btn');
const chainSelect = document.getElementById('chain-select');
const accountAddress = document.getElementById('account-address');
const balanceDisplay = document.getElementById('balance');
const refreshBalanceBtn = document.getElementById('refresh-balance-btn');
const addAccountBtn = document.getElementById('add-account-btn');
const signMessageBtn = document.getElementById('sign-message-btn');

const logElement = document.getElementById('log');
const clearLogBtn = document.getElementById('clear-log-btn');

// Wallet instance
const storage = createIndexedDBStorage();
const wallet = LocalWallet.create(storage, {
  defaultChainId: 11155111, // Sepolia testnet
  autoLockTimeoutMs: 5 * 60 * 1000, // 5 minutes
});

// Logging
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '➡️';
  logElement.textContent += `[${timestamp}] ${prefix} ${message}\n`;
  logElement.scrollTop = logElement.scrollHeight;
}

clearLogBtn.addEventListener('click', () => {
  logElement.textContent = '';
});

// UI Helpers
function showSection(section) {
  [setupSection, mnemonicSection, unlockSection, dashboardSection].forEach(s => {
    s.classList.add('hidden');
  });
  section.classList.remove('hidden');
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

function hideError(element) {
  element.classList.add('hidden');
}

// Populate chain selector
function populateChains() {
  const chains = [...getTestnetChains(), ...getMainnetChains()];
  chainSelect.innerHTML = chains.map(c =>
    `<option value="${c.chainId}">${c.name}${c.testnet ? ' (Testnet)' : ''}</option>`
  ).join('');
  chainSelect.value = wallet.getChainId().toString();
}

// Update UI based on wallet state
async function updateUI() {
  const isInitialized = await wallet.isInitialized();
  const isLocked = wallet.isLocked();

  log(`Wallet state: initialized=${isInitialized}, locked=${isLocked}`);

  if (!isInitialized) {
    showSection(setupSection);
  } else if (isLocked) {
    showSection(unlockSection);
  } else {
    showSection(dashboardSection);
    await updateDashboard();
  }
}

async function updateDashboard() {
  // Populate chains
  populateChains();

  // Show active account
  const activeAccount = await wallet.getActiveAccount();
  if (activeAccount) {
    accountAddress.textContent = activeAccount.address;
    log(`Active account: ${activeAccount.name || 'Account ' + (activeAccount.index + 1)}`);
  }

  // Fetch balance
  await refreshBalance();
}

async function refreshBalance() {
  const activeAccount = await wallet.getActiveAccount();
  if (!activeAccount) return;

  balanceDisplay.textContent = 'Loading...';
  try {
    const balance = await wallet.getBalance(activeAccount.address);
    const formatted = formatEther(balance);
    const chain = getChain(wallet.getChainId());
    balanceDisplay.textContent = `${formatted} ${chain?.nativeCurrency.symbol || 'ETH'}`;
    log(`Balance: ${formatted} ${chain?.nativeCurrency.symbol || 'ETH'}`, 'success');
  } catch (e) {
    balanceDisplay.textContent = 'Error loading balance';
    log(`Failed to fetch balance: ${e.message}`, 'error');
  }
}

// Event Handlers

// Create wallet
createBtn.addEventListener('click', async () => {
  hideError(setupError);

  const password = passwordInput.value;
  const confirm = passwordConfirmInput.value;

  if (password.length < 8) {
    showError(setupError, 'Password must be at least 8 characters');
    return;
  }

  if (password !== confirm) {
    showError(setupError, 'Passwords do not match');
    return;
  }

  try {
    log('Creating new wallet...');
    const { mnemonic, account } = await wallet.generateWallet(password);
    log(`Wallet created! Address: ${account.address}`, 'success');

    // Show mnemonic for backup
    mnemonicDisplay.textContent = mnemonic;
    showSection(mnemonicSection);
  } catch (e) {
    showError(setupError, e.message);
    log(`Failed to create wallet: ${e.message}`, 'error');
  }
});

// Show import section
importBtn.addEventListener('click', () => {
  importSection.classList.toggle('hidden');
});

// Import wallet
importConfirmBtn.addEventListener('click', async () => {
  hideError(setupError);

  const password = passwordInput.value;
  const confirm = passwordConfirmInput.value;
  const mnemonic = mnemonicInput.value;

  if (password.length < 8) {
    showError(setupError, 'Password must be at least 8 characters');
    return;
  }

  if (password !== confirm) {
    showError(setupError, 'Passwords do not match');
    return;
  }

  if (!mnemonic.trim()) {
    showError(setupError, 'Please enter your seed phrase');
    return;
  }

  try {
    log('Importing wallet...');
    const account = await wallet.importFromMnemonic(mnemonic, password);
    log(`Wallet imported! Address: ${account.address}`, 'success');
    await updateUI();
  } catch (e) {
    showError(setupError, e.message);
    log(`Failed to import wallet: ${e.message}`, 'error');
  }
});

// Mnemonic confirmed
mnemonicConfirmBtn.addEventListener('click', async () => {
  mnemonicDisplay.textContent = ''; // Clear mnemonic from DOM
  await updateUI();
});

// Unlock
unlockBtn.addEventListener('click', async () => {
  hideError(unlockError);

  const password = unlockPasswordInput.value;
  if (!password) {
    showError(unlockError, 'Please enter your password');
    return;
  }

  try {
    log('Unlocking wallet...');
    const success = await wallet.unlock(password);

    if (success) {
      log('Wallet unlocked!', 'success');
      unlockPasswordInput.value = '';
      await updateUI();
    } else {
      showError(unlockError, 'Incorrect password');
      log('Unlock failed: incorrect password', 'error');
    }
  } catch (e) {
    showError(unlockError, e.message);
    log(`Unlock failed: ${e.message}`, 'error');
  }
});

// Lock
lockBtn.addEventListener('click', async () => {
  await wallet.lock();
  log('Wallet locked');
  await updateUI();
});

// Switch chain
chainSelect.addEventListener('change', async () => {
  const chainId = parseInt(chainSelect.value);
  try {
    log(`Switching to chain ${chainId}...`);
    await wallet.switchChain(chainId);
    const chain = getChain(chainId);
    log(`Switched to ${chain?.name}`, 'success');
    await refreshBalance();
  } catch (e) {
    log(`Failed to switch chain: ${e.message}`, 'error');
  }
});

// Refresh balance
refreshBalanceBtn.addEventListener('click', refreshBalance);

// Add account
addAccountBtn.addEventListener('click', async () => {
  try {
    const name = prompt('Account name (optional):');
    log('Creating new account...');
    const account = await wallet.createAccount(name || undefined);
    log(`Created account: ${account.address}`, 'success');
    await wallet.setActiveAccount(account.address);
    await updateDashboard();
  } catch (e) {
    log(`Failed to create account: ${e.message}`, 'error');
  }
});

// Sign message
signMessageBtn.addEventListener('click', async () => {
  const message = prompt('Enter message to sign:');
  if (!message) return;

  try {
    log(`Signing message: "${message}"`);
    const signature = await wallet.signMessage(message);
    log(`Signature: ${signature}`, 'success');
    alert(`Signature:\n\n${signature}`);
  } catch (e) {
    log(`Failed to sign message: ${e.message}`, 'error');
  }
});

// Initialize
log('Panoplia Wallet initialized');
updateUI();
