// Shamir's Secret Sharing
export {
  splitSecret,
  combineShares,
  serializeShare,
  deserializeShare,
  verifySharesConsistent,
  generateSecretId,
  type Share,
  type SerializedShare,
} from './shamir.js';

// Threshold Signatures
export {
  generateDistributedKey,
  importAndSplitKey,
  signWithShares,
  signPersonalMessage,
  signTypedData,
  verifySignature,
  recoverPublicKey,
  type ThresholdConfig,
  type KeyShare,
  type PartialSignature,
  type DKGResult,
} from './threshold-signature.js';

// MPC Wallet
export {
  MPCWallet,
  type EncryptedKeyShare,
  type ShareHolder,
  type MPCWalletState,
  type CreateMPCWalletOptions,
  type CreateMPCWalletResult,
} from './mpc-wallet.js';
