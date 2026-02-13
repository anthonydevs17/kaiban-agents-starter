import { describe, expect, it } from 'vitest';

import { damagedBaggageCompensationAgentCard } from '../src/agents/damaged-baggage-compensation/card';

describe('Agent Cards', () => {
  it('exposes Damaged Baggage Compensation agent card metadata', () => {
    const card = damagedBaggageCompensationAgentCard(
      'http://localhost:4001/damagedBaggageCompensation/a2a',
    );

    expect(card).toBeTruthy();
    expect(card.name).toBe('Damaged Baggage Compensation Agent');
    expect(card.description).toContain('validates baggage damage claims');
    expect(card.description).toContain('compensation offers');
    expect(card.protocolVersion).toBe('0.3.0');
    expect(card.version).toBe('0.1.0');

    expect(card.name).toBeTypeOf('string');
    expect(card.description).toBeTypeOf('string');
    expect(card.protocolVersion).toBeTypeOf('string');
    expect(card.capabilities).toBeTypeOf('object');

    expect(card.url).toContain('/damagedBaggageCompensation/a2a');

    expect(card.defaultInputModes).toEqual(['text']);
    expect(card.defaultOutputModes).toEqual(['text']);

    expect(card.skills).toBeDefined();
    expect(card.skills).toHaveLength(1);
    expect(card.skills![0].id).toBe('damaged-baggage-compensation');
    expect(card.skills![0].name).toBe('Damaged Baggage Compensation');

    expect(card.capabilities!.streaming).toBe(true);
    expect(card.capabilities!.pushNotifications).toBe(false);
    expect(card.capabilities!.stateTransitionHistory).toBe(false);
  });
});
