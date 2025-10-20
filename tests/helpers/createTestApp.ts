import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { visitPlannerAgentHandler } from '../../src/agents/visit-planner-agent/handler';

/**
 * Creates an Express app with the Visit Planner Agent mounted under its A2A base path.
 * Used for integration testing.
 */
export function createTestApp() {
  const app = express();

  // CORS middleware for test environment
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

  // Mount Visit Planner Agent
  new A2AExpressApp(visitPlannerAgentHandler).setupRoutes(app, '/agents/visitPlanner/a2a');

  return app;
}
