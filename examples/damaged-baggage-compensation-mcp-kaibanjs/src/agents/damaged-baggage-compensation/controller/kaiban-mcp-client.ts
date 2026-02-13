/**
 * @fileoverview Kaiban MCP Client for Damaged Baggage Compensation Agent
 *
 * Uses @modelcontextprotocol/sdk with Streamable HTTP transport.
 * Exposes Kaiban MCP tools for the Kaiban Card Sync Agent and executor helpers.
 *
 * @module agents/damaged-baggage-compensation/controller/kaiban-mcp-client
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { convertJsonSchemaToZod } from 'zod-from-json-schema';
import { z } from 'zod';

import { createLogger } from '../../../shared/logger';

const logger = createLogger('KaibanMCPClient');

export interface KaibanJSTool {
  name: string;
  description: string;
  schema: z.ZodType<Record<string, unknown>>;
  invoke: (input: Record<string, unknown>) => Promise<string>;
}

function getKaibanMcpUrl(): string {
  const url = process.env.KAIBAN_MCP_URL;
  if (url) return url;
  const tenant = process.env.KAIBAN_TENANT;
  const env = process.env.KAIBAN_ENVIRONMENT || 'prod';
  if (!tenant) {
    throw new Error(
      'Kaiban MCP URL not set. Set KAIBAN_MCP_URL or KAIBAN_TENANT (and optionally KAIBAN_ENVIRONMENT).',
    );
  }
  const base = env === 'prod' ? `${tenant}.kaiban.io` : `${tenant}-${env}.kaiban.io`;
  return `https://${base}/mcps/kaiban/mcp`;
}

let mcpClient: Client | null = null;

async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;
  const token = process.env.KAIBAN_API_TOKEN;
  if (!token) throw new Error('KAIBAN_API_TOKEN is required for Kaiban MCP.');
  const url = getKaibanMcpUrl();
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
    reconnectionOptions: {
      initialReconnectionDelay: 1000,
      maxReconnectionDelay: 30000,
      reconnectionDelayGrowFactor: 1.5,
      maxRetries: 5,
    },
  });
  const client = new Client({
    name: 'kaiban-damaged-baggage-compensation-client',
    version: '1.0.0',
  });
  transport.onerror = (err) => logger.warn({ err }, 'MCP transport error');
  await client.connect(transport);
  mcpClient = client;
  logger.info({ url }, 'Kaiban MCP client initialized (streamable-http)');
  return mcpClient;
}

function stringifyToolContent(
  content: Array<{ type?: string; text?: string; [k: string]: unknown }>,
): string {
  if (!Array.isArray(content) || content.length === 0) return '';
  return content
    .map((item) => {
      if (item?.type === 'text' && typeof item.text === 'string') return item.text;
      return JSON.stringify(item);
    })
    .join('\n');
}

const FALLBACK_TOOL_SCHEMA = z.record(z.unknown()) as z.ZodType<Record<string, unknown>>;

function inputSchemaToZod(
  inputSchema: unknown,
  toolName: string,
): z.ZodType<Record<string, unknown>> {
  if (
    !inputSchema ||
    typeof inputSchema !== 'object' ||
    Array.isArray(inputSchema) ||
    (inputSchema as { type?: string }).type !== 'object'
  ) {
    return FALLBACK_TOOL_SCHEMA;
  }
  try {
    return convertJsonSchemaToZod(
      inputSchema as Parameters<typeof convertJsonSchemaToZod>[0],
    ) as z.ZodType<Record<string, unknown>>;
  } catch (err) {
    logger.warn({ err, toolName }, 'JSON Schema to Zod conversion failed');
    return FALLBACK_TOOL_SCHEMA;
  }
}

export async function getKaibanTools(): Promise<KaibanJSTool[]> {
  const client = await getMcpClient();
  const { tools: mcpTools } = await client.listTools();
  return mcpTools.map((t) => {
    const name = t.name;
    const description = t.description ?? `MCP tool: ${name}`;
    const schema = inputSchemaToZod((t as { inputSchema?: unknown }).inputSchema, name);
    return {
      name,
      description,
      schema,
      async invoke(input: Record<string, unknown>): Promise<string> {
        const result = await client.callTool({ name, arguments: input });
        const content = Array.isArray(result.content) ? result.content : [];
        return stringifyToolContent(content);
      },
    };
  });
}

export interface KaibanCard {
  id?: string;
  description?: string;
  column_key?: string;
  status?: string;
  board_id?: string;
  team_id?: string;
  [key: string]: unknown;
}

export async function getCard(cardId: string): Promise<KaibanCard | null> {
  const client = await getMcpClient();
  try {
    const result = await client.callTool({ name: 'get_card', arguments: { card_id: cardId } });
    const content = Array.isArray(result.content) ? result.content : [];
    if (content[0] && typeof content[0] === 'object' && 'text' in content[0]) {
      return JSON.parse((content[0] as { text: string }).text) as KaibanCard;
    }
    return null;
  } catch (err) {
    logger.error({ err, cardId }, 'getCard failed');
    return null;
  }
}

export interface KaibanActor {
  id: string;
  type: string;
  name: string;
}

export async function moveCardToBlocked(
  cardId: string,
  boardId: string,
  teamId: string,
  actor: KaibanActor,
): Promise<void> {
  const client = await getMcpClient();
  try {
    await client.callTool({
      name: 'move_card',
      arguments: {
        card_id: cardId,
        column_key: 'blocked',
        actor: { id: actor.id, type: actor.type || 'agent', name: actor.name },
      },
    });
  } catch (err) {
    logger.error({ err, cardId }, 'move_card to blocked failed');
    throw err;
  }
  try {
    await client.callTool({
      name: 'create_card_activities',
      arguments: {
        card_id: cardId,
        activities: [
          {
            board_id: boardId,
            team_id: teamId,
            type: 'CARD_STATUS_CHANGED',
            description: 'Card status changed to blocked',
            actor: { id: actor.id, type: actor.type || 'agent', name: actor.name },
            changes: [{ field: 'status', new_value: 'blocked' }],
          },
          {
            board_id: boardId,
            team_id: teamId,
            type: 'CARD_COLUMN_CHANGED',
            description: 'Card moved to blocked column',
            actor: { id: actor.id, type: actor.type || 'agent', name: actor.name },
            changes: [{ field: 'column_key', new_value: 'blocked' }],
          },
        ],
      },
    });
  } catch (err) {
    logger.warn({ err, cardId }, 'create_card_activities after move to blocked failed');
  }
}
