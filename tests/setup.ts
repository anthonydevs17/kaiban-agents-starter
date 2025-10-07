import { vi } from 'vitest';

// Mock kaiban-sdk to avoid requiring its runtime files in this project
vi.mock('kaiban-sdk', () => {
  return {
    createKaibanClient: vi.fn(() => ({
      activities: { create: vi.fn(async () => {}) },
      cards: { moveToColumn: vi.fn(async () => {}) },
    })),
  };
});
