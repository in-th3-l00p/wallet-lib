import { describe, it, expect, beforeEach } from 'vitest';
import { GuardianManager } from './guardian.js';
import { RecoveryManager } from './recovery.js';
import { SocialRecoveryWallet } from './social-recovery-wallet.js';

describe('GuardianManager', () => {
  let manager: GuardianManager;

  beforeEach(() => {
    manager = new GuardianManager();
  });

  describe('addGuardian', () => {
    it('should add a guardian', () => {
      const guardian = manager.addGuardian({
        name: 'Mom',
        contact: 'mom@email.com',
        contactType: 'email',
        shareIndex: 1,
      });

      expect(guardian.name).toBe('Mom');
      expect(guardian.contact).toBe('mom@email.com');
      expect(guardian.contactType).toBe('email');
      expect(guardian.shareIndex).toBe(1);
      expect(guardian.status).toBe('pending');
    });

    it('should generate unique IDs for guardians', () => {
      const guardian1 = manager.addGuardian({
        name: 'Guardian 1',
        contact: 'g1@email.com',
        contactType: 'email',
        shareIndex: 1,
      });
      const guardian2 = manager.addGuardian({
        name: 'Guardian 2',
        contact: 'g2@email.com',
        contactType: 'email',
        shareIndex: 2,
      });

      expect(guardian1.id).not.toBe(guardian2.id);
    });
  });

  describe('getAllGuardians', () => {
    it('should return all guardians', () => {
      manager.addGuardian({
        name: 'Guardian 1',
        contact: 'g1@email.com',
        contactType: 'email',
        shareIndex: 1,
      });
      manager.addGuardian({
        name: 'Guardian 2',
        contact: 'g2@email.com',
        contactType: 'email',
        shareIndex: 2,
      });

      const all = manager.getAllGuardians();
      expect(all.length).toBe(2);
    });
  });

  describe('getActiveGuardians', () => {
    it('should return only accepted guardians', () => {
      const guardian = manager.addGuardian({
        name: 'Guardian 1',
        contact: 'g1@email.com',
        contactType: 'email',
        shareIndex: 1,
      });

      // Initially pending, not accepted
      expect(manager.getActiveGuardians().length).toBe(0);

      // Create and accept invite
      const invite = manager.createInvite({
        guardianId: guardian.id,
        walletAddress: '0x123',
        ownerName: 'Test Owner',
        threshold: 3,
        totalGuardians: 4,
        encryptedShare: 'encrypted-share-data',
      });

      manager.processResponse({
        inviteId: invite.id,
        guardianId: guardian.id,
        accepted: true,
        verificationCode: invite.verificationCode,
        respondedAt: Date.now(),
      });

      expect(manager.getActiveGuardians().length).toBe(1);
      expect(manager.getGuardian(guardian.id)?.status).toBe('accepted');
    });
  });

  describe('createInvite', () => {
    it('should create an invite with verification code', () => {
      const guardian = manager.addGuardian({
        name: 'Guardian',
        contact: 'g@email.com',
        contactType: 'email',
        shareIndex: 1,
      });

      const invite = manager.createInvite({
        guardianId: guardian.id,
        walletAddress: '0x123',
        ownerName: 'Owner',
        threshold: 3,
        totalGuardians: 4,
        encryptedShare: 'share-data',
      });

      expect(invite.verificationCode).toHaveLength(6);
      expect(invite.walletAddress).toBe('0x123');
      expect(invite.guardianId).toBe(guardian.id);
    });
  });

  describe('processResponse', () => {
    it('should accept valid response with correct verification code', () => {
      const guardian = manager.addGuardian({
        name: 'Guardian',
        contact: 'g@email.com',
        contactType: 'email',
        shareIndex: 1,
      });

      const invite = manager.createInvite({
        guardianId: guardian.id,
        walletAddress: '0x123',
        ownerName: 'Owner',
        threshold: 3,
        totalGuardians: 4,
        encryptedShare: 'share-data',
      });

      const result = manager.processResponse({
        inviteId: invite.id,
        guardianId: guardian.id,
        accepted: true,
        verificationCode: invite.verificationCode,
        respondedAt: Date.now(),
      });

      expect(result).toBe(true);
      expect(manager.getGuardian(guardian.id)?.status).toBe('accepted');
    });

    it('should throw on invalid verification code', () => {
      const guardian = manager.addGuardian({
        name: 'Guardian',
        contact: 'g@email.com',
        contactType: 'email',
        shareIndex: 1,
      });

      const invite = manager.createInvite({
        guardianId: guardian.id,
        walletAddress: '0x123',
        ownerName: 'Owner',
        threshold: 3,
        totalGuardians: 4,
        encryptedShare: 'share-data',
      });

      expect(() =>
        manager.processResponse({
          inviteId: invite.id,
          guardianId: guardian.id,
          accepted: true,
          verificationCode: 'WRONG1',
          respondedAt: Date.now(),
        })
      ).toThrow('Invalid verification code');
    });
  });

  describe('removeGuardian', () => {
    it('should remove a guardian', () => {
      const guardian = manager.addGuardian({
        name: 'Guardian',
        contact: 'g@email.com',
        contactType: 'email',
        shareIndex: 1,
      });

      expect(manager.getAllGuardians().length).toBe(1);
      manager.removeGuardian(guardian.id);
      expect(manager.getAllGuardians().length).toBe(0);
    });
  });
});

