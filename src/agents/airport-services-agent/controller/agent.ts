/**
 * @fileoverview Airport Services Advisor AI Agent Configuration and Invocation
 *
 * This module defines and exports the core AI agent responsible for generating
 * airport services recommendations. It uses AWS Bedrock with Anthropic's Claude model
 * to provide expert advice on airport lounges, restaurants, services, and amenities based on airport and travel preferences.
 *
 * @module agents/airport-services-agent/controller/agent
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

import { createLogger } from '../../../shared/logger';

const logger = createLogger('AirportServicesAgentController');

/**
 * AWS Bedrock client instance for invoking Anthropic Claude models
 * Initialized with region from environment variable or defaulting to us-east-1
 */
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Anthropic Claude model identifier for AWS Bedrock
 *
 * Options:
 * - Direct model ID: 'anthropic.claude-3-haiku-20240307-v1:0' (works directly)
 * - Inference profile: 'us.anthropic.claude-3-5-haiku-20241022-v1:0' (for Claude 3.5 Haiku)
 * - Direct model ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0' (Claude 3.5 Sonnet, better quality)
 *
 * Visit this link for getting the model ID options: https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
 *
 * Using Claude 3 Haiku for cost-effective, fast responses with direct invocation.
 * To use Claude 3.5 Haiku, change to: 'us.anthropic.claude-3-5-haiku-20241022-v1:0'
 *
 * Note: If you face issues with the model, try using the inference profile model ID. Check this link for more information: https://repost.aws/questions/QUEU82wbYVQk2oU4eNwyiong/bedrock-api-invocation-error-on-demand-throughput-isn-s-supported
 */
const CLAUDE_MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

/**
 * Invokes the Airport Services Advisor AI Agent to process user requests for airport services recommendations.
 *
 * @param userMessage - The user's request containing an airport code/city and optional context (travel class, layover duration, service preferences)
 * @returns Promise containing the AI-generated response and token usage metrics
 *
 * @example
 * const result = await callAirportServicesAgent("What are the best lounges and restaurants at JFK airport?");
 * console.log(result.response); // List of airport services recommendations
 * console.log(result.usage);    // Token usage and cost information
 *
 * @description This function:
 * - Sends the user message to AWS Bedrock Anthropic Claude model
 * - Receives structured airport services recommendations for the requested airport
 * - Returns both the response text and detailed token usage metrics
 * - Token metrics are used for cost tracking and reporting in Kaiban platform
 */
export const callAirportServicesAgent = async (userMessage: string) => {
  // Construct the system prompt for the agent
  const systemPrompt = `You are an expert agent in recommending airport services, lounges, and amenities. 
Read the user's message to identify the airport code or city name, travel class, layover duration, and any service preferences. 
Provide a direct response with comprehensive airport services recommendations, including:
- Airport lounge recommendations (with access requirements and amenities)
- Best restaurants and cafes (with locations and cuisine types)
- Shopping recommendations (duty-free, retail stores)
- Services available (spa, showers, sleeping pods, business centers)
- Terminal navigation tips and locations
- Wi-Fi, charging stations, and other essential amenities

IMPORTANT: 
- Respond in the SAME language as the user's message
- Do NOT ask any questions or request additional information
- The only requirement is that the user mentions an airport code (e.g., JFK, LHR) or city name
- Provide the recommendations immediately based on the airport mentioned
- If travel class or preferences are not specified, provide recommendations for all classes
- Include practical information like terminal locations and access requirements`;

  // Anthropic Claude API format for Bedrock
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
  };

  // Create the invoke model command
  const input: InvokeModelCommandInput = {
    modelId: CLAUDE_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  };

  try {
    // Invoke the model via AWS Bedrock
    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract the text content from Claude's response
    const textContent =
      responseBody.content?.find((item: { type: string }) => item.type === 'text')?.text || '';

    // Extract usage information
    const usage = responseBody.usage || {};

    // Return structured response with AI-generated text and usage metrics
    return {
      response: textContent,
      usage: {
        model: CLAUDE_MODEL_ID, // Model identifier for cost calculation
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        reasoningTokens: usage.reasoning_tokens || 0,
      },
    };
  } catch (error) {
    // Enhanced error handling for AWS Bedrock specific errors
    if (error instanceof Error) {
      logger.error({ error }, 'Failed to invoke AWS Bedrock model');
      throw new Error(
        `Failed to invoke AWS Bedrock model: ${error.message}. Make sure the model is available in your region and you have proper IAM permissions.`,
      );
    }
    throw error;
  }
};
