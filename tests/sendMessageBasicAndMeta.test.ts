import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createClientFromServer } from './helpers/a2aClient';
import { startTestServer } from './helpers/testServer';

let baseUrl = '';
let close: () => Promise<void>;

beforeAll(async () => {
  const s = await startTestServer();
  baseUrl = s.baseUrl;
  close = s.close;
});

afterAll(async () => {
  await close();
});

function makeClientParams(text: string) {
  return {
    message: {
      kind: 'message' as const,
      messageId: 'm1',
      role: 'user' as const,
      parts: [{ kind: 'text' as const, text }],
    },
  };
}

describe('Send message (non-streaming, via A2AClient)', () => {
  it('basic assistant returns echo', async () => {
    const client = await createClientFromServer(baseUrl, '/agents/basicAssistant/a2a');
    const rpc = await client.sendMessage(makeClientParams('hello'));
    const res = (rpc as any).result;
    const textPart = res.parts.find((p: any) => p.kind === 'text');
    expect(textPart.text).toContain('Echo: hello');
  });

  it('meta assistant returns acknowledgement', async () => {
    const client = await createClientFromServer(baseUrl, '/agents/metaAssistant/a2a');
    const rpc = await client.sendMessage(makeClientParams('hello'));
    const res = (rpc as any).result;
    const textPart = res.parts.find((p: any) => p.kind === 'text');
    expect(textPart.text).toContain('Got it. You said: hello');
  });
});
