/**
 * @fileoverview Visit Planner AI Agent Configuration and Invocation
 *
 * This module defines and exports the core AI agent responsible for generating
 * travel recommendations. It uses OpenAI's GPT-4o-mini model via the Mastra
 * framework to provide expert advice on tourist and historical places to visit.
 *
 * @module agents/visit-planner-agent/controller/agent
 */

import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

/**
 * Invokes the Visit Planner AI Agent to process user requests for travel recommendations.
 *
 * @param userMessage - The user's request containing a city name and optional context
 * @returns Promise containing the AI-generated response and token usage metrics
 *
 * @example
 * const result = await callVisitPlannerAgent("What places should I visit in Barcelona?");
 * console.log(result.response); // List of 10 places to visit
 * console.log(result.usage);    // Token usage and cost information
 *
 * @description This function:
 * - Sends the user message to the OpenAI GPT-4o-mini model via Mastra Agent
 * - Receives structured travel recommendations for the requested city
 * - Returns both the response text and detailed token usage metrics
 * - Token metrics are used for cost tracking and reporting in Kaiban platform
 */
export const callVisitPlannerAgent = async (userMessage: string) => {
  const response = await visitPlannerAgent.generate([{ role: 'user', content: userMessage }]);

  // Return structured response with AI-generated text and usage metrics
  return {
    response: response.text,
    usage: {
      model: 'gpt-4o-mini', // Model identifier for cost calculation
      inputTokens: response.usage.inputTokens || 0,
      outputTokens: response.usage.outputTokens || 0,
      reasoningTokens: response.usage.reasoningTokens || 0,
    },
  };
};

/**
 * AI Agent configured to provide expert travel recommendations.
 * Uses OpenAI's GPT-4o-mini model through the Mastra framework.
 *
 * @constant
 * @type {Agent}
 *
 * @description Agent Configuration:
 * - **Model**: GPT-4o-mini (cost-effective, fast responses)
 * - **Specialty**: Tourist and historical place recommendations
 * - **Output**: Structured list of 10 places to visit with descriptions
 * - **Language**: Automatically matches the user's input language
 * - **Behavior**: Direct response without follow-up questions
 *
 * @remarks
 * The agent is designed to be autonomous and requires minimal input:
 * - Only needs a city name mentioned in the user's message
 * - No interactive clarification needed
 * - Provides actionable travel recommendations immediately
 *
 * This configuration optimizes for:
 * - Low latency (fast model)
 * - Cost efficiency (mini model)
 * - User experience (no back-and-forth)
 * - International users (multilingual support)
 */
const visitPlannerAgent = new Agent({
  name: 'Visit Planner Agent',
  description: 'Agent that recommends places to visit in a city',
  instructions: `You are an expert agent in recommending tourist and historical places. 
  Read the user's message to identify the city name and provide a direct response with a list of 10 interesting places to visit, 
  including relevant historical, tourist, and cultural sites. For each place, include a brief description of why it's worth visiting.
  
  IMPORTANT: 
  - Respond in the SAME language as the user's message
  - Do NOT ask any questions or request additional information
  - The only requirement is that the user mentions a city name in their message
  - Provide the recommendations immediately based on the city mentioned`,
  model: openai.responses('gpt-4o-mini'),
});