describe('RecoveryManager', () => {
  let manager: RecoveryManager;

  beforeEach(() => {
    manager = new RecoveryManager({
      timelockHours: 48,
      expirationDays: 7,
      cooldownHours: 0, // Disable cooldown for tests
    });
  });

  describe('initiateRecovery', () => {
    it('should create a recovery request', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      expect(request.status).toBe('pending');
      expect(request.walletAddress).toBe('0x123');
      expect(request.threshold).toBe(3);
      expect(request.approvals).toHaveLength(0);
    });

    it('should not allow duplicate pending requests', () => {
      manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      expect(() =>
        manager.initiateRecovery({
          walletAddress: '0x123',
          keyId: 'key-1',
          initiator: 'other@email.com',
          reason: 'Another request',
          threshold: 3,
        })
      ).toThrow('A recovery request is already pending');
    });
  });

  describe('addApproval', () => {
    it('should add guardian approval', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      const updated = manager.addApproval(request.id, {
        guardianId: 'guardian-1',
        shareIndex: 1,
        shareValue: 'share-value-1',
      });

      expect(updated.approvals).toHaveLength(1);
      expect(updated.status).toBe('pending'); // Not yet at threshold
    });

    it('should transition to approved when threshold reached', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      manager.addApproval(request.id, {
        guardianId: 'guardian-1',
        shareIndex: 1,
        shareValue: 'share-1',
      });

      manager.addApproval(request.id, {
        guardianId: 'guardian-2',
        shareIndex: 2,
        shareValue: 'share-2',
      });

      const updated = manager.addApproval(request.id, {
        guardianId: 'guardian-3',
        shareIndex: 3,
        shareValue: 'share-3',
      });

      expect(updated.status).toBe('approved');
      expect(updated.timelockExpiresAt).toBeDefined();
    });

    it('should not allow duplicate guardian approvals', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      manager.addApproval(request.id, {
        guardianId: 'guardian-1',
        shareIndex: 1,
        shareValue: 'share-1',
      });

      expect(() =>
        manager.addApproval(request.id, {
          guardianId: 'guardian-1',
          shareIndex: 1,
          shareValue: 'share-1',
        })
      ).toThrow('Guardian has already approved');
    });
  });

  describe('cancelRecovery', () => {
    it('should cancel a pending request', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      manager.cancelRecovery(request.id);

      const cancelled = manager.getRequest(request.id);
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should clear shares when cancelled', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      manager.addApproval(request.id, {
        guardianId: 'guardian-1',
        shareIndex: 1,
        shareValue: 'secret-share',
      });

      manager.cancelRecovery(request.id);

      const cancelled = manager.getRequest(request.id);
      expect(cancelled?.approvals[0].shareValue).toBe('');
    });
  });

  describe('getApprovalProgress', () => {
    it('should return correct progress', () => {
      const request = manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      let progress = manager.getApprovalProgress(request.id);
      expect(progress.current).toBe(0);
      expect(progress.required).toBe(3);
      expect(progress.percentage).toBe(0);

      manager.addApproval(request.id, {
        guardianId: 'guardian-1',
        shareIndex: 1,
        shareValue: 'share-1',
      });

      progress = manager.getApprovalProgress(request.id);
      expect(progress.current).toBe(1);
      expect(progress.percentage).toBe(33);
    });
  });

  describe('export/import', () => {
    it('should export and import data correctly', () => {
      manager.initiateRecovery({
        walletAddress: '0x123',
        keyId: 'key-1',
        initiator: 'user@email.com',
        reason: 'Lost phone',
        threshold: 3,
      });

      const exported = manager.exportData();
      expect(exported.requests).toHaveLength(1);

      const newManager = new RecoveryManager();
      newManager.importData(exported);

      const pending = newManager.getPendingRequest('0x123');
      expect(pending).toBeDefined();
      expect(pending?.walletAddress).toBe('0x123');
    });
  });
});

