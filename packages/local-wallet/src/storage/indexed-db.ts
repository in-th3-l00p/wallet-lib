import { openDB, type IDBPDatabase } from 'idb';
import type { StorageAdapter } from '@panoplia/core';

const DB_NAME = 'panoplia-wallet';
const DB_VERSION = 1;
const STORE_NAME = 'wallet-data';

/**
 * IndexedDB storage adapter for web applications
 * Provides encrypted blob storage for wallet data
 */
export class IndexedDBStorage implements StorageAdapter {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async init(): Promise<void> {
    if (this.db) return;

    // Prevent multiple concurrent initializations
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create object store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    })();

    await this.initPromise;
  }

  /**
   * Ensure database is initialized before any operation
   */
  private async ensureDb(): Promise<IDBPDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  /**
   * Store encrypted wallet data
   */
  async setWalletData(key: string, data: Uint8Array): Promise<void> {
    const db = await this.ensureDb();
    await db.put(STORE_NAME, data, key);
  }

  /**
   * Retrieve encrypted wallet data
   */
  async getWalletData(key: string): Promise<Uint8Array | null> {
    const db = await this.ensureDb();
    const data = await db.get(STORE_NAME, key);
    return data ?? null;
  }

  /**
   * Delete wallet data
   */
  async deleteWalletData(key: string): Promise<void> {
    const db = await this.ensureDb();
    await db.delete(STORE_NAME, key);
  }

  /**
   * Check if wallet data exists
   */
  async hasWalletData(key: string): Promise<boolean> {
    const db = await this.ensureDb();
    const data = await db.get(STORE_NAME, key);
    return data !== undefined;
  }

  /**
   * List all wallet data keys
   */
  async listKeys(): Promise<string[]> {
    const db = await this.ensureDb();
    const keys = await db.getAllKeys(STORE_NAME);
    return keys.map((k) => String(k));
  }

  /**
   * Clear all wallet data
   */
  async clear(): Promise<void> {
    const db = await this.ensureDb();
    await db.clear(STORE_NAME);
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

/**
 * Create an IndexedDB storage adapter
 */
export function createIndexedDBStorage(): IndexedDBStorage {
  return new IndexedDBStorage();
}
