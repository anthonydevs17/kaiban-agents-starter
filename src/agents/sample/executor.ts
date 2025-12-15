import {
  AgentExecutor,
  ExecutionEventBus,
  InMemoryTaskStore,
  RequestContext,
} from '@a2a-js/sdk/server';
import { A2ADataPartType, KaibanActivityPart } from '@kaiban/sdk';

import { createLogger } from '../../shared/logger';

import { SampleKaibanController } from './controller/kaiban-controller';

/**
 * In-memory store for managing task state and history.
 * Used to track ongoing and completed tasks for the agent.
 */
export const tasksStore = new InMemoryTaskStore();

const logger = createLogger('SampleAgentExecutor');

/**
 * Executor for the Sample Agent following the A2A (Agent-to-Agent) protocol.
 * Responsible for handling task execution lifecycle and integrating with Kaiban platform.
 *
 * @class SampleAgentExecutor
 * @implements {AgentExecutor}
 *
 * @description This executor:
 * - Manages A2A protocol communication via event bus
 * - Processes incoming Kaiban activities from user messages
 * - Reports task execution status (submitted → working → completed)
 * - Orchestrates the interaction between A2A protocol and Kaiban platform
 *
 * @remarks
 * This is a template implementation. To implement your specific agent logic:
 * 1. Check the examples in the `examples/` directory for reference implementations:
 *    - `examples/visit-planner-agent/` - Uses Mastra framework with OpenAI
 *    - `examples/airport-services-agent/` - Uses AWS Bedrock with Claude
 * 2. Implement your agent-specific logic in the controller/agent.ts file
 * 3. Customize the kaiban-controller.ts to handle your specific workflow
 */
class SampleAgentExecutor implements AgentExecutor {
  /**
   * Main execution method that processes incoming A2A requests.
   * Handles the complete task lifecycle from submission to completion.
   *
   * @param requestContext - Context containing task information and user message
   * @param eventBus - Communication bus for publishing execution status and results
   *
   * @description Execution flow:
   * 1. SUBMITTED: Acknowledges task receipt via event bus
   * 2. WORKING: Processes Kaiban activities from user message data
   * 3. COMPLETED: Signals successful task completion
   *
   * The method extracts Kaiban activities from the user message and delegates
   * processing to the SampleKaibanController.
   */
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, contextId, userMessage } = requestContext;

    // PHASE 1: Acknowledge task receipt
    eventBus.publish({
      kind: 'task',
      id: taskId,
      contextId: contextId,
      status: {
        state: 'submitted',
        timestamp: new Date().toISOString(),
      },
    });

    // Extract data parts from user message (filtering out text-only parts)
    const userMessageData = userMessage.parts.filter((part) => part.kind === 'data');

    if (userMessageData) {
      // PHASE 2: Signal that agent is actively processing
      eventBus.publish({
        kind: 'status-update',
        taskId: taskId,
        contextId: contextId,
        status: {
          state: 'working',
          timestamp: new Date().toISOString(),
        },
        final: false,
      });

      // Initialize Kaiban controller for platform integration
      // TODO: Implement your specific controller initialization here
      // See examples/visit-planner-agent/executor.ts or examples/airport-services-agent/executor.ts
      // for reference implementations
      const kaibanController = await SampleKaibanController.build();

      // PHASE 3: Process each Kaiban activity from the message
      // Activities represent events from the Kaiban platform (card created, moved, etc.)
      for (const messageData of userMessageData) {
        switch (messageData.data.type) {
          case A2ADataPartType.KAIBAN_ACTIVITY:
            const part = messageData as KaibanActivityPart;
            logger.info(
              { activityType: part.data.activity.type },
              'Processing Kaiban activity from user message',
            );
            await kaibanController.processKaibanActivity(part.data.activity);
            break;
        }
      }
    }

    // PHASE 4: Signal successful task completion to A2A protocol
    eventBus.publish({
      kind: 'status-update',
      taskId: taskId,
      contextId: contextId,
      status: {
        state: 'completed',
        timestamp: new Date().toISOString(),
      },
      final: true,
    });

    // Finalize event bus communication and cleanup resources
    eventBus.finished();
  }

  /**
   * Handles task cancellation requests.
   * Currently not implemented as Kaiban workflows don't support mid-execution cancellation.
   *
   * @param taskId - Unique identifier of the task to cancel
   * @param _eventBus - Communication bus for publishing cancellation status (unused in current implementation)
   * @throws {Error} Always throws as cancellation is not yet supported
   *
   * @description In a full implementation, this would:
   * - Stop any in-progress AI agent calls
   * - Rollback partial Kaiban card updates
   * - Publish cancellation status to event bus
   * - Clean up resources and task store entries
   */
  async cancelTask(taskId: string, _eventBus: ExecutionEventBus): Promise<void> {
    logger.info({ taskId }, 'Task cancellation requested (not implemented)');
    throw new Error('Task cancellation is not yet implemented for Sample Agent');
  }
}

/**
 * Singleton instance of the Sample Agent executor.
 * Used by the A2A handler to process incoming requests.
 *
 * @constant
 * @type {SampleAgentExecutor}
 */
export const sampleAgentExecutor = new SampleAgentExecutor();
