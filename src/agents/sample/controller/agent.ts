/**
 * @fileoverview Sample AI Agent Configuration and Invocation Template
 *
 * This module defines the template for implementing your custom AI agent.
 * Replace the placeholder implementation with your specific agent logic using
 * your preferred framework (Mastra, AWS Bedrock, OpenAI, etc.).
 *
 * @module agents/sample/controller/agent
 *
 * @remarks
 * This is a template file. To implement your agent:
 * 1. Choose your AI framework (see examples for reference):
 *    - Mastra + OpenAI: See examples/visit-planner-agent/controller/agent.ts
 *    - AWS Bedrock: See examples/airport-services-agent/controller/agent.ts
 * 2. Install the required dependencies in package.json
 * 3. Implement the agent initialization and invocation logic below
 * 4. Ensure the return type matches: { response: string; usage: UsageMetrics }
 */

/**
 * Usage metrics for token/cost tracking
 */
interface UsageMetrics {
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
}

/**
 * Invokes the Sample AI Agent to process user requests.
 *
 * @param userMessage - The user's request message
 * @returns Promise containing the AI-generated response and token usage metrics
 *
 * @example
 * ```typescript
 * const result = await callSampleAgent("Your user message here");
 * console.log(result.response); // AI-generated response
 * console.log(result.usage);    // Token usage and cost information
 * ```
 *
 * @description TODO: Implement your agent invocation logic here
 * This function should:
 * - Send the user message to your AI model/framework
 * - Receive the AI-generated response
 * - Return both the response text and detailed token usage metrics
 * - Token metrics are used for cost tracking and reporting in Kaiban platform
 *
 * @see examples/visit-planner-agent/controller/agent.ts for Mastra implementation
 * @see examples/airport-services-agent/controller/agent.ts for AWS Bedrock implementation
 */
export const callSampleAgent = async (
  userMessage: string,
): Promise<{ response: string; usage: UsageMetrics }> => {
  // TODO: Implement your agent logic here
  //
  // Example structure (replace with your actual implementation):
  // 1. Initialize your AI agent/client
  // 2. Send the user message to your AI model
  // 3. Process the response
  // 4. Extract usage metrics (tokens, costs, etc.)
  // 5. Return the response and usage data
  //
  // For reference implementations, see:
  // - examples/visit-planner-agent/controller/agent.ts (Mastra + OpenAI)
  // - examples/airport-services-agent/controller/agent.ts (AWS Bedrock + Claude)

  // Placeholder implementation - replace this!
  return {
    response: `Sample agent response for: ${userMessage}. Please implement your agent logic.`,
    usage: {
      model: 'sample-model',
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
    },
  };
};
