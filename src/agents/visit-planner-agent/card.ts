/**
 * @fileoverview Agent Card Configuration for A2A Protocol Discovery
 *
 * This module defines the agent card metadata that describes the Visit Planner Agent's
 * capabilities, endpoints, and configuration following the A2A protocol specification.
 *
 * The agent card is served at: /.well-known/agent-card.json
 *
 * @module agents/visit-planner-agent/card
 */

import { AgentCard } from '@a2a-js/sdk';

/**
 * Agent Card for Visit Planner Agent
 *
 * @description This card provides discovery information for the A2A protocol:
 * - Agent identity (name, version, description)
 * - Endpoint URL for agent communication
 * - Supported input/output modes
 * - Available skills and capabilities
 * - Protocol version compatibility
 *
 * @remarks The URL field uses A2A_BASE_URL environment variable:
 * - Development: Defaults to http://localhost:4000
 * - Ngrok/Tunneling: Set to your ngrok URL (e.g., https://abc123.ngrok-free.app)
 * - Production: Set to your production domain (e.g., https://api.yourapp.com)
 *
 * @constant
 * @type {AgentCard}
 */
export const visitPlannerAgentCard: AgentCard = {
  name: 'Visit Planner Agent',
  description: 'Agent that recommends places to visit in a city',

  // A2A protocol version this agent supports
  protocolVersion: '0.3.0',

  // Agent version for tracking changes and updates
  version: '0.1.0',

  // Public endpoint URL - uses A2A_BASE_URL env var or localhost default
  url: `${process.env.A2A_BASE_URL || `http://localhost:4000`}/agents/visitPlanner/a2a`,

  // Agent accepts text-based input from users
  defaultInputModes: ['text'],

  // Agent responds with text-based output
  defaultOutputModes: ['text'],

  // Skills define what this agent can do
  skills: [
    {
      id: 'visit-planner',
      name: 'Visit Planner',
      description: 'Agent that recommends places to visit in a city',
      // Tags help with agent discovery and matching user intents
      tags: ['visit', 'planner', 'recommendations', 'city', 'places', 'visit-planner'],
    },
  ],

  // Agent capabilities for client negotiation
  capabilities: {
    streaming: true, // Supports Server-Sent Events (SSE) for real-time responses
    pushNotifications: false, // Does not support push notifications
    stateTransitionHistory: false, // Does not maintain state history
  },
};
