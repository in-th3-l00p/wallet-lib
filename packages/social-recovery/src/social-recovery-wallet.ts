import {
  MPCWallet,
  type EncryptedKeyShare,
  type KeyShare,
  type MPCWalletState,
} from '@panoplia/mpc';
import { GuardianManager, type Guardian, type GuardianInvite } from './guardian.js';
import { RecoveryManager, type RecoveryRequest } from './recovery.js';

/**
 * Social recovery wallet configuration
 */
export interface SocialRecoveryConfig {
  /** Total number of shares (guardians + owner shares) */
  totalShares: number;
  /** Minimum shares needed for recovery */
  threshold: number;
  /** Number of shares kept by owner */
  ownerShares: number;
  /** Recovery timelock in hours */
  timelockHours: number;
  /** Recovery request expiration in days */
  expirationDays: number;
}

/**
 * Default configuration for social recovery
 */
const DEFAULT_CONFIG: SocialRecoveryConfig = {
  totalShares: 5,
  threshold: 3,
  ownerShares: 1,
  timelockHours: 48,
  expirationDays: 7,
};

/**
 * Social recovery wallet state
 */
export interface SocialRecoveryWalletState {
  /** MPC wallet state */
  mpcState: MPCWalletState;
  /** Guardian data */
  guardians: Guardian[];
  /** Configuration */
  config: SocialRecoveryConfig;
  /** Owner's encrypted shares */
  ownerShares: EncryptedKeyShare[];
  /** When setup was completed */
  setupCompletedAt?: number;
}

/**
 * Result of social recovery wallet setup
 */
export interface SetupResult {
  /** Wallet state */
  state: SocialRecoveryWalletState;
  /** Guardian invites to distribute */
  guardianInvites: Array<{
    guardian: Guardian;
    invite: GuardianInvite;
    encryptedShare: EncryptedKeyShare;
  }>;
  /** Owner's plain shares (for immediate secure storage) */
  ownerPlainShares: KeyShare[];
}

/**
 * Social Recovery Wallet
 *
 * Combines MPC wallet functionality with guardian-based social recovery.
 *
 * Features:
 * - Split private key among owner and trusted guardians
 * - Require threshold of shares to sign transactions
 * - Social recovery when owner loses access
 * - Timelock protection against malicious recovery attempts
 *
 * Example setup with 5 shares, 3 threshold, 1 owner share:
 * - Owner keeps 1 share (encrypted locally)
 * - 4 guardians each hold 1 share
 * - Normal operation: Owner uses their share + 2 guardian approvals
 * - Recovery: 3 guardians can recover without owner
 */
export class SocialRecoveryWallet {
  private mpcWallet: MPCWallet;
  private guardianManager: GuardianManager;
  private recoveryManager: RecoveryManager;
  private config: SocialRecoveryConfig;
  private ownerShares: EncryptedKeyShare[] = [];
  private state: SocialRecoveryWalletState | null = null;

  constructor(config: Partial<SocialRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mpcWallet = new MPCWallet();
    this.guardianManager = new GuardianManager();
    this.recoveryManager = new RecoveryManager({
      timelockHours: this.config.timelockHours,
      expirationDays: this.config.expirationDays,
    });

    this.validateConfig();
  }

  private validateConfig(): void {
    const { totalShares, threshold, ownerShares } = this.config;
    const guardianShares = totalShares - ownerShares;

    if (threshold < 2) {
      throw new Error('Threshold must be at least 2');
    }
    if (ownerShares < 1) {
      throw new Error('Owner must have at least 1 share');
    }
    if (guardianShares < threshold - ownerShares) {
      throw new Error('Not enough guardian shares for recovery without owner');
    }
    if (threshold > totalShares) {
      throw new Error('Threshold cannot exceed total shares');
    }
  }

