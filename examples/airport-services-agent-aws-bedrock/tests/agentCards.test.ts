import { A2AClient } from '@a2a-js/sdk/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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
  it('publishes Airport Services Advisor agent card', async () => {
    const client = new A2AClient(`${baseUrl}/agents/airportServices/a2a`);
    const card = await client.getAgentCard();

    // Verify card structure
    expect(card).toBeTruthy();
    expect(card.name).toBe('Airport Services Advisor Agent');
    expect(card.description).toBe(
      'Agent that recommends airport services, lounges, restaurants, and amenities based on airport and travel preferences',
    );
    expect(card.protocolVersion).toBe('0.3.0');
    expect(card.version).toBe('0.1.0');

    // Verify types
    expect(card.name).toBeTypeOf('string');
    expect(card.description).toBeTypeOf('string');
    expect(card.protocolVersion).toBeTypeOf('string');
    expect(card.capabilities).toBeTypeOf('object');

    // Verify URL contains the correct path
    expect(card.url).toContain('/agents/airportServices/a2a');

    // Verify input/output modes
    expect(card.defaultInputModes).toEqual(['text']);
    expect(card.defaultOutputModes).toEqual(['text']);

    // Verify skills
    expect(card.skills).toBeDefined();
    expect(card.skills).toHaveLength(1);
    expect(card.skills[0].id).toBe('airport-services-advisor');
    expect(card.skills[0].name).toBe('Airport Services Advisor');

    // Verify capabilities
    expect(card.capabilities.streaming).toBe(true);
    expect(card.capabilities.pushNotifications).toBe(false);
    expect(card.capabilities.stateTransitionHistory).toBe(false);
  });
});
