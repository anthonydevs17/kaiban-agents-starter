import { DefaultRequestHandler } from '@a2a-js/sdk/server';

import { metaAssistantCard } from './card';
import { metaAssistantExecutor, tasksStore } from './executor';

/**
 * A2A Request handler for the Meta Assistant sample.
 *
 * Exposes:
 * - Discovery: `.well-known/agent-card.json` (via `AgentCard`)
 * - Task API: create/cancel/stream endpoints per A2A default routes
 */
export const metaAssistantRequestHandler = new DefaultRequestHandler(
  metaAssistantCard,
  tasksStore,
  metaAssistantExecutor,
);
