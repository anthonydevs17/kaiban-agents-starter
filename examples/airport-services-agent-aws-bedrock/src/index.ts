/**
 * @fileoverview Main Server Entry Point for Airport Services Advisor Agent
 *
 * This is the main application entry point that bootstraps the Express server
 * and configures the A2A (Agent-to-Agent) protocol endpoints for the Airport Services Advisor agent.
 *
 * The server provides:
 * - A2A protocol compliance for agent communication
 * - RESTful endpoints for agent card discovery
 * - CORS support for cross-origin requests
 * - Integration with Kaiban platform
 *
 * @module index
 */

import 'dotenv/config';
import express from 'express';

import { setupAirportServicesAgentRoutes } from './agents/airport-services-agent/handler';
import { createLogger } from './shared/logger';

const logger = createLogger('A2A Server');

/**
 * Express application instance serving as the HTTP server foundation.
 * Configured with CORS support and A2A protocol endpoints.
 */
const app = express();

/**
 * CORS (Cross-Origin Resource Sharing) middleware configuration.
 *
 * @description Security Configuration:
 * - **Development Mode**: Currently allows all origins (*)
 * - **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
 * - **Preflight Support**: Handles OPTIONS requests for CORS
 * - **Custom Headers**: Supports Authorization and standard HTTP headers
 *
 * @warning Production Considerations:
 * Replace wildcard (*) with specific allowed origins for security:
 * - res.header('Access-Control-Allow-Origin', 'https://app.kaiban.io')
 * - Consider using the 'cors' npm package for advanced configurations
 * - Implement origin validation for production deployments
 *
 * @example Production Configuration
 * const allowedOrigins = ['https://app.kaiban.io', 'https://your-domain.com'];
 * if (allowedOrigins.includes(req.headers.origin)) {
 *   res.header('Access-Control-Allow-Origin', req.headers.origin);
 * }
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * HTTP Server Initialization
 *
 * Starts the Express server on the configured port (default: 4000).
 * The server listens for incoming A2A protocol requests and Kaiban platform events.
 *
 * @constant {number} port - Server port from environment variable or default 4000
 *
 * @description Available Endpoints:
 * - Airport Services Advisor Agent:
 *   - Discovery: GET /agents/airportServices/a2a/.well-known/agent-card.json
 *   - Execute: POST /agents/airportServices/a2a
 *
 * @remarks Environment Variables:
 * - PORT: Server port (optional, defaults to 4000)
 * - A2A_BASE_URL: Public base URL for the agent (optional, defaults to http://localhost:4000)
 *   Used in agent card for external access. Useful for ngrok, tunneling, or production domains.
 * - KAIBAN_TENANT: Kaiban platform tenant identifier (required)
 * - KAIBAN_API_TOKEN: Authentication token for Kaiban API (required)
 * - KAIBAN_AIRPORT_SERVICES_AGENT_ID: Unique identifier for Airport Services Advisor agent in Kaiban (required, falls back to KAIBAN_AGENT_ID)
 * - KAIBAN_API_URL: Kaiban API base URL (optional, defaults to https://${tenant}.kaiban.io/api)
 * - AWS_REGION: AWS region for Bedrock (optional, defaults to us-east-1)
 * - AWS_ACCESS_KEY_ID: AWS access key for Bedrock (required)
 * - AWS_SECRET_ACCESS_KEY: AWS secret key for Bedrock (required)
 * - BEDROCK_MODEL_ID: AWS Bedrock model ID (optional, defaults to us.anthropic.claude-3-5-haiku-20241022-v1:0)
 */
const port = process.env.PORT || 4000;
let baseUrl = process.env.A2A_BASE_URL || `http://localhost:${port}`;

/**
 * A2A (Agent-to-Agent) Protocol Routes Configuration
 *
 * @description Sets up the A2A protocol endpoints following Google's A2A specification:
 * - **Airport Services Advisor Agent**: POST /agents/airportServices/a2a, GET /agents/airportServices/a2a/.well-known/agent-card.json
 *
 * The A2AExpressApp automatically creates these endpoints:
 * - Agent discovery via .well-known/agent-card.json
 * - Task execution with streaming responses via Server-Sent Events (SSE)
 *
 * @see {@link https://github.com/google/a2a-protocol} A2A Protocol Specification
 */

app.listen(port, async () => {
  // Setup agent routes
  const airportServices = setupAirportServicesAgentRoutes(app, baseUrl);

  console.log(`
   _  __     _ _                 
  | |/ /__ _(_) |__  __ _ _ _    
  | ' </ _\` | | '_ \\/ _\` | ' \\   
  |_|\\_\\__,_|_|_.__/\\__,_|_||_|  
   ___  _            _            
  / __|| |_  __ _ _ _| |_  ___  _ _ 
  \\__ \\|  _|/ _\` | '_|  _|/ -_)| '_|
  |___/ \\__|\\__,_|_|  \\__|\\___||_|  
                                v1.0.0
  
            |
      --@--(-)--@--
  
  A2A Server Endpoints:
  ------------------------------------------------------------
  Airport Services Advisor Agent:
    -> Card:  ${airportServices.cardUrl}
    -> Agent: ${airportServices.agentUrl}
  ------------------------------------------------------------
  `);
  logger.info(`🚀 Listening Requests`);
});
