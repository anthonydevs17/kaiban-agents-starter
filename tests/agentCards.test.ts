import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { A2AClient } from '@a2a-js/sdk/client';

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

describe('Agent Cards', () => {
  it('publishes Basic Assistant agent card', async () => {
    const client = new A2AClient(`${baseUrl}/agents/basicAssistant/a2a`);
    const card = await client.getAgentCard();
    expect(card).toBeTruthy();
    expect(card.name).toBeTypeOf('string');
    expect(card.description).toBeTypeOf('string');
    expect(card.protocolVersion).toBeTypeOf('string');
    expect(card.capabilities).toBeTypeOf('object');
    expect(card.url).toContain('/agents/basicAssistant/a2a');
  });

  it('publishes Meta Assistant agent card', async () => {
    const client = new A2AClient(`${baseUrl}/agents/metaAssistant/a2a`);
    const card = await client.getAgentCard();
    expect(card).toBeTruthy();
    expect(card.name).toBeTypeOf('string');
    expect(card.description).toBeTypeOf('string');
    expect(card.protocolVersion).toBeTypeOf('string');
    expect(card.capabilities).toBeTypeOf('object');
    expect(card.url).toContain('/agents/metaAssistant/a2a');
  });
});
