/**
 * @fileoverview Main Server Entry Point for Damaged Baggage Compensation Agent
 *
 * Bootstraps the Express server and configures A2A endpoints for the
 * Damaged Baggage Compensation agent.
 *
 * @module index
 */

import 'dotenv/config';
import express from 'express';

import { setupDamagedBaggageCompensationRoutes } from './agents/damaged-baggage-compensation/handler';
import { createLogger } from './shared/logger';

const logger = createLogger('A2A Server');
const app = express();

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

const port = process.env.PORT || 4001;
const baseUrl = process.env.A2A_BASE_URL || `http://localhost:${port}`;

app.listen(port, async () => {
  const routes = setupDamagedBaggageCompensationRoutes(app, baseUrl);

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
  
  Damaged Baggage Compensation Agent
  
  A2A Server Endpoints:
  ------------------------------------------------------------
    -> Card:   ${routes.cardUrl}
    -> Agent:  ${routes.agentUrl}
    -> Sample: ${routes.sampleFileUrl}
  ------------------------------------------------------------
  `);
  logger.info('🚀 Listening Requests');
});
