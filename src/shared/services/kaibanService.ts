import { createKaibanClient } from 'kaiban-sdk';
import type { ActivityCreate } from 'kaiban-sdk';

import { createLogger } from '../utils';

const logger = createLogger('KaibanService');

let _kaibanClient: ReturnType<typeof createKaibanClient> | null = null;

/**
 * Returns a singleton Kaiban SDK client when env variables are present.
 * If configuration is missing, returns null to allow graceful no-op usage.
 */
export function getKaibanClient(tenant?: string) {
  if (_kaibanClient) return _kaibanClient;
  const tenantToUse = process.env.KAIBAN_TENANT || tenant;
  const token = process.env.KAIBAN_API_KEY;
  const baseUrl = process.env.KAIBAN_API_BASE_URL;
  if (!tenantToUse || !token) return null;
  _kaibanClient = createKaibanClient({ tenant: tenantToUse, token, baseUrl });
  return _kaibanClient;
}

/**
 * Parses metadata to extract identifiers required for Kaiban operations.
 * Accepts snake_case or camelCase keys.
 */
export function extractIdsFromMetadata(
  meta: unknown,
): { card_id: string; board_id: string; team_id: string } | undefined {
  const m = (meta || {}) as Record<string, any>;
  const card_id = m.card_id || m.cardId;
  const board_id = m.board_id || m.boardId;
  const team_id = m.team_id || m.teamId;
  if (card_id && board_id && team_id) return { card_id, board_id, team_id };
  return undefined;
}

/**
 * Creates a card activity; no-ops if SDK is not configured.
 */
export async function apiCreateActivity(cardId: string, activity: ActivityCreate, tenant?: string) {
  try {
    const client = getKaibanClient(tenant);
    if (!client) return;
    await client.activities.create({ card_id: cardId, body: activity });
  } catch (err) {
    logger.warn({ err }, 'Failed to create activity');
  }
}

/**
 * Moves a card to the given column and creates an audit activity; no-ops if SDK is not configured.
 */
export async function apiMoveCardToColumn(cardId: string, newColumnKey: string, tenant?: string) {
  try {
    const client = getKaibanClient(tenant);
    if (!client) return;
    await client.cards.moveToColumn({ id: cardId, new_column_key: newColumnKey });
  } catch (err) {
    logger.warn({ err }, 'Failed to move card');
  }
}
