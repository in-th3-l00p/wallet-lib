import { randomBytes } from '@noble/hashes/utils';
import { combineShares, type Share } from '@panoplia/mpc';

/**
 * Recovery request status
 */
export type RecoveryStatus =
  | 'pending'      // Waiting for guardian approvals
  | 'approved'     // Enough approvals, waiting for timelock
  | 'ready'        // Timelock expired, can execute
  | 'executed'     // Recovery completed
  | 'cancelled'    // Cancelled by owner or guardians
  | 'expired';     // Request expired without completion

/**
 * Guardian approval for a recovery request
 */
export interface GuardianApproval {
  /** Guardian ID */
  guardianId: string;
  /** Share index */
  shareIndex: number;
  /** Decrypted share value (from guardian) */
  shareValue: string;
  /** When the approval was given */
  approvedAt: number;
  /** Signature from guardian (optional) */
  signature?: string;
}

/**
 * Recovery request
 */
export interface RecoveryRequest {
  /** Unique request ID */
  id: string;
  /** Wallet address being recovered */
  walletAddress: string;
  /** Key ID of the wallet */
  keyId: string;
  /** Who initiated the recovery (email, new address, etc.) */
  initiator: string;
  /** Reason for recovery */
  reason: string;
  /** Current status */
  status: RecoveryStatus;
  /** Required threshold */
  threshold: number;
  /** Guardian approvals received */
  approvals: GuardianApproval[];
  /** Timelock duration in milliseconds */
  timelockMs: number;
  /** When the request was created */
  createdAt: number;
  /** When the request was approved (threshold reached) */
  approvedAt?: number;
  /** When the timelock expires (recovery can execute) */
  timelockExpiresAt?: number;
  /** When the request expires if not completed */
  expiresAt: number;
  /** When the recovery was executed */
  executedAt?: number;
  /** Recovered secret (only set after execution) */
  recoveredSecret?: string;
}

/**
 * Recovery configuration
 */
export interface RecoveryConfig {
  /** Timelock duration in hours (default: 48) */
  timelockHours: number;
  /** Request expiration in days (default: 7) */
  expirationDays: number;
  /** Whether to notify owner of recovery attempts */
  notifyOwner: boolean;
  /** Minimum time between recovery attempts in hours */
  cooldownHours: number;
}

const DEFAULT_CONFIG: RecoveryConfig = {
  timelockHours: 48,
  expirationDays: 7,
  notifyOwner: true,
  cooldownHours: 24,
};

/**
 * Generate a unique ID
 */