describe('SocialRecoveryWallet', () => {
  describe('constructor', () => {
    it('should create wallet with default config', () => {
      const wallet = new SocialRecoveryWallet();
      expect(wallet.getAddress()).toBeNull(); // Not set up yet
    });

    it('should create wallet with custom config', () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 7,
        threshold: 5,
        ownerShares: 2,
        timelockHours: 72,
      });
      expect(wallet.getAddress()).toBeNull();
    });

    it('should validate threshold >= 2', () => {
      expect(
        () => new SocialRecoveryWallet({ threshold: 1, totalShares: 5, ownerShares: 1 })
      ).toThrow('Threshold must be at least 2');
    });

    it('should validate ownerShares >= 1', () => {
      expect(
        () => new SocialRecoveryWallet({ threshold: 3, totalShares: 5, ownerShares: 0 })
      ).toThrow('Owner must have at least 1 share');
    });
  });

  describe('setup', () => {
    it('should set up wallet with guardians', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      const result = await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      expect(wallet.getAddress()).toBeTruthy();
      expect(result.guardianInvites).toHaveLength(4);
      expect(result.ownerPlainShares).toHaveLength(1);
    });

    it('should throw if guardian count mismatch', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      await expect(
        wallet.setup('owner-password', [
          { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        ])
      ).rejects.toThrow('Expected 4 guardians, got 1');
    });
  });

  describe('unlockOwnerShares', () => {
    it('should unlock with correct password', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      const result = wallet.unlockOwnerShares('owner-password');
      expect(result).toBe(true);
    });

    it('should fail with incorrect password', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      const result = wallet.unlockOwnerShares('wrong-password');
      expect(result).toBe(false);
    });
  });

  describe('signing', () => {
    it('should sign when enough shares collected', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      const result = await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      // Unlock owner share
      wallet.unlockOwnerShares('owner-password');
      expect(wallet.canSign()).toBe(false); // Only 1 share, need 3

      // Add 2 guardian shares
      wallet.addGuardianShare(result.guardianInvites[0].encryptedShare, 'pass1');
      wallet.addGuardianShare(result.guardianInvites[1].encryptedShare, 'pass2');

      expect(wallet.canSign()).toBe(true);

      const signature = await wallet.signMessage('Hello, World!');
      expect(signature).toMatch(/^0x[0-9a-f]+$/i);
    });

    it('should throw when not enough shares', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      // Only unlock owner share (1 of 3 needed)
      wallet.unlockOwnerShares('owner-password');

      await expect(wallet.signMessage('Hello')).rejects.toThrow('Need 3 shares');
    });
  });

  describe('lock', () => {
    it('should clear collected shares', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      const result = await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      wallet.unlockOwnerShares('owner-password');
      wallet.addGuardianShare(result.guardianInvites[0].encryptedShare, 'pass1');
      wallet.addGuardianShare(result.guardianInvites[1].encryptedShare, 'pass2');

      expect(wallet.canSign()).toBe(true);

      wallet.lock();

      expect(wallet.canSign()).toBe(false);
    });
  });

  describe('getSharesNeeded', () => {
    it('should return correct number of shares needed', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      const result = await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      expect(wallet.getSharesNeeded()).toBe(3);

      wallet.unlockOwnerShares('owner-password');
      expect(wallet.getSharesNeeded()).toBe(2);

      wallet.addGuardianShare(result.guardianInvites[0].encryptedShare, 'pass1');
      expect(wallet.getSharesNeeded()).toBe(1);

      wallet.addGuardianShare(result.guardianInvites[1].encryptedShare, 'pass2');
      expect(wallet.getSharesNeeded()).toBe(0);
    });
  });

  describe('recovery flow', () => {
    it('should initiate recovery', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
        timelockHours: 0, // No timelock for testing
      });

      await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      const request = wallet.initiateRecovery({
        initiator: 'new-user@email.com',
        reason: 'Lost device',
      });

      expect(request.status).toBe('pending');
      expect(wallet.getPendingRecovery()).toBeDefined();
    });

    it('should track recovery progress', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
        timelockHours: 0,
      });

      const setupResult = await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      const request = wallet.initiateRecovery({
        initiator: 'new-user@email.com',
        reason: 'Lost device',
      });

      // Get guardian info
      const guardians = wallet.getGuardians();

      let progress = wallet.getRecoveryProgress(request.id);
      expect(progress.current).toBe(0);

      // Add approvals with the plain share values (simulating guardian decrypting their share)
      wallet.addRecoveryApproval(
        request.id,
        guardians[0].id,
        setupResult.state.mpcState.keyId // Just using a placeholder - in real use this would be the decrypted share
      );

      progress = wallet.getRecoveryProgress(request.id);
      expect(progress.current).toBe(1);
    });
  });

  describe('exportData/importData', () => {
    it('should export and import wallet state', async () => {
      const wallet = new SocialRecoveryWallet({
        totalShares: 5,
        threshold: 3,
        ownerShares: 1,
      });

      await wallet.setup('owner-password', [
        { name: 'Guardian 1', contact: 'g1@email.com', contactType: 'email', sharePassword: 'pass1' },
        { name: 'Guardian 2', contact: 'g2@email.com', contactType: 'email', sharePassword: 'pass2' },
        { name: 'Guardian 3', contact: 'g3@email.com', contactType: 'email', sharePassword: 'pass3' },
        { name: 'Guardian 4', contact: 'g4@email.com', contactType: 'email', sharePassword: 'pass4' },
      ]);

      const originalAddress = wallet.getAddress();
      const exported = wallet.exportData();

      const newWallet = new SocialRecoveryWallet();
      newWallet.importData(exported);

      expect(newWallet.getAddress()).toBe(originalAddress);
      expect(newWallet.getGuardians()).toHaveLength(4);
    });
  });
});
