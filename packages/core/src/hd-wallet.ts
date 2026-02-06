import { HDNodeWallet, Mnemonic, randomBytes, Wallet } from 'ethers';
import type { Account } from './types.js';

/**
 * BIP-44 coin types
 * https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */
export const COIN_TYPES = {
  ETHEREUM: 60,
  ETHEREUM_CLASSIC: 61,
  POLYGON: 966, // Some wallets use 60 for all EVM chains
} as const;

/**
 * Default derivation path for Ethereum (BIP-44)
 * m / purpose' / coin_type' / account' / change / address_index
 */
export const DEFAULT_DERIVATION_PATH = "m/44'/60'/0'/0";

/**
 * Generate a new BIP-39 mnemonic phrase
 * @param wordCount Number of words (12 = 128 bits, 24 = 256 bits of entropy)
 * @returns Mnemonic phrase
 */
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
  const entropyBytes = wordCount === 12 ? 16 : 32;
  const entropy = randomBytes(entropyBytes);
  const mnemonic = Mnemonic.fromEntropy(entropy);
  return mnemonic.phrase;
}

/**
 * Validate a BIP-39 mnemonic phrase
 * @param phrase Mnemonic phrase to validate
 * @returns true if valid
 */
export function validateMnemonic(phrase: string): boolean {
  try {
    Mnemonic.fromPhrase(phrase);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the base HD node from a mnemonic at the standard Ethereum path
 * @param mnemonic BIP-39 mnemonic phrase
 * @param passphrase Optional BIP-39 passphrase (not the encryption password)
 * @returns HDNodeWallet at the standard Ethereum derivation path
 */
export function getMasterNode(mnemonic: string, passphrase?: string): HDNodeWallet {
  // HDNodeWallet.fromPhrase returns wallet at m/44'/60'/0'/0/0
  // The passphrase parameter is the BIP-39 passphrase, not a path
  return HDNodeWallet.fromPhrase(mnemonic, passphrase);
}

/**
 * Derive an account from a mnemonic using BIP-44 path
 * @param mnemonic BIP-39 mnemonic phrase
 * @param accountIndex Account index (0-based)
 * @param coinType BIP-44 coin type (default: 60 for Ethereum)
 * @returns HDNodeWallet for the derived account
 */
export function deriveAccount(
  mnemonic: string,
  accountIndex: number,
  coinType: number = COIN_TYPES.ETHEREUM
): HDNodeWallet {
  const path = `m/44'/${coinType}'/0'/0/${accountIndex}`;
  // Use HDNodeWallet.fromPhrase with the full path directly
  return HDNodeWallet.fromPhrase(mnemonic, undefined, path);
}

/**
 * Derive multiple accounts from a mnemonic
 * @param mnemonic BIP-39 mnemonic phrase
 * @param count Number of accounts to derive
 * @param startIndex Starting account index
 * @returns Array of derived accounts
 */
export function deriveAccounts(
  mnemonic: string,
  count: number,
  startIndex: number = 0
): Account[] {
  const accounts: Account[] = [];

  for (let i = startIndex; i < startIndex + count; i++) {
    const path = `m/44'/${COIN_TYPES.ETHEREUM}'/0'/0/${i}`;
    const node = HDNodeWallet.fromPhrase(mnemonic, undefined, path);
    accounts.push({
      address: node.address,
      derivationPath: path,
      index: i,
    });
  }

  return accounts;
}

/**
 * Get the private key for a derived account
 * WARNING: Handle with extreme care - never log or expose
 * @param mnemonic BIP-39 mnemonic phrase
 * @param accountIndex Account index
 * @returns Private key hex string (with 0x prefix)
 */
export function getPrivateKey(mnemonic: string, accountIndex: number): string {
  const wallet = deriveAccount(mnemonic, accountIndex);
  return wallet.privateKey;
}

/**
 * Convert private key to account
 * @param privateKey Private key (hex string with or without 0x prefix)
 * @returns Account with address (no derivation path since imported)
 */
export function privateKeyToAccount(privateKey: string): Account {
  const wallet = new Wallet(privateKey);
  return {
    address: wallet.address,
    derivationPath: '', // No path for imported keys
    index: -1, // -1 indicates imported
  };
}

/**
 * Normalize a mnemonic phrase (lowercase, single spaces)
 */
export function normalizeMnemonic(phrase: string): string {
  return phrase
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .join(' ');
}

/**
 * Get word count from mnemonic
 */
export function getMnemonicWordCount(phrase: string): number {
  return normalizeMnemonic(phrase).split(' ').length;
}
