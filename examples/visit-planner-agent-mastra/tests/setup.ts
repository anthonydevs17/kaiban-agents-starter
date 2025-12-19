import { vi } from 'vitest';

/**
 * Setup test environment variables
 *
 * These variables are required by KaibanController.build() but are not
 * needed in tests since we mock the Kaiban SDK.
 */
process.env.KAIBAN_TENANT = 'test-tenant';
process.env.KAIBAN_API_TOKEN = 'test-token';
process.env.KAIBAN_AGENT_ID = 'test-agent-id';
process.env.OPENAI_API_KEY = 'test-openai-key';

/**
 * Mock @kaiban/sdk to avoid requiring Kaiban platform runtime in tests.
 *
 * This mock provides stub implementations of all KaibanClient methods
 * used by the Visit Planner Agent, allowing tests to run without
 * connecting to a real Kaiban platform instance.
 */
vi.mock('@kaiban/sdk', () => {
  return {
    createKaibanClient: vi.fn(() => ({
      // Agent operations
      agents: {
        get: vi.fn(async (id: string) => ({
          id,
          name: 'Visit Planner Agent',
          type: 'agent',
        })),
      },

      // Card operations
      cards: {
        get: vi.fn(async (id: string) => ({
          id,
          description: 'Test card description',
          column_key: 'todo',
          status: 'todo',
          board_id: 'test-board',
          team_id: 'test-team',
        })),
        update: vi.fn(async () => ({})),
        createBatchActivities: vi.fn(async () => ({})),
      },

      // Cost calculation operations
      costs: {
        calculateCosts: vi.fn((_usages: any[]) => ({
          totalCost: 0.001,
          totalTokens: 100,
          costsByModel: {
            'gpt-4o-mini': {
              model: 'gpt-4o-mini',
              inputTokens: 50,
              outputTokens: 50,
              totalTokens: 100,
              inputCost: 0.0005,
              outputCost: 0.0005,
              totalCost: 0.001,
            },
          },
        })),
      },
    })),

    // Export enums and types used in the code
    ActivityType: {
      CARD_CREATED: 'CARD_CREATED',
      CARD_CLONED: 'CARD_CLONED',
      CARD_AGENT_ADDED: 'CARD_AGENT_ADDED',
      CARD_COLUMN_CHANGED: 'CARD_COLUMN_CHANGED',
      CARD_STATUS_CHANGED: 'CARD_STATUS_CHANGED',
      THREAD_STEP_COSTS: 'THREAD_STEP_COSTS',
    },

    CardStatus: {
      TODO: 'todo',
      DOING: 'doing',
      DONE: 'done',
      BLOCKED: 'blocked',
    },

    A2ADataPartType: {
      KAIBAN_ACTIVITY: 'kaiban_activity',
    },
  };
});

/**
 * Mock @mastra/core/agent and @ai-sdk/openai to avoid requiring actual API calls in tests
 */
vi.mock('@mastra/core/agent', () => {
  return {
    Agent: vi.fn().mockImplementation(() => ({
      generate: vi.fn(async () => ({
        text: 'Mocked response from Visit Planner Agent',
        usage: {
          inputTokens: 50,
          outputTokens: 50,
          reasoningTokens: 0,
        },
      })),
    })),
  };
});

vi.mock('@ai-sdk/openai', () => {
  return {
    openai: {
      responses: vi.fn(() => ({})),
    },
  };
});
