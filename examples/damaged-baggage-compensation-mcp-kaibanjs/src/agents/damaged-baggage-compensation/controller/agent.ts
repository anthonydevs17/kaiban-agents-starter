/**
 * @fileoverview KaibanJS Team for Damaged Baggage Compensation A2A Agent
 *
 * Sequential flow: Get card → Extract & Validate claim → Calculate compensation (policy + historical + Tavily) → Generate offer → Update card & move to done.
 * Tools: get_airline_policy (mock), get_historical_payouts (mock), search_product_market_price (Tavily, 1 call per product, max 5).
 * Tools use LangChain DynamicStructuredTool so kaibanjs (which expects BaseTool = StructuredTool) can invoke them.
 *
 * @module agents/damaged-baggage-compensation/controller/agent
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { Agent, Task, Team } from 'kaibanjs';
import { z } from 'zod';

import { getKaibanTools } from './kaiban-mcp-client';
import { createLogger } from '../../../shared/logger';

const logger = createLogger('DamagedBaggageCompensationAgent');

// ============================================================================
// Mock: Airline policy (generic)
// ============================================================================

const MOCK_AIRLINE_POLICY = {
  depreciation: {
    year1: 20,
    year2: 15,
    year3Plus: 10,
    maxTotalPercent: 70,
  },
  maxPerItemUSD: 500,
  maxTotalPerClaimUSD: 1500,
  categories: ['luggage', 'backpack', 'bag', 'other'],
  currency: 'USD',
  summary:
    'Depreciation: 20% year 1, 15% year 2, 10% per year after (max 70% total). Max USD 500 per item, USD 1500 per claim.',
};

// ============================================================================
// Mock: Historical payouts by damage type and product category
// ============================================================================

const MOCK_HISTORICAL_PAYOUTS: Array<{
  damageType: string;
  productCategory: string;
  avgPayout: number;
  count: number;
}> = [
  { damageType: 'wheel_broken', productCategory: 'luggage', avgPayout: 85, count: 120 },
  { damageType: 'handle_cracked', productCategory: 'luggage', avgPayout: 65, count: 90 },
  { damageType: 'handle_cracked', productCategory: 'backpack', avgPayout: 45, count: 60 },
  { damageType: 'tear', productCategory: 'luggage', avgPayout: 55, count: 80 },
  { damageType: 'tear', productCategory: 'backpack', avgPayout: 35, count: 70 },
  { damageType: 'wheel_broken', productCategory: 'bag', avgPayout: 40, count: 40 },
  { damageType: 'zipper_broken', productCategory: 'luggage', avgPayout: 50, count: 50 },
  { damageType: 'zipper_broken', productCategory: 'backpack', avgPayout: 30, count: 55 },
];

// ============================================================================
// TOOL: get_airline_policy (mock, read-only) – LangChain DynamicStructuredTool
// ============================================================================

const airlinePolicyTool = new DynamicStructuredTool({
  name: 'get_airline_policy',
  description:
    'Returns the airline baggage compensation policy: depreciation rules, max per item, max per claim, currency.',
  schema: z.object({}),
  func: async () => {
    logger.info('🔧 TOOL CALLED: get_airline_policy');
    const result = JSON.stringify(MOCK_AIRLINE_POLICY);
    logger.debug({ result }, 'get_airline_policy result');
    return result;
  },
});

// ============================================================================
// TOOL: get_historical_payouts (mock, read-only) – LangChain DynamicStructuredTool
// ============================================================================

const historicalPayoutsSchema = z.object({
  damageType: z
    .string()
    .optional()
    .describe('e.g. wheel_broken, handle_cracked, tear, zipper_broken'),
  productCategory: z.string().optional().describe('e.g. luggage, backpack, bag'),
});

const historicalPayoutsTool = new DynamicStructuredTool({
  name: 'get_historical_payouts',
  description:
    'Returns historical average payouts by damage type and/or product category. Use for reference when calculating compensation.',
  schema: historicalPayoutsSchema,
  func: async (input) => {
    logger.info({ input }, '🔧 TOOL CALLED: get_historical_payouts');
    let list = MOCK_HISTORICAL_PAYOUTS;
    if (input.damageType)
      list = list.filter(
        (r) => r.damageType === input.damageType?.toLowerCase().replace(/\s+/g, '_'),
      );
    if (input.productCategory)
      list = list.filter((r) => r.productCategory === input.productCategory?.toLowerCase());
    const result = JSON.stringify({ payouts: list, currency: 'USD' });
    logger.debug({ result, filteredCount: list.length }, 'get_historical_payouts result');
    return result;
  },
});

// ============================================================================
// TOOL: search_product_market_price (Tavily, 1 call per product; agent must limit to 5)
// ============================================================================

async function getTavilyClient(): Promise<{
  search: (
    query: string,
  ) => Promise<{ results?: Array<{ title?: string; content?: string }>; answer?: string }>;
} | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;
  const { tavily } = await import('@tavily/core');
  const client = tavily({ apiKey });
  return client as {
    search: (
      query: string,
    ) => Promise<{ results?: Array<{ title?: string; content?: string }>; answer?: string }>;
  };
}

const searchProductMarketPriceSchema = z.object({
  productName: z
    .string()
    .describe('Product name or short description, e.g. "Samsonite 28 inch spinner luggage"'),
});

const searchProductMarketPriceTool = new DynamicStructuredTool({
  name: 'search_product_market_price',
  description:
    'Searches for current market price of a product in USD. Call once per product; use for up to 5 products per claim. Returns search results with price information if found.',
  schema: searchProductMarketPriceSchema,
  func: async (input) => {
    logger.info({ input }, '🔧 TOOL CALLED: search_product_market_price');
    const client = await getTavilyClient();
    if (!client) {
      const result = JSON.stringify({
        success: false,
        message: 'TAVILY_API_KEY not set. Using mock: assume market value 120 USD for pricing.',
        mockValue: 120,
        currency: 'USD',
      });
      logger.debug({ result }, 'search_product_market_price result (mock)');
      return result;
    }
    const query = `${input.productName} current price buy USD`;
    try {
      const response = await client.search(query);
      const results =
        (response as { results?: Array<{ title?: string; content?: string }> }).results ?? [];
      const answer = (response as { answer?: string }).answer;
      const text = results.map((r) => `${r.title ?? ''}: ${r.content ?? ''}`).join('\n');
      const summary = answer
        ? `Answer: ${answer}\n\nSources:\n${text}`
        : text || 'No price results found. Consider using historical payouts for estimate.';
      const result = JSON.stringify({
        success: true,
        query,
        summary,
        currency: 'USD',
      });
      logger.debug(
        { result, resultsCount: results.length },
        'search_product_market_price result (Tavily)',
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const result = JSON.stringify({
        success: false,
        message: `Tavily search failed: ${message}. Use historical payouts for estimate.`,
        currency: 'USD',
      });
      logger.error({ err, result }, 'search_product_market_price error');
      return result;
    }
  },
});

// ============================================================================
// AGENT 1 + TASK 1: Extract and Validate claim
// ============================================================================

const claimExtractionValidationAgent = new Agent({
  name: 'Claim Extraction & Validation Agent',
  role: 'Baggage Claim Data Specialist',
  goal: 'Extract baggage claim details from unstructured text and validate that required fields are present.',
  background:
    'Expert in parsing damage claims from forms and free text. Extracts passenger info, flight, damage description, and list of damaged items with age/brand when mentioned. Validates completeness and reports missing fields.',
});

const damagedItemSchema = z.object({
  name: z.string().describe('Item name or description'),
  ageYears: z.number().optional().describe('Age in years if stated'),
  brand: z.string().optional(),
});

const extractAndValidateClaimTask = new Task({
  title: 'Extract and Validate Baggage Claim',
  description: `From the user's message {userMessage}, extract and validate the claim in one pass.

EXTRACTION – Extract:
- passengerName, pnr, flight, date (travel/incident date)
- damageDescription: free-text description of damage (e.g. wheel broken, handle cracked)
- damagedItems: array of { name, ageYears (if stated), brand (if stated) }. Infer from lines like "Samsonite 28\\" spinner (2 years old)" → name: "Samsonite 28 inch spinner", ageYears: 2

VALIDATION – Required for a valid claim:
- passengerName or passenger identifier present
- at least one damaged item with a name
- damageDescription or damagedItems non-empty

Set valid to true only if required fields are present. Otherwise set valid to false, list missingFields, and set validationMessage asking for the missing information.

Output the structured claim plus valid, and if not valid then missingFields and validationMessage.`,
  agent: claimExtractionValidationAgent,
  expectedOutput:
    'Structured claim with passengerName, pnr, flight, date, damageDescription, damagedItems, valid boolean; if invalid: missingFields and validationMessage.',
  outputSchema: z.object({
    passengerName: z.string().optional(),
    pnr: z.string().optional(),
    flight: z.string().optional(),
    date: z.string().optional(),
    damageDescription: z.string().optional(),
    damagedItems: z.array(damagedItemSchema),
    valid: z.boolean(),
    missingFields: z.array(z.string()).optional(),
    validationMessage: z.string().optional(),
  }),
});

// ============================================================================
// AGENT 2 + TASK 2: Compensation Calculation
// ============================================================================

const compensationCalculationAgent = new Agent({
  name: 'Compensation Calculation Agent',
  role: 'Compensation Analyst',
  goal: 'Calculate a fair compensation offer using airline policy, historical payouts, and real-time market prices (Tavily).',
  background:
    'Expert in applying policy rules: depreciation by age, caps per item and per claim. Uses get_airline_policy, get_historical_payouts, and search_product_market_price (call once per product, max 5 products). Produces a defensible compensation amount with breakdown.',
  tools: [airlinePolicyTool, historicalPayoutsTool, searchProductMarketPriceTool],
});

const compensationCalculationTask = new Task({
  title: 'Calculate Compensation',
  description: `Use the extracted and validated claim from the previous task. The previous task outputs an object with fields: valid (boolean), damagedItems (array), damageDescription (string), passengerName (string), etc.

CRITICAL: Check the 'valid' field from the previous task result. Access it as {valid}.

If {valid} is false, do NOT call the tools. Output validInquiry: false with validationMessage: {validationMessage} and missingFields: {missingFields}.

If {valid} is true, you MUST call ALL THREE tools in this exact order:
1. FIRST: Call get_airline_policy tool (no parameters needed) to get depreciation rules and caps.
2. SECOND: Call get_historical_payouts tool with damageType and productCategory inferred from {damageDescription} and {damagedItems}.
3. THIRD: For EACH item in {damagedItems} (up to 5 items), call search_product_market_price tool once with the item name from {damagedItems}[].name. Use the result to estimate market value; if Tavily returns no price, use historical average or a reasonable default.

After calling all tools:
4. Apply policy: apply depreciation by item age (year1 20%, year2 15%, then 10% per year, max 70% total). Cap each item at maxPerItemUSD and total at maxTotalPerClaimUSD.
5. Output: compensationAmount (number), currency, breakdown (array of { item, marketPrice, depreciation, payout }), policyApplied (short summary string), and optional historicalContext.

Use ONLY data from the tools and the claim. Do not invent amounts beyond policy and tool results.`,
  agent: compensationCalculationAgent,
  expectedOutput:
    'Compensation amount, currency, breakdown per item, policy summary, or validation message if claim was invalid.',
  outputSchema: z.union([
    z.object({
      validInquiry: z.literal(false),
      validationMessage: z.string(),
      missingFields: z.array(z.string()),
    }),
    z.object({
      validInquiry: z.literal(true),
      compensationAmount: z.number(),
      currency: z.string(),
      breakdown: z.array(
        z.object({
          item: z.string(),
          marketPrice: z.number().optional(),
          depreciation: z.string().optional(),
          payout: z.number(),
        }),
      ),
      policyApplied: z.string(),
      historicalContext: z.string().optional(),
    }),
  ]),
});

// ============================================================================
// AGENT 3 + TASK 3: Generate Compensation Offer
// ============================================================================

const compensationOfferAgent = new Agent({
  name: 'Compensation Offer Agent',
  role: 'Compensation Offer Author',
  goal: 'Produce a clear, defensible compensation offer for airport staff to communicate.',
  background:
    'Writes concise offers with amount, justification (policy + breakdown), and audit-friendly wording. No customer interaction; output is for internal use by staff.',
});

const generateCompensationOfferTask = new Task({
  title: 'Generate Compensation Offer',
  description: `Produce the final compensation offer text.

INPUTS FROM PREVIOUS TASKS:
- Task 1: extracted claim (passengerName, damageDescription, damagedItems, valid, missingFields, validationMessage).
- Task 2: either (validInquiry: false, validationMessage, missingFields) or (validInquiry: true, compensationAmount, currency, breakdown, policyApplied, historicalContext).

If the claim was invalid: Output a short internal note listing missingFields and validationMessage so staff can request the information.

If the claim was valid: Write a clear compensation offer that includes:
- Reference to the claim (passenger, flight/date if available).
- Compensation amount and currency.
- Brief justification: policy applied (depreciation, caps) and per-item breakdown.
- Optional: historical context if relevant.
- Statement that the offer is ready for staff to communicate to the passenger (no direct customer text required).

Output plain text suitable for the card result (internal use).`,
  agent: compensationOfferAgent,
  expectedOutput:
    'Plain-text compensation offer with amount and justification, or a note requesting missing information.',
});

// ============================================================================
// TEAM CREATION (async: needs Kaiban MCP tools)
// ============================================================================

export interface DamagedBaggageCompensationTeamContext {
  card_id: string;
  board_id: string;
  team_id: string;
  agent_id: string;
  agent_name: string;
}

export async function createDamagedBaggageCompensationTeam(
  context: DamagedBaggageCompensationTeamContext,
) {
  const kaibanTools = await getKaibanTools();
  const { card_id, board_id, team_id, agent_id, agent_name } = context;

  const kaibanCardSyncAgent = new Agent({
    name: 'Kaiban Card Sync Agent',
    role: 'Kaiban Platform Sync',
    goal: 'Use Kaiban MCP tools to get card, move card to doing/done, update card result, and create card activities.',
    background:
      'Uses get_card, move_card, update_card, and create_card_activities from the Kaiban MCP server.',
    // @ts-expect-error - Kaiban MCP tools
    tools: kaibanTools,
  });

  const getCardAndMoveToDoingTask = new Task({
    title: 'Get Card and Move to Doing',
    description: `For card_id {card_id}, board_id {board_id}, team_id {team_id}, actor id {agent_id} name {agent_name}:

1. Call get_card with card_id to fetch the card.
2. From the card, extract the description (claim text). If empty, return userMessage as "No claim text provided."
3. If the card has a description and column_key is "todo", call move_card with card_id, column_key "doing", and actor { id: agent_id, type: "agent", name: agent_name }.
4. Optionally call create_card_activities to log the status/column change.
5. Return ONLY an object with one field: userMessage, set to the card description.`,
    agent: kaibanCardSyncAgent,
    expectedOutput: 'Object with userMessage set to the card description (claim text).',
    outputSchema: z.object({
      userMessage: z.string().describe('The card description (claim text).'),
    }),
  });

  const updateCardWithOfferAndMoveToDoneTask = new Task({
    title: 'Update Card with Offer and Move to Done',
    description: `You have the final compensation offer text from the previous task.

For card_id {card_id}, board_id {board_id}, team_id {team_id}, actor id {agent_id} name {agent_name}:

1. Call update_card with card_id and set the card result to the compensation offer text.
2. Call move_card with card_id, column_key "done", and actor { id: agent_id, type: "agent", name: agent_name }.
3. Call create_card_activities to log the status and column change to done.

Use the exact offer text produced by the previous task as the result.`,
    agent: kaibanCardSyncAgent,
    expectedOutput: 'Card updated with offer result and moved to done; activities logged.',
    outputSchema: z.object({
      success: z.boolean().describe('True if card was updated and moved to done.'),
    }),
  });

  return new Team({
    name: 'Damaged Baggage Compensation Team',
    agents: [
      kaibanCardSyncAgent,
      claimExtractionValidationAgent,
      compensationCalculationAgent,
      compensationOfferAgent,
    ],
    tasks: [
      getCardAndMoveToDoingTask,
      extractAndValidateClaimTask,
      compensationCalculationTask,
      generateCompensationOfferTask,
      updateCardWithOfferAndMoveToDoneTask,
    ],
    inputs: {
      card_id,
      board_id,
      team_id,
      agent_id,
      agent_name,
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
}

export async function processDamagedBaggageCompensationRequest(
  context: DamagedBaggageCompensationTeamContext,
): Promise<string> {
  logger.info({ context }, '🚀 Starting Damaged Baggage Compensation Team');
  const team = await createDamagedBaggageCompensationTeam(context);

  try {
    const teamResult = await team.start();
    logger.info({ teamResult }, '✅ Team execution completed');

    const { result = '' } = teamResult;

    if (result && typeof result === 'object') {
      logger.debug({ result }, 'Final result (object)');
      return JSON.stringify(result);
    }

    return result as string;
  } catch (error) {
    logger.error({ error, context }, '❌ Team execution failed');
    throw error;
  }
}
