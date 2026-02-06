import { randomBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Guardian status in the recovery process
 */
export type GuardianStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

/**
 * Guardian information
 */
export interface Guardian {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Guardian's email or other contact */
  contact: string;
  /** Type of contact */
  contactType: 'email' | 'phone' | 'wallet' | 'other';
  /** Share index assigned to this guardian */
  shareIndex: number;
  /** Current status */
  status: GuardianStatus;
  /** When the guardian was added */
  addedAt: number;
  /** When the guardian accepted (if applicable) */
  acceptedAt?: number;
  /** Optional public key for encrypted communication */
  publicKey?: string;
  /** Hash of the verification code sent to guardian */
  verificationHash?: string;
}

/**
 * Guardian invite that can be sent to a guardian
 */
export interface GuardianInvite {
  /** Invite ID */
  id: string;
  /** Guardian ID this invite is for */
  guardianId: string;
  /** Wallet address being protected */
  walletAddress: string;
  /** Wallet owner's name/identifier */
  ownerName: string;
  /** Threshold configuration */
  threshold: number;
  totalGuardians: number;
  /** Encrypted recovery share */
  encryptedShare: string;
  /** Verification code (to be sent via separate channel) */
  verificationCode: string;
  /** Expiration timestamp */
  expiresAt: number;
  /** When the invite was created */
  createdAt: number;
}

/**
 * Guardian response to an invite
 */
export interface GuardianResponse {
  /** Invite ID */
  inviteId: string;
  /** Guardian ID */
  guardianId: string;
  /** Whether the guardian accepted */
  accepted: boolean;
  /** Guardian's public key for encrypted communication */
  publicKey?: string;
  /** Verification code provided by guardian */
  verificationCode: string;
  /** Timestamp */
  respondedAt: number;
}

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
 * Generate a verification code
 */
function generateVerificationCode(): string {
  const bytes = randomBytes(4);
  const num = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  return (Math.abs(num) % 1000000).toString().padStart(6, '0');
}

/**
 * Hash a verification code for storage
 */
function hashVerificationCode(code: string): string {
  const hash = sha256(new TextEncoder().encode(code));
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Guardian Manager
 *
 * Manages guardians for social recovery. Guardians are trusted contacts
 * who each hold a share of the recovery key. When the user loses access
 * to their wallet, guardians can collaborate to help recover it.
 */
export class GuardianManager {
  private guardians: Map<string, Guardian> = new Map();
  private pendingInvites: Map<string, GuardianInvite> = new Map();

  /**
   * Add a new guardian
   */
  addGuardian(params: {
    name: string;
    contact: string;
    contactType: Guardian['contactType'];
    shareIndex: number;
    publicKey?: string;
  }): Guardian {
    const guardian: Guardian = {
      id: generateId(),
      name: params.name,
      contact: params.contact,
      contactType: params.contactType,
      shareIndex: params.shareIndex,
      status: 'pending',
      addedAt: Date.now(),
      publicKey: params.publicKey,
    };

    this.guardians.set(guardian.id, guardian);
    return guardian;
  }

  /**
   * Get a guardian by ID
   */
  getGuardian(id: string): Guardian | undefined {
    return this.guardians.get(id);
  }

  /**
   * Get all guardians
   */
  getAllGuardians(): Guardian[] {
    return Array.from(this.guardians.values());
  }

  /**
   * Get active guardians (accepted status)
   */
  getActiveGuardians(): Guardian[] {
    return this.getAllGuardians().filter((g) => g.status === 'accepted');
  }

  /**
   * Update guardian status
   */
  updateGuardianStatus(id: string, status: GuardianStatus): void {
    const guardian = this.guardians.get(id);
    if (guardian) {
      guardian.status = status;
      if (status === 'accepted') {
        guardian.acceptedAt = Date.now();
      }
    }
  }

  /**
   * Remove a guardian
   */
  removeGuardian(id: string): boolean {
    return this.guardians.delete(id);
  }

  /**
   * Revoke a guardian (mark as revoked but keep record)
   */
  revokeGuardian(id: string): void {
    this.updateGuardianStatus(id, 'revoked');
  }

  /**
   * Create an invite for a guardian
   */
  createInvite(params: {
    guardianId: string;
    walletAddress: string;
    ownerName: string;
    threshold: number;
    totalGuardians: number;
    encryptedShare: string;
    expirationDays?: number;
  }): GuardianInvite {
    const guardian = this.guardians.get(params.guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    const verificationCode = generateVerificationCode();
    guardian.verificationHash = hashVerificationCode(verificationCode);

    const invite: GuardianInvite = {
      id: generateId(),
      guardianId: params.guardianId,
      walletAddress: params.walletAddress,
      ownerName: params.ownerName,
      threshold: params.threshold,
      totalGuardians: params.totalGuardians,
      encryptedShare: params.encryptedShare,
      verificationCode,
      expiresAt: Date.now() + (params.expirationDays ?? 7) * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    };

    this.pendingInvites.set(invite.id, invite);
    return invite;
  }

  /**
   * Process a guardian's response to an invite
   */
  processResponse(response: GuardianResponse): boolean {
    const invite = this.pendingInvites.get(response.inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }

    if (Date.now() > invite.expiresAt) {
      this.pendingInvites.delete(invite.id);
      throw new Error('Invite has expired');
    }

    const guardian = this.guardians.get(response.guardianId);
    if (!guardian) {
      throw new Error('Guardian not found');
    }

    // Verify the code
    const providedHash = hashVerificationCode(response.verificationCode);
    if (providedHash !== guardian.verificationHash) {
      throw new Error('Invalid verification code');
    }

    // Update guardian
    if (response.accepted) {
      guardian.status = 'accepted';
      guardian.acceptedAt = Date.now();
      if (response.publicKey) {
        guardian.publicKey = response.publicKey;
      }
    } else {
      guardian.status = 'declined';
    }

    // Remove processed invite
    this.pendingInvites.delete(invite.id);

    return response.accepted;
  }

  /**
   * Get pending invites
   */
  getPendingInvites(): GuardianInvite[] {
    const now = Date.now();
    // Clean up expired invites
    for (const [id, invite] of this.pendingInvites) {
      if (now > invite.expiresAt) {
        this.pendingInvites.delete(id);
      }
    }
    return Array.from(this.pendingInvites.values());
  }

  /**
   * Cancel a pending invite
   */
  cancelInvite(inviteId: string): void {
    this.pendingInvites.delete(inviteId);
  }

  /**
   * Export guardian data for storage
   */
  exportData(): {
    guardians: Guardian[];
    pendingInvites: GuardianInvite[];
  } {
    return {
      guardians: this.getAllGuardians(),
      pendingInvites: this.getPendingInvites(),
    };
  }

  /**
   * Import guardian data
   */
  importData(data: {
    guardians: Guardian[];
    pendingInvites?: GuardianInvite[];
  }): void {
    this.guardians.clear();
    this.pendingInvites.clear();

    for (const guardian of data.guardians) {
      this.guardians.set(guardian.id, guardian);
    }

    if (data.pendingInvites) {
      for (const invite of data.pendingInvites) {
        this.pendingInvites.set(invite.id, invite);
      }
    }
  }

  /**
   * Check if we have enough active guardians for the given threshold
   */
  hasEnoughGuardians(threshold: number): boolean {
    return this.getActiveGuardians().length >= threshold;
  }

  /**
   * Get guardian by share index
   */
  getGuardianByShareIndex(shareIndex: number): Guardian | undefined {
    return this.getAllGuardians().find((g) => g.shareIndex === shareIndex);
  }
}
