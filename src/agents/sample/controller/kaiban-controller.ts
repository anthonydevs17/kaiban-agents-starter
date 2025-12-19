import {
  Activity,
  ActivityActor,
  ActivityType,
  CardStatus,
  createKaibanClient,
  KaibanClient,
} from '@kaiban/sdk';

import { createLogger } from '../../../shared/logger';

import { callSampleAgent } from './agent';

/**
 * Kanban board column keys representing different card states
 */
const TODO_COLUMN_KEY = 'todo';
const DOING_COLUMN_KEY = 'doing';
const DONE_COLUMN_KEY = 'done';
const BLOCKED_COLUMN_KEY = 'blocked';

const logger = createLogger('SampleKaibanController');

/**
 * Controller responsible for managing Kaiban activities and card workflows.
 * Handles the complete lifecycle of cards from creation to completion or blocking.
 *
 * @class SampleKaibanController
 * @description Orchestrates the interaction between the Kaiban platform and the Sample Agent.
 * Listens to card activities and processes them through various workflow states.
 *
 * @remarks
 * This is a template implementation. Customize it to match your agent's workflow.
 * See examples/visit-planner-agent/controller/kaiban-controller.ts for a reference implementation.
 */
export class SampleKaibanController {
  /**
   * Private constructor to enforce factory pattern usage via build() method
   * @param kaibanActor - Actor representing the agent in Kaiban activities
   * @param kaibanClient - Initialized Kaiban SDK client for API interactions
   */
  constructor(
    private readonly kaibanActor: ActivityActor,
    private readonly kaibanClient: KaibanClient,
  ) {}

