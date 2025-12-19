/**
 * @fileoverview A2A Request Handler Configuration for Airline Revenue Management Agent
 *
 * This module assembles the A2A request handler by combining:
 * - Agent Card (metadata and discovery information)
 * - Task Store (in-memory task state management)
 * - Agent Executor (business logic and execution flow)
 *
 * The handler is responsible for processing incoming A2A protocol requests
 * and routing them to the appropriate executor methods.
 *
 * @module agents/airline-revenue-management/handler
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { revenueManagementAgentCard } from './card';
import { tasksStore, revenueManagementAgentExecutor } from './executor';

// Get directory path for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplesDir = path.join(__dirname, '../../../samples');

/**
 * Create A2A Request Handler for the Airline Revenue Management Agent
 *
 * @description This function creates a handler that integrates three core components:
 *
 * 1. **Agent Card** (revenueManagementAgentCard):
 *    - Provides agent metadata for A2A protocol discovery
 *    - Served at /.well-known/agent-card.json
 *    - Contains agent capabilities, skills, and endpoints
 *
 * 2. **Task Store** (tasksStore):
 *    - In-memory storage for managing task state and history
 *    - Tracks ongoing and completed tasks
 *    - Enables task status queries and management
 *
 * 3. **Agent Executor** (revenueManagementAgentExecutor):
 *    - Contains the business logic for processing tasks
 *    - Manages the execution lifecycle (submitted → working → completed)
 *    - Integrates with KaibanJS teams and workflows
 *
 * @param agentUrl - The complete agent endpoint URL (e.g., http://localhost:4000/agents/airlineRevenueManagement/a2a)
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
 * const handler = createRevenueManagementAgentHandler('http://localhost:4000/agents/airlineRevenueManagement/a2a');
 *
 * // With tunnel
 * const handler = createRevenueManagementAgentHandler('https://abc123.loca.lt/agents/airlineRevenueManagement/a2a');
 * ```
 *
 * @see {@link revenueManagementAgentCard} for agent metadata configuration
 * @see {@link revenueManagementAgentExecutor} for execution logic implementation
 */
export const createRevenueManagementAgentHandler = (agentUrl: string) => {
  return new DefaultRequestHandler(
    revenueManagementAgentCard(agentUrl), // Create agent card with complete endpoint URL
    tasksStore,
    revenueManagementAgentExecutor,
  );
};

/**
 * Setup A2A routes for the Airline Revenue Management Agent
 *
 * @description This function sets up:
 * 1. A2A protocol routes for the agent (POST /airlineRevenueManagement/a2a)
 * 2. Agent card discovery endpoint (GET /airlineRevenueManagement/a2a/.well-known/agent-card.json)
 * 3. Sample Excel file endpoint (GET /airlineRevenueManagement/samples/pricing-analisis.xlsx)
 *
 * The sample Excel file is served from the `samples/` directory and can be used for testing
 * the agent's Excel download and parsing functionality.
 *
 * @param app - Express application instance
 * @param baseUrl - Base URL for the server (e.g., http://localhost:4000 or https://tunnel-url.loca.lt)
 * @returns Object containing agentUrl, cardUrl, and sampleFileUrl for logging
 *
 * @example
 * ```typescript
 * const { sampleFileUrl } = setupRevenueManagementAgentRoutes(app, 'http://localhost:4000');
 * // sampleFileUrl: 'http://localhost:4000/airlineRevenueManagement/samples/pricing-analisis.xlsx'
 * ```
 */
export const setupRevenueManagementAgentRoutes = (app: express.Express, baseUrl: string) => {
  const agentPath = '/airlineRevenueManagement/a2a';
  const agentUrl = `${baseUrl}${agentPath}`;

  // Setup A2A routes
  new A2AExpressApp(createRevenueManagementAgentHandler(agentUrl)).setupRoutes(app, agentPath);

  // Serve sample Excel file for testing
  // This allows the agent to download the sample file for testing purposes
  const samplesPath = '/airlineRevenueManagement/samples';
  app.use(samplesPath, express.static(samplesDir));

  const sampleFileUrl = `${baseUrl}${samplesPath}/pricing-analisis.xlsx`;

  return {
    agentUrl,
    cardUrl: `${agentUrl}/.well-known/agent-card.json`,
    sampleFileUrl,
  };
};
