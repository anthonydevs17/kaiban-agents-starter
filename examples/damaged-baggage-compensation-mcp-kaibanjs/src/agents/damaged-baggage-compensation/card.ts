/**
 * @fileoverview Agent Card Configuration for A2A Protocol Discovery
 *
 * Defines the agent card metadata for the Damaged Baggage Compensation Agent.
 * Served at: /.well-known/agent-card.json
 *
 * @module agents/damaged-baggage-compensation/card
 */

import { AgentCard } from '@a2a-js/sdk';

export const damagedBaggageCompensationAgentCard = (url: string): AgentCard => ({
  name: 'Damaged Baggage Compensation Agent',
  description:
    'Agent that validates baggage damage claims and generates instant compensation offers using airline policy, historical payouts, and real-time market values for damaged items.',

  protocolVersion: '0.3.0',
  version: '0.1.0',
  url,

  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],

  skills: [
    {
      id: 'damaged-baggage-compensation',
      name: 'Damaged Baggage Compensation',
      description:
        'Validates claim data, calculates compensation from policy and market prices (Tavily), and produces a defensible compensation offer for airport staff.',
      tags: ['baggage', 'compensation', 'claims', 'airline', 'damaged-baggage', 'airport-ops'],
    },
  ],

  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
});
