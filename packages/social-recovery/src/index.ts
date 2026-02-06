// Guardian Management
export {
  GuardianManager,
  type Guardian,
  type GuardianStatus,
  type GuardianInvite,
  type GuardianResponse,
} from './guardian.js';

// Recovery Management
export {
  RecoveryManager,
  type RecoveryRequest,
  type RecoveryStatus,
  type RecoveryConfig,
  type GuardianApproval,
} from './recovery.js';

// Social Recovery Wallet
export {
  SocialRecoveryWallet,
  type SocialRecoveryConfig,
  type SocialRecoveryWalletState,
  type SetupResult,
} from './social-recovery-wallet.js';

// Re-export MPC types for convenience
export type {
  KeyShare,
  EncryptedKeyShare,
  ThresholdConfig,
  ShareHolder,
} from '@panoplia/mpc';
