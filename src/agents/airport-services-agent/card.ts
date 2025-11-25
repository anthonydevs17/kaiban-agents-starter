/**
 * @fileoverview Agent Card Configuration for A2A Protocol Discovery
 *
 * This module defines the agent card metadata that describes the Airport Services Advisor Agent's
 * capabilities, endpoints, and configuration following the A2A protocol specification.
 *
 * The agent card is served at: /.well-known/agent-card.json
 *
 * @module agents/airport-services-agent/card
 */

import { AgentCard } from '@a2a-js/sdk';

/**
 * Agent Card for Airport Services Advisor Agent
 *
 * @description This function returns the agent card with discovery information for the A2A protocol:
 * - Agent identity (name, version, description)
 * - Endpoint URL for agent communication
 * - Supported input/output modes
 * - Available skills and capabilities
 * - Protocol version compatibility
 *
 * @param url - The complete agent endpoint URL (e.g., http://localhost:4000/agents/airportServices/a2a or https://tunnel-url.loca.lt/agents/airportServices/a2a)
 * @returns {AgentCard} The agent card configuration
 *
 * @example
 * ```typescript
 * const card = airportServicesAgentCard('http://localhost:4000/agents/airportServices/a2a');
 * // Returns agent card with url: 'http://localhost:4000/agents/airportServices/a2a'
 * ```
 */
export const airportServicesAgentCard = (url: string): AgentCard => ({
  name: 'Airport Services Advisor Agent',
  description:
    'Agent that recommends airport services, lounges, restaurants, and amenities based on airport and travel preferences',

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
      id: 'airport-services-advisor',
      name: 'Airport Services Advisor',
      description:
        'Agent that recommends airport services, lounges, restaurants, and amenities based on airport and travel preferences',
      // Tags help with agent discovery and matching user intents
      tags: [
        'airport',
        'lounge',
        'services',
        'amenities',
        'travel',
        'recommendations',
        'airport-services',
      ],
    },
  ],

  // Agent capabilities for client negotiation
  capabilities: {
    streaming: true, // Supports Server-Sent Events (SSE) for real-time responses
    pushNotifications: false, // Does not support push notifications
    stateTransitionHistory: false, // Does not maintain state history
  },
});
