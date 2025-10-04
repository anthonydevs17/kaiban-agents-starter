import {
  AgentExecutor,
  ExecutionEventBus,
  InMemoryTaskStore,
  RequestContext,
} from '@a2a-js/sdk/server';
import { v4 as uuidv4 } from 'uuid';
import type { ActivityCreate } from 'kaiban-sdk';

import { createLogger } from '../../shared/utils';
import {
  apiCreateActivity,
  apiMoveCardToColumn,
  extractIdsFromMetadata,
} from '../../shared/services/kaibanService';

export const tasksStore = new InMemoryTaskStore();
const logger = createLogger('BasicAssistantExecutor');

/**
 * Minimal executor for the Basic Assistant sample.
 *
 * A2A Summary:
 * - Publishes a `task` event to mark submission
 * - Emits an assistant `message` echoing the user text (if any)
 * - Publishes a `status-update` with `completed` and finishes the event bus
 *
 * Contract:
 * - `execute` must publish lifecycle events to `ExecutionEventBus`
 * - `cancelTask` should attempt to cancel in-flight work (not implemented here)
 */
class BasicAssistantExecutor implements AgentExecutor {
  /**
   * Executes a single A2A task for this agent.
   *
   * Parameters
   * - requestContext: includes `taskId`, `contextId`, and the user `message`
   * - eventBus: streaming channel used to publish task, message, and status events
   */
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, contextId, userMessage } = requestContext;

    eventBus.publish({
      kind: 'task',
      id: taskId,
      contextId,
      status: { state: 'submitted', timestamp: new Date().toISOString() },
    });

    const userMessageText = userMessage.parts
      .filter((part) => part.kind === 'text')
      .map((part) => part.text)
      .join('\n');

    // Capture basic identifiers (if present) for later activity operations
    const ids = extractIdsFromMetadata(userMessage.metadata);
    if (ids) {
      taskMetaByTaskId.set(taskId, ids);
    }

    // Handle data parts: create activities for select data part types
    const dataParts = userMessage.parts.filter((part) => part.kind === 'data') as Array<{
      kind: 'data';
      data: any;
    }>;
    for (const dp of dataParts) {
      const type = dp.data?.type as string | undefined;
      if (!type) continue;

      // Log the incoming part for sample observability
      logger.info({ type, data: dp.data }, 'Received data part');

      switch (type) {
        case 'kaiban_activity':
          logger.info({ data: dp.data }, 'Received kaiban activity');
          // => Process incoming kaiban activity
          break;
        case 'user_thread_feedback':
          logger.info({ data: dp.data }, 'Received user thread feedback');
          // => Process incoming user thread feedback
          break;
        case 'user_evaluation':
          logger.info({ data: dp.data }, 'Received user evaluation');
          // => Process incoming user evaluation
          break;
        default:
          logger.info({ data: dp.data }, 'Received unknown data part');
          // => Ignore incoming unknown data part
          break;
      }
    }

    if (userMessageText) {
      logger.info({ userMessageText }, 'Received user message');
      eventBus.publish({
        kind: 'message',
        messageId: uuidv4(),
        taskId,
        contextId,
        role: 'agent',
        parts: [{ kind: 'text', text: `Echo: ${userMessageText}` }],
      });
    }

    // Create an activity on task finish (sample)
    const finalIds = taskMetaByTaskId.get(taskId) || ids;
    if (finalIds && finalIds.card_id && finalIds.board_id && finalIds.team_id) {
      await apiCreateActivity(finalIds.card_id, {
        board_id: finalIds.board_id,
        team_id: finalIds.team_id,
        card_id: finalIds.card_id,
        type: 'task_completed',
        description: 'Task completed by sample agent',
        actor: { id: 'sample-agent', type: 'agent', name: 'Basic Assistant (Sample)' },
      });
    }

    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: { state: 'completed', timestamp: new Date().toISOString() },
      final: true,
    });

    eventBus.finished();
  }

  /**
   * Attempts to cancel a running task.
   *
   * Note: This sample does not implement cancellation. Real agents should
   * persist state and signal their workers to stop if possible.
   */
  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    const ids = taskMetaByTaskId.get(taskId);
    const currentTask = await tasksStore.load(taskId).catch(() => undefined);

    // Create an activity on cancel and move card to CANCELLED (if identifiers present)
    if (ids && ids.card_id && ids.board_id && ids.team_id) {
      await apiCreateActivity(ids.card_id, {
        board_id: ids.board_id,
        team_id: ids.team_id,
        card_id: ids.card_id,
        type: 'task_canceled',
        description: 'Task canceled by user/system',
        actor: { id: 'sample-agent', type: 'agent', name: 'Basic Assistant (Sample)' },
      });
      await apiMoveCardToColumn(ids.card_id, 'CANCELLED');
    }

    // Publish cancel status
    eventBus.publish({
      kind: 'status-update',
      taskId,
      contextId: currentTask?.contextId || '',
      status: { state: 'canceled', timestamp: new Date().toISOString() },
      final: true,
    });
    logger.info({ taskId }, 'Task canceled');
    eventBus.finished();
  }
}

export const basicAssistantExecutor = new BasicAssistantExecutor();

// Cache task metadata for follow-up operations (cancel/finish)
const taskMetaByTaskId = new Map<string, { card_id: string; board_id: string; team_id: string }>();