  /**
   * Set up a new social recovery wallet
   *
   * @param ownerPassword Password to encrypt owner's shares
   * @param guardianPasswords Passwords for each guardian's share
   * @param guardianInfo Information about each guardian
   */
  async setup(
    ownerPassword: string,
    guardianInfo: Array<{
      name: string;
      contact: string;
      contactType: Guardian['contactType'];
      sharePassword: string;
    }>
  ): Promise<SetupResult> {
    const guardianCount = this.config.totalShares - this.config.ownerShares;

    if (guardianInfo.length !== guardianCount) {
      throw new Error(
        `Expected ${guardianCount} guardians, got ${guardianInfo.length}`
      );
    }

    // Create all share passwords
    const allPasswords = [
      ...Array(this.config.ownerShares).fill(ownerPassword),
      ...guardianInfo.map((g) => g.sharePassword),
    ];

    // Create MPC wallet with all shares
    const mpcResult = MPCWallet.create(
      {
        totalShares: this.config.totalShares,
        threshold: this.config.threshold,
      },
      allPasswords
    );

    // Separate owner and guardian shares
    const ownerEncryptedShares = mpcResult.encryptedShares.slice(
      0,
      this.config.ownerShares
    );
    const guardianEncryptedShares = mpcResult.encryptedShares.slice(
      this.config.ownerShares
    );
    const ownerPlainShares = mpcResult.plainShares.slice(
      0,
      this.config.ownerShares
    );

    // Add guardians and create invites
    const guardianInvites: SetupResult['guardianInvites'] = [];

    for (let i = 0; i < guardianInfo.length; i++) {
      const info = guardianInfo[i];
      const encryptedShare = guardianEncryptedShares[i];

      // Add guardian
      const guardian = this.guardianManager.addGuardian({
        name: info.name,
        contact: info.contact,
        contactType: info.contactType,
        shareIndex: encryptedShare.index,
      });

      // Create invite
      const invite = this.guardianManager.createInvite({
        guardianId: guardian.id,
        walletAddress: mpcResult.state.address,
        ownerName: 'Wallet Owner', // Could be customized
        threshold: this.config.threshold,
        totalGuardians: guardianCount,
        encryptedShare: JSON.stringify(encryptedShare),
      });

      guardianInvites.push({
        guardian,
        invite,
        encryptedShare,
      });
    }

    // Store state
    this.ownerShares = ownerEncryptedShares;
    this.mpcWallet.loadState(mpcResult.state);

    this.state = {
      mpcState: mpcResult.state,
      guardians: this.guardianManager.getAllGuardians(),
      config: this.config,
      ownerShares: ownerEncryptedShares,
      setupCompletedAt: Date.now(),
    };

    return {
      state: this.state,
      guardianInvites,
      ownerPlainShares,
    };
  }

  /**
   * Import an existing private key into a social recovery wallet
   */
  async importKey(
    privateKey: string,
    ownerPassword: string,
    guardianInfo: Array<{
      name: string;
      contact: string;
      contactType: Guardian['contactType'];
      sharePassword: string;
    }>
  ): Promise<SetupResult> {
    const guardianCount = this.config.totalShares - this.config.ownerShares;

    if (guardianInfo.length !== guardianCount) {
      throw new Error(
        `Expected ${guardianCount} guardians, got ${guardianInfo.length}`
      );
    }

    // Create all share passwords
    const allPasswords = [
      ...Array(this.config.ownerShares).fill(ownerPassword),
      ...guardianInfo.map((g) => g.sharePassword),
    ];

    // Import and split key
    const mpcResult = MPCWallet.importKey(
      privateKey,
      {
        totalShares: this.config.totalShares,
        threshold: this.config.threshold,
      },
      allPasswords
    );

    // Rest is same as setup...
    const ownerEncryptedShares = mpcResult.encryptedShares.slice(
      0,
      this.config.ownerShares
    );
    const guardianEncryptedShares = mpcResult.encryptedShares.slice(
      this.config.ownerShares
    );
    const ownerPlainShares = mpcResult.plainShares.slice(
      0,
      this.config.ownerShares
    );

    const guardianInvites: SetupResult['guardianInvites'] = [];

    for (let i = 0; i < guardianInfo.length; i++) {
      const info = guardianInfo[i];
      const encryptedShare = guardianEncryptedShares[i];

      const guardian = this.guardianManager.addGuardian({
        name: info.name,
        contact: info.contact,
        contactType: info.contactType,
        shareIndex: encryptedShare.index,
      });

      const invite = this.guardianManager.createInvite({
        guardianId: guardian.id,
        walletAddress: mpcResult.state.address,
        ownerName: 'Wallet Owner',
        threshold: this.config.threshold,
        totalGuardians: guardianCount,
        encryptedShare: JSON.stringify(encryptedShare),
      });

      guardianInvites.push({ guardian, invite, encryptedShare });
    }

    this.ownerShares = ownerEncryptedShares;
    this.mpcWallet.loadState(mpcResult.state);

    this.state = {
      mpcState: mpcResult.state,
      guardians: this.guardianManager.getAllGuardians(),
      config: this.config,
      ownerShares: ownerEncryptedShares,
      setupCompletedAt: Date.now(),
    };

    return {
      state: this.state,
      guardianInvites,
      ownerPlainShares,
    };
  }

  /**
   * Load wallet from saved state
   */
  loadState(state: SocialRecoveryWalletState): void {
    this.state = state;
    this.config = state.config;
    this.ownerShares = state.ownerShares;
    this.mpcWallet.loadState(state.mpcState);
    this.guardianManager.importData({ guardians: state.guardians });
  }

