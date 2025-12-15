/**
 * @fileoverview A2A Request Handler Configuration for Airport Services Advisor Agent
 *
 * This module assembles the A2A request handler by combining:
 * - Agent Card (metadata and discovery information)
 * - Task Store (in-memory task state management)
 * - Agent Executor (business logic and execution flow)
 *
 * The handler is responsible for processing incoming A2A protocol requests
 * and routing them to the appropriate executor methods.
 *
 * @module agents/airport-services-agent/handler
 */

import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { airportServicesAgentCard } from './card';
import { tasksStore, airportServicesAgentExecutor } from './executor';

/**
 * Create A2A Request Handler for the Airport Services Advisor Agent
 *
 * @description This function creates a handler that integrates three core components:
 *
 * 1. **Agent Card** (airportServicesAgentCard):
 *    - Provides agent metadata for A2A protocol discovery
 *    - Served at /.well-known/agent-card.json
 *    - Contains agent capabilities, skills, and endpoints
 *
 * 2. **Task Store** (tasksStore):
 *    - In-memory storage for managing task state and history
 *    - Tracks ongoing and completed tasks
 *    - Enables task status queries and management
 *
 * 3. **Agent Executor** (airportServicesAgentExecutor):
 *    - Contains the business logic for processing tasks
 *    - Manages the execution lifecycle (submitted → working → completed)
 *    - Integrates with Kaiban platform and AWS Bedrock AI models
 *
 * @param baseUrl - The base URL for the server (e.g., http://localhost:4000 or https://tunnel-url.loca.lt)
 * @returns {DefaultRequestHandler} Configured handler instance
 *
 * @remarks
 * The DefaultRequestHandler from @a2a-js/sdk automatically:
 * - Handles A2A protocol compliance
 * - Routes requests to the executor
 * - Manages SSE (Server-Sent Events) for streaming responses
 * - Serves the agent card at the .well-known endpoint
 * - Validates incoming requests against the A2A specification
 *
 * @example
 * ```typescript
 * // With localhost
 * const handler = createAirportServicesAgentHandler('http://localhost:4000');
 * // Agent URL will be: http://localhost:4000/agents/airportServices/a2a
 *
 * // With tunnel
 * const handler = createAirportServicesAgentHandler('https://abc123.loca.lt');
 * // Agent URL will be: https://abc123.loca.lt/agents/airportServices/a2a
 * ```
 *
 * @see {@link airportServicesAgentCard} for agent metadata configuration
 * @see {@link airportServicesAgentExecutor} for execution logic implementation
 */
export const createAirportServicesAgentHandler = (agentUrl: string) => {
  return new DefaultRequestHandler(
    airportServicesAgentCard(agentUrl), // Create agent card with complete endpoint URL
    tasksStore,
    airportServicesAgentExecutor,
  );
};

export const setupAirportServicesAgentRoutes = (app: express.Express, baseUrl: string) => {
  const path = '/airportServices/a2a';
  const agentUrl = `${baseUrl}${path}`;
  new A2AExpressApp(createAirportServicesAgentHandler(agentUrl)).setupRoutes(app, path);
  return { agentUrl, cardUrl: `${agentUrl}/.well-known/agent-card.json` };
};
