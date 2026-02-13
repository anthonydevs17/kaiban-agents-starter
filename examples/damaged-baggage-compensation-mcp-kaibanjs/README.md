# Damaged Baggage Compensation Agent (KaibanJS)

Example agent that generates **instant baggage compensation offers** from damage claim data. Inspired by the [Kaiban use case: AI Agent for Airlines – Automated Damaged Baggage Compensation](https://www.kaiban.io/use-cases/damaged-baggage-compensation-automation).

**Kaiban integration** uses Kaiban MCP (not `@kaiban/sdk`) for card/column/activities. Agents call MCP tools (`get_card`, `move_card`, `update_card`, `create_card_activities`) to read and update cards on the Kaiban platform.

## Architecture

- **Sequential team**: 5 tasks, 4 agents (Kaiban Card Sync handles Task 0 and Task 4 via MCP).
- **Kaiban MCP**: Card lifecycle is performed by agents via the [Kaiban MCP Server](https://docs.kaiban.io/references/kaiban-mcp) and [@langchain/mcp-adapters](https://docs.kaibanjs.com/how-to/MCP-Adapter-Integration).
- **Tools**: `get_airline_policy` (mock), `get_historical_payouts` (mock), `search_product_market_price` (Tavily – 1 call per product, max 5).
- **Error handling**: On team error, the executor moves the card to `blocked` via MCP.

### Team flow

0. **Get card & move to doing** – Kaiban Card Sync Agent (MCP); outputs `userMessage` (claim description).
1. **Extract & Validate claim** – Claim Extraction & Validation Agent parses and validates claim data.
2. **Calculate compensation** – Compensation Calculation Agent uses `get_airline_policy`, `get_historical_payouts`, `search_product_market_price` (Tavily).
3. **Generate compensation offer** – Compensation Offer Agent produces the final offer with justification.
4. **Update card & move to done** – Kaiban Card Sync Agent (MCP).

### Agents

1. **Kaiban Card Sync Agent** – MCP tools for Task 0 (get card, move to doing) and Task 4 (update result, move to done).
2. **Claim Extraction & Validation Agent** – Extracts and validates baggage claim details from free text.
3. **Compensation Calculation Agent** – Uses policy, historical payouts, and Tavily for market prices (max 5 products).
4. **Compensation Offer Agent** – Produces the final compensation offer text.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: KAIBAN_*, KAIBAN_MCP_URL, OPENAI_API_KEY, TAVILY_API_KEY
npm run dev
```

### Environment

- **KAIBAN_MCP_URL** – Optional. Defaults to `https://<tenant>-<env>.kaiban.io/mcps/kaiban/mcp`.
- **KAIBAN_API_TOKEN** – Required for MCP auth (Bearer).
- **KAIBAN_ENVIRONMENT** – Optional: `dev` | `staging` | `prod` (default: prod).
- **TAVILY_API_KEY** – Required for real-time product price search (Tavily).

## Endpoints

- **Card:** `GET /damagedBaggageCompensation/a2a/.well-known/agent-card.json`
- **Agent:** `POST /damagedBaggageCompensation/a2a`
- **Sample claim:** `GET /damagedBaggageCompensation/samples/baggage-claim-example.txt`

## Input from Kaiban.io

The executor receives a Kaiban activity (A2A). It validates the card via MCP `get_card` (description present, column `todo`), then runs the team with `card_id`, `board_id`, `team_id`, and the agent’s `agent_id`/`agent_name`. Task 0 fetches the card description and moves to doing; Task 4 writes the compensation offer and moves to done.

## Tests

```bash
npm test
```

Tests validate the agent card; Kaiban MCP, Tavily, and KaibanJS are mocked so no real external calls are made.
