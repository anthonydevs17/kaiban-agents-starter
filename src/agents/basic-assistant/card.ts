import { AgentCard } from '@a2a-js/sdk';

/**
 * AgentCard: advertises this agent's capabilities for discovery.
 *
 * Key fields (A2A):
 * - `url`: base route where the A2A endpoints are exposed
 * - `skills`: human-readable capabilities for marketplaces/directories
 * - `capabilities`: transport features like streaming or push notifications
 */
export const basicAssistantCard: AgentCard = {
  name: 'Basic Assistant (Sample)',
  description: 'Sample agent that echoes user input back.',
  protocolVersion: '0.3.0',
  version: '0.1.0',
  url: `${process.env.A2A_BASE_URL || 'http://localhost:4000'}/agents/basicAssistant/a2a`,
  defaultInputModes: ['text'],
  defaultOutputModes: ['text'],
  skills: [
    {
      id: 'basic-assistant',
      name: 'Basic Assistant',
      description: 'Echo sample for quick start',
      tags: ['sample', 'echo', 'starter'],
    },
  ],
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
  },
};
