import express from 'express';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';

import { basicAssistantRequestHandler } from '../../src/agents/basic-assistant/handler';
import { metaAssistantRequestHandler } from '../../src/agents/meta-assistant/handler';

/**
 * Creates an Express app with both sample agents mounted under their A2A base paths.
 */
export function createTestApp() {
  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  new A2AExpressApp(basicAssistantRequestHandler).setupRoutes(app, '/agents/basicAssistant/a2a');
  new A2AExpressApp(metaAssistantRequestHandler).setupRoutes(app, '/agents/metaAssistant/a2a');

  return app;
}
