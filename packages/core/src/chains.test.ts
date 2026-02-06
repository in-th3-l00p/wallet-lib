import { describe, it, expect } from 'vitest';
import {
  ethereum,
  sepolia,
  polygon,
  arbitrum,
  optimism,
  base,
  chains,
  getChain,
  getMainnetChains,
  getTestnetChains,
  addChain,
  getRpcUrl,
  getExplorerUrl,
  getTransactionUrl,
  getAddressUrl,
} from './chains.js';

describe('chains', () => {
  describe('chain configurations', () => {
    it('should have correct Ethereum mainnet config', () => {
      expect(ethereum.chainId).toBe(1);
      expect(ethereum.name).toBe('Ethereum');
      expect(ethereum.nativeCurrency.symbol).toBe('ETH');
      expect(ethereum.nativeCurrency.decimals).toBe(18);
      expect(ethereum.testnet).toBeUndefined();
    });

    it('should have correct Sepolia testnet config', () => {
      expect(sepolia.chainId).toBe(11155111);
      expect(sepolia.name).toBe('Sepolia');
      expect(sepolia.testnet).toBe(true);
    });

    it('should have correct Polygon config', () => {
      expect(polygon.chainId).toBe(137);
      expect(polygon.nativeCurrency.symbol).toBe('MATIC');
    });

    it('should have correct Arbitrum config', () => {
      expect(arbitrum.chainId).toBe(42161);
      expect(arbitrum.nativeCurrency.symbol).toBe('ETH');
    });

    it('should have correct Optimism config', () => {
      expect(optimism.chainId).toBe(10);
      expect(optimism.nativeCurrency.symbol).toBe('ETH');
    });

    it('should have correct Base config', () => {
      expect(base.chainId).toBe(8453);
      expect(base.nativeCurrency.symbol).toBe('ETH');
    });

    it('should have RPC URLs for all chains', () => {
      Object.values(chains).forEach((chain) => {
        expect(chain.rpcUrls.length).toBeGreaterThan(0);
        expect(chain.rpcUrls[0]).toMatch(/^https?:\/\//);
      });
    });

    it('should have block explorers for all chains', () => {
      Object.values(chains).forEach((chain) => {
        expect(chain.blockExplorers).toBeDefined();
        expect(chain.blockExplorers!.length).toBeGreaterThan(0);
        expect(chain.blockExplorers![0].url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('getChain', () => {
    it('should return chain by chainId', () => {
      const eth = getChain(1);
      expect(eth).toBe(ethereum);

      const poly = getChain(137);
      expect(poly).toBe(polygon);
    });

    it('should return undefined for unknown chainId', () => {
      const unknown = getChain(999999);
      expect(unknown).toBeUndefined();
    });
  });

  describe('getMainnetChains', () => {
    it('should return only mainnet chains', () => {
      const mainnets = getMainnetChains();

      expect(mainnets.length).toBeGreaterThan(0);
      mainnets.forEach((chain) => {
        expect(chain.testnet).not.toBe(true);
      });
    });

    it('should include major mainnets', () => {
      const mainnets = getMainnetChains();
      const chainIds = mainnets.map((c) => c.chainId);

      expect(chainIds).toContain(1); // Ethereum
      expect(chainIds).toContain(137); // Polygon
      expect(chainIds).toContain(42161); // Arbitrum
      expect(chainIds).toContain(10); // Optimism
      expect(chainIds).toContain(8453); // Base
    });
  });

  describe('getTestnetChains', () => {
    it('should return only testnet chains', () => {
      const testnets = getTestnetChains();

      expect(testnets.length).toBeGreaterThan(0);
      testnets.forEach((chain) => {
        expect(chain.testnet).toBe(true);
      });
    });

    it('should include Sepolia', () => {
      const testnets = getTestnetChains();
      const chainIds = testnets.map((c) => c.chainId);

      expect(chainIds).toContain(11155111); // Sepolia
    });
  });

  describe('addChain', () => {
    it('should add a custom chain', () => {
      const customChain = {
        chainId: 123456,
        name: 'Custom Chain',
        nativeCurrency: {
          name: 'Custom',
          symbol: 'CUST',
          decimals: 18,
        },
        rpcUrls: ['https://rpc.custom.chain'],
        blockExplorers: [{ name: 'CustomScan', url: 'https://custom.scan' }],
      };

      addChain(customChain);

      const retrieved = getChain(123456);
      expect(retrieved).toEqual(customChain);

      // Clean up
      delete chains[123456];
    });

    it('should override existing chain', () => {
      const originalRpc = ethereum.rpcUrls[0];

      addChain({
        ...ethereum,
        rpcUrls: ['https://new-rpc.example.com'],
      });

      const updated = getChain(1);
      expect(updated?.rpcUrls[0]).toBe('https://new-rpc.example.com');

      // Restore original
      addChain({ ...ethereum, rpcUrls: [originalRpc, ...ethereum.rpcUrls.slice(1)] });
    });
  });

  describe('getRpcUrl', () => {
    it('should return first RPC URL for chain', () => {
      const url = getRpcUrl(1);
      expect(url).toBe(ethereum.rpcUrls[0]);
    });

    it('should return undefined for unknown chain', () => {
      const url = getRpcUrl(999999);
      expect(url).toBeUndefined();
    });
  });

  describe('getExplorerUrl', () => {
    it('should return explorer URL for chain', () => {
      const url = getExplorerUrl(1);
      expect(url).toBe('https://etherscan.io');
    });

    it('should return undefined for unknown chain', () => {
      const url = getExplorerUrl(999999);
      expect(url).toBeUndefined();
    });
  });

  describe('getTransactionUrl', () => {
    it('should return full transaction URL', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const url = getTransactionUrl(1, txHash);

      expect(url).toBe(`https://etherscan.io/tx/${txHash}`);
    });

    it('should return undefined for unknown chain', () => {
      const url = getTransactionUrl(999999, '0x123');
      expect(url).toBeUndefined();
    });
  });

  describe('getAddressUrl', () => {
    it('should return full address URL', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f5d123';
      const url = getAddressUrl(1, address);

      expect(url).toBe(`https://etherscan.io/address/${address}`);
    });

    it('should return undefined for unknown chain', () => {
      const url = getAddressUrl(999999, '0x123');
      expect(url).toBeUndefined();
    });
  });

  describe('chain uniqueness', () => {
    it('should have unique chain IDs', () => {
      const chainIds = Object.keys(chains).map(Number);
      const uniqueIds = new Set(chainIds);

      expect(uniqueIds.size).toBe(chainIds.length);
    });

    it('should have unique names', () => {
      const names = Object.values(chains).map((c) => c.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
