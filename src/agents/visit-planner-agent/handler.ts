/**
 * @fileoverview A2A Request Handler Configuration for Visit Planner Agent
 *
 * This module assembles the A2A request handler by combining:
 * - Agent Card (metadata and discovery information)
 * - Task Store (in-memory task state management)
 * - Agent Executor (business logic and execution flow)
 *
 * The handler is responsible for processing incoming A2A protocol requests
 * and routing them to the appropriate executor methods.
 *
 * @module agents/visit-planner-agent/handler
 */

import { DefaultRequestHandler } from '@a2a-js/sdk/server';

import { visitPlannerAgentCard } from './card';
import { tasksStore, visitPlannerAgentExecutor } from './executor';

/**
 * A2A Request Handler for the Visit Planner Agent
 *
 * @description This handler integrates three core components:
 *
 * 1. **Agent Card** (visitPlannerAgentCard):
 *    - Provides agent metadata for A2A protocol discovery
 *    - Served at /.well-known/agent-card.json
 *    - Contains agent capabilities, skills, and endpoints
 *
 * 2. **Task Store** (tasksStore):
 *    - In-memory storage for managing task state and history
 *    - Tracks ongoing and completed tasks
 *    - Enables task status queries and management
 *
 * 3. **Agent Executor** (visitPlannerAgentExecutor):
 *    - Contains the business logic for processing tasks
 *    - Manages the execution lifecycle (submitted → working → completed)
 *    - Integrates with Kaiban platform and AI models
 *
 * @constant
 * @type {DefaultRequestHandler}
 *
 * @remarks
 * The DefaultRequestHandler from @a2a-js/sdk automatically:
 * - Handles A2A protocol compliance
 * - Routes requests to the executor
 * - Manages SSE (Server-Sent Events) for streaming responses
 * - Serves the agent card at the .well-known endpoint
 * - Validates incoming requests against the A2A specification
 *
 * @see {@link visitPlannerAgentCard} for agent metadata configuration
 * @see {@link visitPlannerAgentExecutor} for execution logic implementation
 */
export const visitPlannerAgentHandler = new DefaultRequestHandler(
  visitPlannerAgentCard,
  tasksStore,
  visitPlannerAgentExecutor,
);
