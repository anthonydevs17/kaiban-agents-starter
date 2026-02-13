import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { createDamagedBaggageCompensationAgentHandler } from '../../src/agents/damaged-baggage-compensation/handler';

export function createTestApp(baseUrl: string) {
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

  const agentPath = '/damagedBaggageCompensation/a2a';
  const agentUrl = `${baseUrl}${agentPath}`;
  const handler = createDamagedBaggageCompensationAgentHandler(agentUrl);
  new A2AExpressApp(handler).setupRoutes(app, agentPath);

  return app;
}
