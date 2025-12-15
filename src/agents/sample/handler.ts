/**
 * @fileoverview A2A Request Handler Configuration for Sample Agent
 *
 * This module assembles the A2A request handler by combining:
 * - Agent Card (metadata and discovery information)
 * - Task Store (in-memory task state management)
 * - Agent Executor (business logic and execution flow)
 *
 * The handler is responsible for processing incoming A2A protocol requests
 * and routing them to the appropriate executor methods.
 *
 * @module agents/sample/handler
 */

import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { sampleAgentCard } from './card';
import { tasksStore, sampleAgentExecutor } from './executor';

/**
 * Create A2A Request Handler for the Sample Agent
 *
 * @description This function creates a handler that integrates three core components:
 *
 * 1. **Agent Card** (sampleAgentCard):
 *    - Provides agent metadata for A2A protocol discovery
 *    - Served at /.well-known/agent-card.json
 *    - Contains agent capabilities, skills, and endpoints
 *
 * 2. **Task Store** (tasksStore):
 *    - In-memory storage for managing task state and history
 *    - Tracks ongoing and completed tasks
 *    - Enables task status queries and management
 *
 * 3. **Agent Executor** (sampleAgentExecutor):
 *    - Contains the business logic for processing tasks
 *    - Manages the execution lifecycle (submitted → working → completed)
 *    - Integrates with Kaiban platform and AI models
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
 * const handler = createSampleAgentHandler('http://localhost:4000');
 * // Agent URL will be: http://localhost:4000/agents/sample/a2a
 *
 * // With tunnel
 * const handler = createSampleAgentHandler('https://abc123.loca.lt');
 * // Agent URL will be: https://abc123.loca.lt/agents/sample/a2a
 * ```
 *
 * @see {@link sampleAgentCard} for agent metadata configuration
 * @see {@link sampleAgentExecutor} for execution logic implementation
 * @see {@link examples/visit-planner-agent} for a Mastra/OpenAI implementation example
 * @see {@link examples/airport-services-agent} for an AWS Bedrock implementation example
 */
export const createSampleAgentHandler = (agentUrl: string) => {
  return new DefaultRequestHandler(
    sampleAgentCard(agentUrl), // Create agent card with complete endpoint URL
    tasksStore,
    sampleAgentExecutor,
  );
};

export const setupSampleAgentRoutes = (app: express.Express, baseUrl: string) => {
  const path = '/sample/a2a';
  const agentUrl = `${baseUrl}${path}`;
  new A2AExpressApp(createSampleAgentHandler(agentUrl)).setupRoutes(app, path);
  return { agentUrl, cardUrl: `${agentUrl}/.well-known/agent-card.json` };
};
