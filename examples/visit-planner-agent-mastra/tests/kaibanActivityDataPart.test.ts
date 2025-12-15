import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createClientFromServer } from './helpers/a2aClient';
import { startTestServer } from './helpers/testServer';

let baseUrl = '';
let close: () => Promise<void>;

beforeAll(async () => {
  const s = await startTestServer();
  baseUrl = s.baseUrl;
  close = s.close;
});

afterAll(async () => {
  await close();
});

describe('kaiban_activity data part handling', () => {
  it('Visit Planner agent listens to kaiban_activity without error and completes', async () => {
    const params = {
      message: {
        kind: 'message' as const,
        messageId: 'm-kaiban-1',
        role: 'user' as const,
        metadata: { card_id: 'c1', board_id: 'b1', team_id: 't1' },
        parts: [
          {
            kind: 'data' as const,
            data: {
              type: 'kaiban_activity',
              activity: {
                type: 'CARD_CREATED',
                card_id: 'test-card-id',
                board_id: 'test-board-id',
                team_id: 'test-team-id',
                actor: {
                  id: 'test-user',
                  type: 'user',
                  name: 'Test User',
                },
              },
            },
          },
        ],
      },
    };

    const client = await createClientFromServer(baseUrl, '/agents/visitPlanner/a2a');
    const rpc = await client.sendMessage(params);
    const result = (rpc as any).result;

    // Verify the result is either a message or task
    expect(result.kind === 'message' || result.kind === 'task').toBeTruthy();
  });
});
