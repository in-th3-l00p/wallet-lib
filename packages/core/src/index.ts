// Types
export type {
  Account,
  Chain,
  EncryptedPayload,
  SerializedEncryptedPayload,
  StorageAdapter,
  TypedDataTypes,
  WalletEvents,
  WalletProvider,
  WalletState,
} from './types.js';

// Encryption
export {
  decrypt,
  deriveKey,
  deserializePayload,
  encrypt,
  ENCRYPTION_VERSION,
  generateSalt,
  secureClear,
  serializePayload,
  uint8ArrayToBase64,
  base64ToUint8Array,
  verifyPassword,
} from './encryption.js';

// HD Wallet
export {
  COIN_TYPES,
  DEFAULT_DERIVATION_PATH,
  deriveAccount,
  deriveAccounts,
  generateMnemonic,
  getMasterNode,
  getMnemonicWordCount,
  getPrivateKey,
  normalizeMnemonic,
  privateKeyToAccount,
  validateMnemonic,
} from './hd-wallet.js';

// Chains
export {
  addChain,
  arbitrum,
  arbitrumSepolia,
  avalanche,
  base,
  baseSepolia,
  bsc,
  chains,
  ethereum,
  getAddressUrl,
  getChain,
  getExplorerUrl,
  getMainnetChains,
  getRpcUrl,
  getTestnetChains,
  getTransactionUrl,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  sepolia,
} from './chains.js';
