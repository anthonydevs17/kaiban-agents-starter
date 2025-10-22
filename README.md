# Kaiban Agents Starter

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![A2A Protocol](https://img.shields.io/badge/A2A-0.3.0-orange.svg)](https://github.com/google/a2a-protocol)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A production-ready starter template for building agents that integrate with the [Kaiban platform](https://kaiban.io). This example demonstrates a **Visit Planner Agent** that recommends tourist and historical places to visit in cities.

## 📖 Table of Contents

- [What is this?](#-what-is-this)
- [Quick Start](#-quick-start)
- [Configuration](#️-configuration)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Security Considerations](#-security-considerations)
- [Additional Resources](#-additional-resources)

## 🎯 What is this?

This starter project showcases how to:

- Build an A2A protocol compliant agent using `@a2a-js/sdk`
- Integrate seamlessly with the Kaiban platform using `@kaiban/sdk`
- Process Kaiban activities (cards) with AI-powered responses
- Track costs and manage workflow states (TODO → DOING → DONE → BLOCKED)
- Deploy a production-ready agent with Express.js

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone git@github.com:kaiban-ai/kaiban-agents-starter.git
cd kaiban-agents-starter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following content:

```bash
# Create .env file
cat > .env << 'EOF'
# ============================================
# KAIBAN AGENT CONFIGURATION
# ============================================

# --------------------------------------------
# REQUIRED VARIABLES
# --------------------------------------------

# Kaiban Platform Credentials
KAIBAN_TENANT=your-tenant-name
KAIBAN_API_TOKEN=your-kaiban-api-token
KAIBAN_AGENT_ID=your-agent-id

# OpenAI API Key
OPENAI_API_KEY=sk-proj-your-openai-api-key

# --------------------------------------------
# OPTIONAL VARIABLES (uncomment to customize)
# --------------------------------------------

# PORT=4000
# A2A_BASE_URL=http://localhost:4000
# KAIBAN_API_URL=https://your-tenant.kaiban.io/api
EOF
```

### 4. Run the Agent

**Development mode** (with hot reload):

```bash
npm run dev
```

**Production build**:

```bash
npm run build
npm start
```

**Run tests**:

```bash
npm test
```

Your agent will be available at:

- **Server**: `http://localhost:4000`
- **Agent Card**: `http://localhost:4000/agents/visitPlanner/a2a/.well-known/agent-card.json`
- **Execution Endpoint**: `POST http://localhost:4000/agents/visitPlanner/a2a`

## ⚙️ Configuration

### Environment Variables

#### Required Variables

| Variable           | Description                                | Example        |
| ------------------ | ------------------------------------------ | -------------- |
| `KAIBAN_TENANT`    | Your Kaiban platform tenant identifier     | `agi`          |
| `KAIBAN_API_TOKEN` | Authentication token for Kaiban API        | `kb_abc123...` |
| `KAIBAN_AGENT_ID`  | Unique identifier for this agent in Kaiban | `xyz789Fqn...` |
| `OPENAI_API_KEY`   | OpenAI API key for GPT-4o-mini model       | `sk-proj-...`  |

#### Optional Variables

| Variable         | Description                                          | Default                           |
| ---------------- | ---------------------------------------------------- | --------------------------------- |
| `PORT`           | Server port                                          | `4000`                            |
| `A2A_BASE_URL`   | Public base URL for the agent (for ngrok/production) | `http://localhost:4000`           |
| `KAIBAN_API_URL` | Kaiban API base URL                                  | `https://${tenant}.kaiban.io/api` |

### Getting Your Credentials

**Kaiban credentials**: Sign up at [kaiban.io](https://kaiban.io) and navigate to:

- Dev Tools → To get your `TENANT` and `KAIBAN_API_TOKEN`
- Onboard → Create Agent to get your `KAIBAN_AGENT_ID`

> Kaiban uses **airline IATA codes** as tenant identifiers—`cm` for Copa Airlines, `nk` for Spirit Airlines, etc. Your tenant code appears in your dashboard URL: `https://{IATA-CODE}.kaiban.io`. Examples in this guide use `agi` as a placeholder.

**OpenAI API Key**: Get your key from [OpenAI Platform](https://platform.openai.com/api-keys)

### Using ngrok for Development

To expose your local agent to the internet (useful for testing with Kaiban platform):

```bash
ngrok http 4000
```

Then update your `.env`:

```env
A2A_BASE_URL=https://your-ngrok-url.ngrok-free.app
```

## 🔧 How It Works

### Architecture Overview

This starter implements a complete integration between the A2A protocol and the Kaiban platform:

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Kaiban Board   │ ────▶   │  Your Agent  │  ────▶  │   OpenAI API    │
│   (Activities)  │         │  (A2A + SDK) │         │  (GPT-4o-mini)  │
└─────────────────┘         └──────────────┘         └─────────────────┘
```

### Card Processing Workflow

When a card is created or assigned to your agent in Kaiban:

1. **Activity Reception**: Kaiban sends a `kaiban_activity` data part via A2A protocol
2. **Validation**: Agent validates the activity type (CARD_CREATED, CARD_AGENT_ADDED, etc.)
3. **Status Transition**: Card moves to "DOING" status
4. **AI Processing**: Card description is sent to OpenAI GPT-4o-mini
5. **Response Generation**: AI generates 10 tourist recommendations
6. **Cost Tracking**: Token usage is calculated and logged to Kaiban
7. **Completion**: Card moves to "DONE" with the AI response, or "BLOCKED" on error

### Key Components

#### 1. **A2A Protocol Handler** (`src/agents/visit-planner-agent/handler.ts`)

Integrates three core components:

- **Agent Card**: Metadata for A2A protocol discovery
- **Task Store**: In-memory task state management
- **Executor**: Business logic and execution flow

#### 2. **Executor** (`src/agents/visit-planner-agent/executor.ts`)

Handles the A2A protocol lifecycle:

- Receives messages via A2A protocol
- Extracts Kaiban activities from data parts
- Manages task state (submitted → working → completed)
- Delegates to Kaiban Controller

#### 3. **Kaiban Controller** (`src/agents/visit-planner-agent/controller/kaiban-controller.ts`)

Orchestrates the Kaiban platform integration:

- Processes card activities
- Manages card state transitions (TODO → DOING → DONE → BLOCKED)
- Creates activity logs in Kaiban
- Tracks costs and usage metrics

#### 4. **AI Agent** (`src/agents/visit-planner-agent/controller/agent.ts`)

Configures the OpenAI agent:

- Uses GPT-4o-mini for cost-effective responses
- Provides tourist recommendations for cities
- Responds in the user's language
- Returns 10 places with descriptions

### Activity Processing Flow

```typescript
// 1. Activity arrives via A2A protocol
POST /agents/visitPlanner/a2a
{
  "kind": "data",
  "data": {
    "type": "kaiban_activity",
    "activity": {
      "type": "CARD_CREATED",
      "card_id": "card-123",
      // ... activity data
    }
  }
}

// 2. Agent processes the card
//    - Reads card description from Kaiban API
//    - Sends to OpenAI for processing
//    - Updates card with AI response
//    - Logs costs and activities

// 3. Card updated in Kaiban platform
//    - Status: DONE
//    - Result: "Here are 10 places to visit in Barcelona: ..."
//    - Cost tracking logged
```

### Kaiban SDK Integration

The agent uses `@kaiban/sdk` to interact with the Kaiban platform:

```typescript
// Initialize client
const kaibanClient = createKaibanClient({
  baseUrl,
  tenant,
  token,
});

// Get agent information
const agent = await kaibanClient.agents.get(agentId);

// Fetch card details
const card = await kaibanClient.cards.get(cardId);

// Update card status
await kaibanClient.cards.update(cardId, {
  result: aiResponse,
  status: CardStatus.DONE,
  column_key: 'done',
});

// Log activities and costs
await kaibanClient.cards.createBatchActivities(cardId, activities);

// Calculate costs
const { totalCost, totalTokens } = kaibanClient.costs.calculateCosts(usage);
```

## 📁 Project Structure

```
kaiban-agents-starter/
├── src/
│   ├── agents/
│   │   └── visit-planner-agent/
│   │       ├── card.ts              # A2A agent card configuration
│   │       ├── handler.ts           # A2A request handler
│   │       ├── executor.ts          # A2A execution logic
│   │       └── controller/
│   │           ├── agent.ts         # OpenAI agent configuration
│   │           └── kaiban-controller.ts  # Kaiban platform integration
│   ├── shared/
│   │   └── logger.ts                # Structured logging
│   └── index.ts                     # Express server entry point
├── tests/
│   ├── agentCards.test.ts           # Agent card discovery tests
│   ├── kaibanActivityDataPart.test.ts  # Activity processing tests
│   ├── setup.ts                     # Test mocks and configuration
│   └── helpers/                     # Test utilities
├── .env.example                     # Environment variables template
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
└── vitest.config.mts               # Test configuration
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Tests include:

- ✅ Agent card discovery and validation
- ✅ Kaiban activity data part handling
- ✅ A2A protocol compliance
- ✅ Mock integrations (no real API calls needed)

## 🚢 Deployment

### Option 1: Docker

```bash
docker build -t kaiban-agent .
docker run -p 4000:4000 --env-file .env kaiban-agent
```

### Option 2: Node.js

```bash
npm run build
NODE_ENV=production npm start
```

### Option 3: Cloud Platforms

Deploy to your preferred platform:

- **Vercel**: `vercel deploy`
- **Heroku**: `git push heroku main`
- **AWS/GCP/Azure**: Use your platform's Node.js deployment guide

**Important**: Update `A2A_BASE_URL` in your environment to your production URL.

## 🔒 Security Considerations

- **API Keys**: Never commit `.env` files to version control
- **CORS**: Update CORS configuration in production (see `src/index.ts`)
- **Rate Limiting**: Implement rate limiting for production deployments
- **Authentication**: The agent validates Kaiban API tokens automatically
- **HTTPS**: Always use HTTPS in production for `A2A_BASE_URL`

## 📚 Additional Resources

- [A2A Protocol Specification](https://github.com/google/a2a-protocol)
- [Kaiban Platform Documentation](https://docs.kaiban.io)
- [A2A JS SDK](https://www.npmjs.com/package/@a2a-js/sdk)
- [Kaiban SDK](https://www.npmjs.com/package/@kaiban/sdk)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/kaiban-agents-starter/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/kaiban-agents-starter/discussions)
- **Kaiban Support**: [support@kaiban.io](mailto:support@kaiban.io)

---

Built with ❤️ for the Kaiban Devs