  /**
   * Factory method to create and initialize a SampleKaibanController instance.
   * Validates environment configuration and establishes connection with Kaiban platform.
   *
   * @returns Promise<SampleKaibanController> - Fully initialized controller ready to process activities
   * @throws {Error} When required environment variables are missing or agent is not found
   *
   * @example
   * ```typescript
   * const controller = await SampleKaibanController.build();
   * await controller.processKaibanActivity(activity);
   * ```
   */
  static async build() {
    const tenant = process.env.KAIBAN_TENANT;
    const token = process.env.KAIBAN_API_TOKEN;
    const agentId = process.env.KAIBAN_AGENT_ID;
    let baseUrl = process.env.KAIBAN_API_URL;

    // Validate required environment configuration
    if (!tenant || !token || !agentId) {
      throw new Error(
        `Kaiban integration configuration is missing, please check your .env file. 
        Make sure to set KAIBAN_TENANT, KAIBAN_API_TOKEN and KAIBAN_AGENT_ID properly.`,
      );
    }

    // Set default base URL for Kaiban API if not provided
    if (!baseUrl) {
      baseUrl = `https://${tenant}.kaiban.io/api`;
    }

    // Initialize Kaiban SDK client with credentials
    const kaibanClient = createKaibanClient({ baseUrl, tenant, token });

    // Verify agent exists in Kaiban platform
    const agent = await kaibanClient.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in Kaiban platform`);
    }

    // Create actor representation for this agent
    const kaibanActor: ActivityActor = {
      id: agent.id,
      type: 'agent',
      name: agent.name,
    };

    logger.info({ tenant }, 'Sample Kaiban controller successfully created');
    return new SampleKaibanController(kaibanActor, kaibanClient);
  }

  /**
   * Entry point for processing Kaiban platform activities.
   * Routes different activity types to their appropriate handlers.
   *
   * @param activity - The activity object received from Kaiban platform
   *
   * @description Currently handles the following activity types:
   * - CARD_CREATED: When a new card is created in the board
   * - CARD_CLONED: When an existing card is duplicated
   * - CARD_AGENT_ADDED: When this agent is assigned to a card
   * - CARD_COLUMN_CHANGED: When a card is moved to a different column
   *
   * All these activities trigger the card workflow processing.
   */
  async processKaibanActivity(activity: Activity) {
    switch (activity.type) {
      case ActivityType.CARD_CREATED:
      case ActivityType.CARD_CLONED:
      case ActivityType.CARD_AGENT_ADDED:
      case ActivityType.CARD_COLUMN_CHANGED:
        await this.processCardCreatedActivity(activity);
        break;
    }
  }

  /**
   * Processes card-related activities through a complete workflow.
   * Orchestrates the card lifecycle from TODO → DOING → DONE (or BLOCKED on error).
   *
   * @param activity - The card activity to process
   *
   * @description Workflow stages:
   * 1. Validation: Ensures card has description, is in TODO column, and wasn't created by this agent
   * 2. DOING stage: Moves card to DOING column and updates status
   * 3. Processing: Invokes Sample Agent with card description
   * 4. DONE stage: Updates card with agent response, moves to DONE, logs costs
   * 5. BLOCKED stage: On error, moves card to BLOCKED column for manual intervention
   *
   * @private
   *
   * @remarks
   * Customize this method to match your agent's specific workflow requirements.
   * See examples/visit-planner-agent/controller/kaiban-controller.ts for a reference implementation.
   */
  private async processCardCreatedActivity(activity: Activity) {
    const card = await this.kaibanClient.cards.get(activity.card_id);

    // Skip processing if card doesn't meet requirements:
    // - Card must have a description
    // - Card must be in TODO column (not already processed)
    // - Activity must not be triggered by this agent (avoid loops)
    if (
      !card?.description ||
      card.column_key !== TODO_COLUMN_KEY ||
      activity.actor.id === this.kaibanActor.id
    ) {
      return;
    }

    // STAGE 1: Transition card to DOING state
    await this.kaibanClient.cards.update(card.id, {
      column_key: DOING_COLUMN_KEY,
      status: CardStatus.DOING,
    });

    // Log transition activities to provide audit trail
    await this.kaibanClient.cards.createBatchActivities(card.id, [
      {
        type: ActivityType.CARD_STATUS_CHANGED,
        description: 'Card status changed to doing',
        board_id: activity.board_id,
        team_id: activity.team_id,
        actor: this.kaibanActor,
        changes: [
          {
            field: 'status',
            new_value: CardStatus.DOING,
            old_value: card.status,
          },
        ],
      },
      {
        type: ActivityType.CARD_COLUMN_CHANGED,
        description: 'Card moved to doing column',
        board_id: activity.board_id,
        team_id: activity.team_id,
        actor: this.kaibanActor,
        changes: [
          {
            field: 'column_key',
            new_value: DOING_COLUMN_KEY,
            old_value: card.column_key,
          },
        ],
      },
    ]);

    try {
      // STAGE 2: Invoke AI agent to process the card's request
      // TODO: Customize the agent invocation based on your implementation
      // Replace callSampleAgent with your actual agent function
      const { response, usage } = await callSampleAgent(card.description);

      // Calculate LLM costs for transparency and budget tracking
      const { totalCost, totalTokens, costsByModel } = this.kaibanClient.costs.calculateCosts([
        usage,
      ]);

      // STAGE 3: Update card with agent's response and mark as complete
      this.kaibanClient.cards.update(card.id, {
        result: response,
        column_key: DONE_COLUMN_KEY,
        status: CardStatus.DONE,
      });

      // Log completion activities with cost metrics for reporting
      await this.kaibanClient.cards.createBatchActivities(card.id, [
        {
          type: ActivityType.CARD_STATUS_CHANGED,
          description: 'Card status changed to done',
          board_id: activity.board_id,
          team_id: activity.team_id,
          actor: this.kaibanActor,
          changes: [
            {
              field: 'status',
              new_value: CardStatus.DONE,
              old_value: card.status,
            },
          ],
        },
        {
          type: ActivityType.CARD_COLUMN_CHANGED,
          description: 'Card moved to done column',
          board_id: activity.board_id,
          team_id: activity.team_id,
          actor: this.kaibanActor,
          changes: [
            {
              field: 'column_key',
              new_value: DONE_COLUMN_KEY,
              old_value: card.column_key,
            },
          ],
        },
        {
          type: ActivityType.THREAD_STEP_COSTS,
          description: `Registered thread costs for sample agent step`,
          board_id: card.board_id,
          team_id: card.team_id,
          actor: this.kaibanActor,
          metadata: {
            step_name: 'sampleAgentStep',
            costs: Object.values(costsByModel).map((cost) => ({
              model: cost.model,
              input_tokens: cost.inputTokens,
              output_tokens: cost.outputTokens,
              total_tokens: cost.totalTokens,
              input_cost: cost.inputCost,
              output_cost: cost.outputCost,
              total_cost: cost.totalCost,
            })),
            total_cost: totalCost,
            total_tokens: totalTokens,
          },
        },
      ]);
    } catch (error) {
      // ERROR HANDLING: Move card to BLOCKED state for manual review
      await this.kaibanClient.cards.update(card.id, {
        column_key: BLOCKED_COLUMN_KEY,
        status: CardStatus.BLOCKED,
      });

      // Log error state transition for team visibility and debugging
      await this.kaibanClient.cards.createBatchActivities(card.id, [
        {
          type: ActivityType.CARD_STATUS_CHANGED,
          description: 'Card status changed to blocked',
          board_id: activity.board_id,
          team_id: activity.team_id,
          actor: this.kaibanActor,
          changes: [
            {
              field: 'status',
              new_value: CardStatus.BLOCKED,
              old_value: card.status,
            },
          ],
        },
        {
          type: ActivityType.CARD_COLUMN_CHANGED,
          description: 'Card moved to blocked column',
          board_id: activity.board_id,
          team_id: activity.team_id,
          actor: this.kaibanActor,
          changes: [
            {
              field: 'column_key',
              new_value: BLOCKED_COLUMN_KEY,
              old_value: card.column_key,
            },
          ],
        },
      ]);

      // Log detailed error for troubleshooting
      logger.error({ error, cardId: card.id }, 'Failed to process card with sample agent');
    }
  }
}
