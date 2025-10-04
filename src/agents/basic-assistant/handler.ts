import { DefaultRequestHandler } from '@a2a-js/sdk/server';

import { basicAssistantCard } from './card';
import { basicAssistantExecutor, tasksStore } from './executor';

/**
 * A2A Request handler for the Basic Assistant sample.
 *
 * Exposes:
 * - Discovery: `.well-known/agent-card.json` (via `AgentCard`)
 * - Task API: create/cancel/stream endpoints per A2A default routes
 */
export const basicAssistantRequestHandler = new DefaultRequestHandler(
  basicAssistantCard,
  tasksStore,
  basicAssistantExecutor,
);
