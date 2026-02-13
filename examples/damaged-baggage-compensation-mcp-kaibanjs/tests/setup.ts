import { vi } from 'vitest';

process.env.KAIBAN_TENANT = 'test-tenant';
process.env.KAIBAN_API_TOKEN = 'test-token';
process.env.KAIBAN_DAMAGED_BAGGAGE_COMPENSATION_AGENT_ID = 'test-agent-id';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.TAVILY_API_KEY = 'test-tavily-key';

vi.mock('@kaiban/sdk', () => ({
  A2ADataPartType: {
    KAIBAN_ACTIVITY: 'kaiban_activity',
  },
}));

vi.mock('../src/agents/damaged-baggage-compensation/controller/kaiban-mcp-client', () => ({
  getKaibanTools: vi.fn(async () => []),
  getCard: vi.fn(async (cardId: string) => ({
    id: cardId,
    description:
      'Claim #BGC-2025-00123. Passenger: John Smith. PNR: ABC123. Flight: AA100. Damage: wheel broken. Items: Samsonite 28" spinner (2 years old), Nike backpack.',
    column_key: 'todo',
    status: 'todo',
    board_id: 'test-board',
    team_id: 'test-team',
  })),
  moveCardToBlocked: vi.fn(async () => {}),
}));

vi.mock('kaibanjs', () => ({
  Agent: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    ...config,
    type: config.type || 'Agent',
  })),
  Task: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    ...config,
  })),
  Team: vi.fn().mockImplementation((config: Record<string, unknown>) => ({
    ...config,
    start: vi.fn(async () => ({
      result: {
        valid: true,
        compensationAmount: 180,
        currency: 'USD',
        breakdown: [],
        policyApplied: 'Mock policy applied.',
      },
    })),
  })),
}));