function generateId(): string {
  const bytes = randomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Recovery Manager
 *
 * Manages the social recovery process. When a user loses access to their wallet:
 * 1. They initiate a recovery request
 * 2. Guardians approve and provide their shares
 * 3. After reaching threshold, a timelock period begins
 * 4. After timelock, the shares are combined to recover the key
 *
 * The timelock provides security by allowing the original owner time to
 * cancel fraudulent recovery attempts.
 */
export class RecoveryManager {
  private requests: Map<string, RecoveryRequest> = new Map();
  private config: RecoveryConfig;
  private lastAttempt: Map<string, number> = new Map(); // walletAddress -> timestamp

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initiate a recovery request
   */
  initiateRecovery(params: {
    walletAddress: string;
    keyId: string;
    initiator: string;
    reason: string;
    threshold: number;
  }): RecoveryRequest {
    const { walletAddress, keyId, initiator, reason, threshold } = params;

    // Check cooldown
    const lastAttempt = this.lastAttempt.get(walletAddress);
    if (lastAttempt) {
      const cooldownMs = this.config.cooldownHours * 60 * 60 * 1000;
      if (Date.now() - lastAttempt < cooldownMs) {
        throw new Error(
          `Please wait ${this.config.cooldownHours} hours between recovery attempts`
        );
      }
    }

    // Check for existing pending request
    const existingRequest = this.getPendingRequest(walletAddress);
    if (existingRequest) {
      throw new Error('A recovery request is already pending for this wallet');
    }

    const request: RecoveryRequest = {
      id: generateId(),
      walletAddress,
      keyId,
      initiator,
      reason,
      status: 'pending',
      threshold,
      approvals: [],
      timelockMs: this.config.timelockHours * 60 * 60 * 1000,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.expirationDays * 24 * 60 * 60 * 1000,
    };

    this.requests.set(request.id, request);
    this.lastAttempt.set(walletAddress, Date.now());

    return request;
  }

  /**
   * Add a guardian approval to a recovery request
   */
  addApproval(
    requestId: string,
    approval: Omit<GuardianApproval, 'approvedAt'>
  ): RecoveryRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Recovery request not found');
    }

    this.validateRequestStatus(request, ['pending', 'approved']);

    // Check if this guardian already approved
    if (request.approvals.some((a) => a.guardianId === approval.guardianId)) {
      throw new Error('Guardian has already approved this request');
    }

    // Add approval
    request.approvals.push({
      ...approval,
      approvedAt: Date.now(),
    });

    // Check if threshold reached
    if (
      request.approvals.length >= request.threshold &&
      request.status === 'pending'
    ) {
      request.status = 'approved';
      request.approvedAt = Date.now();
      request.timelockExpiresAt = Date.now() + request.timelockMs;
    }

    return request;
  }

  /**
   * Check if a request is ready for execution (timelock expired)
   */
  isReadyForExecution(requestId: string): boolean {
    const request = this.requests.get(requestId);
    if (!request) return false;

    this.updateRequestStatus(request);
    return request.status === 'ready';
  }

  /**
   * Execute the recovery (combine shares to get the secret)
   */
  executeRecovery(requestId: string): string {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Recovery request not found');
    }

    this.updateRequestStatus(request);
    this.validateRequestStatus(request, ['ready']);

    // Combine shares
    const shares: Share[] = request.approvals.map((a) => ({
      x: a.shareIndex,
      y: a.shareValue,
    }));

    const recoveredSecret = combineShares(shares);

    // Update request
    request.status = 'executed';
    request.executedAt = Date.now();
    request.recoveredSecret = recoveredSecret;

    return recoveredSecret;
  }

  /**
   * Cancel a recovery request
   *
   * Can be called by the original owner to stop fraudulent recovery
   */
  cancelRecovery(requestId: string, _reason?: string): void {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Recovery request not found');
    }

    this.validateRequestStatus(request, ['pending', 'approved', 'ready']);

    request.status = 'cancelled';

    // Clear any collected shares for security
    for (const approval of request.approvals) {
      approval.shareValue = '';
    }
  }

  /**
   * Get a recovery request by ID
   */
  getRequest(requestId: string): RecoveryRequest | undefined {
    const request = this.requests.get(requestId);
    if (request) {
      this.updateRequestStatus(request);
    }
    return request;
  }

  /**
   * Get pending request for a wallet
   */
  getPendingRequest(walletAddress: string): RecoveryRequest | undefined {
    for (const request of this.requests.values()) {
      this.updateRequestStatus(request);
      if (
        request.walletAddress === walletAddress &&
        ['pending', 'approved', 'ready'].includes(request.status)
      ) {
        return request;
      }
    }
    return undefined;
  }

  /**
   * Get all requests for a wallet
   */
  getRequestsForWallet(walletAddress: string): RecoveryRequest[] {
    const results: RecoveryRequest[] = [];
    for (const request of this.requests.values()) {
      if (request.walletAddress === walletAddress) {
        this.updateRequestStatus(request);
        results.push(request);
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get time remaining on timelock (in ms)
   */
  getTimelockRemaining(requestId: string): number {
    const request = this.requests.get(requestId);
    if (!request || !request.timelockExpiresAt) return 0;

    const remaining = request.timelockExpiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get approval progress
   */
  getApprovalProgress(requestId: string): {
    current: number;
    required: number;
    percentage: number;
  } {
    const request = this.requests.get(requestId);
    if (!request) {
      return { current: 0, required: 0, percentage: 0 };
    }

    const current = request.approvals.length;
    const required = request.threshold;
    const percentage = Math.min(100, Math.round((current / required) * 100));

    return { current, required, percentage };
  }

  /**
   * Update request status based on time
   */
  private updateRequestStatus(request: RecoveryRequest): void {
    const now = Date.now();

    // Check expiration
    if (now > request.expiresAt && request.status !== 'executed') {
      request.status = 'expired';
      return;
    }

    // Check timelock
    if (
      request.status === 'approved' &&
      request.timelockExpiresAt &&
      now >= request.timelockExpiresAt
    ) {
      request.status = 'ready';
    }
  }

  /**
   * Validate request is in expected status
   */
  private validateRequestStatus(
    request: RecoveryRequest,
    allowedStatuses: RecoveryStatus[]
  ): void {
    this.updateRequestStatus(request);

    if (!allowedStatuses.includes(request.status)) {
      throw new Error(
        `Invalid request status: ${request.status}. Expected: ${allowedStatuses.join(', ')}`
      );
    }
  }

  /**
   * Export recovery data for storage
   */
  exportData(): {
    requests: RecoveryRequest[];
    config: RecoveryConfig;
    lastAttempts: Record<string, number>;
  } {
    return {
      requests: Array.from(this.requests.values()),
      config: this.config,
      lastAttempts: Object.fromEntries(this.lastAttempt),
    };
  }

  /**
   * Import recovery data
   */
  importData(data: {
    requests: RecoveryRequest[];
    config?: Partial<RecoveryConfig>;
    lastAttempts?: Record<string, number>;
  }): void {
    this.requests.clear();
    this.lastAttempt.clear();

    for (const request of data.requests) {
      this.requests.set(request.id, request);
    }

    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }

    if (data.lastAttempts) {
      for (const [address, timestamp] of Object.entries(data.lastAttempts)) {
        this.lastAttempt.set(address, timestamp);
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }
}
