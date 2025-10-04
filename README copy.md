# Kaiban A2A Agent Starter

A minimal template to build A2A agents connected to the Kaiban Platform using `@a2a-js/sdk` and `kaiban-sdk` (optional). It ships with TypeScript, ESLint, Prettier, Husky + lint-staged, Vitest, a simple Express A2A server, and two sample agents.

## Features

- TypeScript + ESLint (flat) + Prettier
- Husky + lint-staged pre-commit
- Express A2A server with CORS
- Two sample agents: `basic-assistant`, `meta-assistant`
- `pino` logger utility
- Node 22 compatible
- Dockerfile & sample GitHub Actions deploy workflow

## Getting Started

1. Copy this template or click "Use this template" in GitHub.
2. Install dependencies:

```bash
npm ci
```

3. Create `.env` from `.env.example` and adjust values.
4. Run in dev:

```bash
npm run dev
```

5. Build & start:

```bash
npm run build && npm start
```

## Environment

See `.env.example`. Key variables:

- `PORT` (default 4000)
- `A2A_BASE_URL` (public base URL)
- `LOG_LEVEL`
- Optional `KAIBAN_*` variables if you integrate `kaiban-sdk`.

## Project Structure

```text
src/
  server/
    index.ts                  # Express + A2A routes
  agents/
    basic-assistant/
      card.ts                 # Agent card metadata
      executor.ts             # Task execution logic
      handler.ts              # Wires card + executor into request handler
    meta-assistant/
      card.ts
      executor.ts
      handler.ts
  shared/
    utils/
      logger.ts               # pino-based logger
      index.ts
```

## Endpoints

Server logs will show agent card endpoints, e.g.:

- `/agents/basicAssistant/a2a/.well-known/agent-card.json`
- `/agents/metaAssistant/a2a/.well-known/agent-card.json`

## Scripts

- `dev`: run server with TSX
- `build`: compile TypeScript
- `start`: start compiled server
- `lint`: run ESLint
- `format`: run Prettier
- `test`: run Vitest
- `prepare`: install Husky hooks
- `refresh`: clean reinstall deps

## Pre-commit

Husky + lint-staged are configured to format and lint staged files.

## Docker

Build a container image:

```bash
docker build -t kaiban-a2a-agent-starter:dev .
```

Run:

```bash
docker run -p 4000:4000 --env-file .env kaiban-a2a-agent-starter:dev
```

## GitHub Actions

`.github/workflows/deploy-dev.yml` contains a sample job to build and (placeholder) deploy.

## Notes

- Use the provided structure to add new agents under `src/agents`.
- Keep implementations simple and add brief docs to methods.
- For Kaiban Platform communication, integrate `kaiban-sdk` in executors as needed.
