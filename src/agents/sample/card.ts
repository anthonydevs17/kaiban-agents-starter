/**
 * @fileoverview Agent Card Configuration for A2A Protocol Discovery
 *
 * This module defines the agent card metadata that describes the Sample Agent's
 * capabilities, endpoints, and configuration following the A2A protocol specification.
 *
 * The agent card is served at: /.well-known/agent-card.json
 *
 * @module agents/sample/card
 */

import { AgentCard } from '@a2a-js/sdk';

/**
 * Agent Card for Sample Agent
 *
 * @description This function returns the agent card with discovery information for the A2A protocol:
 * - Agent identity (name, version, description)
 * - Endpoint URL for agent communication
 * - Supported input/output modes
 * - Available skills and capabilities
 * - Protocol version compatibility
 *
 * @param url - The complete agent endpoint URL (e.g., http://localhost:4000/agents/sample/a2a or https://tunnel-url.loca.lt/agents/sample/a2a)
 * @returns {AgentCard} The agent card configuration
 *
 * @example
 * ```typescript
 * const card = sampleAgentCard('http://localhost:4000/agents/sample/a2a');
 * // Returns agent card with url: 'http://localhost:4000/agents/sample/a2a'
 * ```
 */
export const sampleAgentCard = (url: string): AgentCard => ({
  name: 'Sample Agent',
  description: 'Template agent for building custom A2A protocol agents',

  // A2A protocol version this agent supports
  protocolVersion: '0.3.0',

  // Agent version for tracking changes and updates
  version: '0.1.0',

  // Public endpoint URL - complete agent endpoint URL
  url,

  // Agent accepts text-based input from users
  defaultInputModes: ['text'],

  // Agent responds with text-based output
  defaultOutputModes: ['text'],

  // Skills define what this agent can do
  skills: [
    {
      id: 'agent-sample',
      name: 'Sample Agent',
      description: 'Template agent for building custom A2A protocol agents',
      // Tags help with agent discovery and matching user intents
      tags: ['sample', 'template', 'agent-sample'],
    },
  ],

  // Agent capabilities for client negotiation
  capabilities: {
    streaming: true, // Supports Server-Sent Events (SSE) for real-time responses
    pushNotifications: false, // Does not support push notifications
    stateTransitionHistory: false, // Does not maintain state history
  },
});
