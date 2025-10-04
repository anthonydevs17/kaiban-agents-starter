import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import 'dotenv/config';
import express from 'express';

import { basicAssistantRequestHandler } from '../agents/basic-assistant/handler';
import { metaAssistantRequestHandler } from '../agents/meta-assistant/handler';
import { createLogger } from '../shared/utils';

const logger = createLogger('Server');

// Create Express app first
const app = express();

/**
 * Basic CORS middleware to allow cross-origin requests in dev setups.
 * Adjust for your deployment/security needs.
 */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Setup A2A routes
new A2AExpressApp(basicAssistantRequestHandler).setupRoutes(app, '/agents/basicAssistant/a2a');
new A2AExpressApp(metaAssistantRequestHandler).setupRoutes(app, '/agents/metaAssistant/a2a');

// Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  logger.info(`🚀 A2A Server Running on http://localhost:${port}`);
  logger.info(`📝 Agents Cards:`);
  logger.info(` - /agents/basicAssistant/a2a/.well-known/agent-card.json`);
  logger.info(` - /agents/metaAssistant/a2a/.well-known/agent-card.json`);
});
