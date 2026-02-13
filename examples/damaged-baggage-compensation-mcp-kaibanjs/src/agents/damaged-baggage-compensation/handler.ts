/**
 * @fileoverview A2A Request Handler for Damaged Baggage Compensation Agent
 *
 * Combines Agent Card, Task Store, and Executor for the A2A protocol.
 *
 * @module agents/damaged-baggage-compensation/handler
 */

import path from 'path';
import { fileURLToPath } from 'url';

import { DefaultRequestHandler } from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import express from 'express';

import { damagedBaggageCompensationAgentCard } from './card';
import { tasksStore, damagedBaggageCompensationExecutor } from './executor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const samplesDir = path.join(__dirname, '../../../samples');

export const createDamagedBaggageCompensationAgentHandler = (agentUrl: string) => {
  return new DefaultRequestHandler(
    damagedBaggageCompensationAgentCard(agentUrl),
    tasksStore,
    damagedBaggageCompensationExecutor,
  );
};

export const setupDamagedBaggageCompensationRoutes = (app: express.Express, baseUrl: string) => {
  const agentPath = '/damagedBaggageCompensation/a2a';
  const agentUrl = `${baseUrl}${agentPath}`;

  new A2AExpressApp(createDamagedBaggageCompensationAgentHandler(agentUrl)).setupRoutes(
    app,
    agentPath,
  );

  const samplesPath = '/damagedBaggageCompensation/samples';
  app.use(samplesPath, express.static(samplesDir));

  const sampleFileUrl = `${baseUrl}${samplesPath}/baggage-claim-example.txt`;

  return {
    agentUrl,
    cardUrl: `${agentUrl}/.well-known/agent-card.json`,
    sampleFileUrl,
  };
};