  /**
   * Get current wallet state
   */
  getState(): SocialRecoveryWalletState | null {
    return this.state;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.mpcWallet.getAddress();
  }

  /**
   * Unlock owner's shares
   */
  unlockOwnerShares(password: string): boolean {
    if (this.ownerShares.length === 0) {
      throw new Error('No owner shares available');
    }

    let success = true;
    for (const share of this.ownerShares) {
      if (!this.mpcWallet.addShare(share, password)) {
        success = false;
      }
    }

    return success;
  }

  /**
   * Add a guardian's approval (for normal operation with guardian assistance)
   */
  addGuardianShare(encryptedShare: EncryptedKeyShare, password: string): boolean {
    return this.mpcWallet.addShare(encryptedShare, password);
  }

  /**
   * Check if wallet can sign (enough shares collected)
   */
  canSign(): boolean {
    return this.mpcWallet.canSign();
  }

  /**
   * Get number of shares needed
   */
  getSharesNeeded(): number {
    const config = this.mpcWallet.getConfig();
    if (!config) return 0;
    return Math.max(0, config.threshold - this.mpcWallet.getCollectedShareCount());
  }

  /**
   * Sign a message
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.mpcWallet.signMessage(message);
  }

  /**
   * Sign a transaction
   */
  async signTransaction(txData: Parameters<MPCWallet['signTransaction']>[0]): Promise<string> {
    return this.mpcWallet.signTransaction(txData);
  }

  /**
   * Clear collected shares (lock wallet)
   */
  lock(): void {
    this.mpcWallet.clearShares();
  }

  // === Guardian Management ===

  /**
   * Get all guardians
   */
  getGuardians(): Guardian[] {
    return this.guardianManager.getAllGuardians();
  }

  /**
   * Get active guardians
   */
  getActiveGuardians(): Guardian[] {
    return this.guardianManager.getActiveGuardians();
  }

  /**
   * Update guardian status when they respond to invite
   */
  processGuardianResponse(response: Parameters<GuardianManager['processResponse']>[0]): boolean {
    return this.guardianManager.processResponse(response);
  }

  // === Recovery Flow ===

  /**
   * Initiate recovery (when owner loses access)
   */
  initiateRecovery(params: {
    initiator: string;
    reason: string;
  }): RecoveryRequest {
    if (!this.state) {
      throw new Error('Wallet not initialized');
    }

    return this.recoveryManager.initiateRecovery({
      walletAddress: this.state.mpcState.address,
      keyId: this.state.mpcState.keyId,
      initiator: params.initiator,
      reason: params.reason,
      threshold: this.config.threshold,
    });
  }

  /**
   * Add guardian approval to recovery request
   */
  addRecoveryApproval(
    requestId: string,
    guardianId: string,
    shareValue: string
  ): RecoveryRequest {
    const guardian = this.guardianManager.getGuardian(guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    return this.recoveryManager.addApproval(requestId, {
      guardianId,
      shareIndex: guardian.shareIndex,
      shareValue,
    });
  }

  /**
   * Check if recovery is ready
   */
  isRecoveryReady(requestId: string): boolean {
    return this.recoveryManager.isReadyForExecution(requestId);
  }

  /**
   * Get recovery timelock remaining
   */
  getRecoveryTimelockRemaining(requestId: string): number {
    return this.recoveryManager.getTimelockRemaining(requestId);
  }

  /**
   * Execute recovery (after timelock)
   */
  executeRecovery(requestId: string): string {
    return this.recoveryManager.executeRecovery(requestId);
  }

  /**
   * Cancel recovery (by original owner)
   */
  cancelRecovery(requestId: string): void {
    this.recoveryManager.cancelRecovery(requestId);
  }

  /**
   * Get pending recovery request
   */
  getPendingRecovery(): RecoveryRequest | undefined {
    if (!this.state) return undefined;
    return this.recoveryManager.getPendingRequest(this.state.mpcState.address);
  }

  /**
   * Get recovery progress
   */
  getRecoveryProgress(requestId: string): {
    current: number;
    required: number;
    percentage: number;
  } {
    return this.recoveryManager.getApprovalProgress(requestId);
  }

  // === Serialization ===

  /**
   * Export wallet data for storage
   */
  exportData(): string {
    if (!this.state) {
      throw new Error('Wallet not initialized');
    }

    return JSON.stringify({
      state: this.state,
      recovery: this.recoveryManager.exportData(),
    });
  }

  /**
   * Import wallet data
   */
  importData(data: string): void {
    const parsed = JSON.parse(data);
    this.loadState(parsed.state);
    if (parsed.recovery) {
      this.recoveryManager.importData(parsed.recovery);
    }
  }
}
