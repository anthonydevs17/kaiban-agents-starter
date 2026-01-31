# Kaiban Integration Package

This document explains the `kaiban_integration` package, which provides the integration layer between the Weather Agent and the Kaiban platform using the A2A protocol.

## Project Structure

```
virgin-ailine-integration-agent/
├── agent/
│   ├── __init__.py
│   ├── weather_agent.py              # Core weather agent logic
│   ├── a2a_integration/               # A2A protocol integration
│   │   ├── __init__.py
│   │   ├── card.py                   # AgentCard definition
│   │   ├── executor.py               # WeatherAgentExecutor (A2A SDK)
│   │   └── server.py                 # FastAPI server setup
│   └── kaiban_integration/           # Kaiban platform integration
│       ├── __init__.py               # Package exports
│       ├── client.py                 # KaibanClient (HTTP client)
│       └── controller.py             # WeatherController (activity handler)
├── main.py                           # Application entry point
├── requirements.txt                  # Dependencies
├── .env                              # Environment configuration (not in repo)
└── .env.example                      # Example environment configuration
```

## Package: `agent.kaiban_integration`

The `kaiban_integration` package provides two main components for interacting with the Kaiban platform:

### 1. `KaibanClient` (`client.py`)

HTTP client for the Kaiban API, equivalent to the `@kaiban/sdk` TypeScript package.

#### Features

- **Automatic API versioning**: Adds `/v1` prefix to all endpoints
- **Authentication**: Handles Bearer token and tenant headers
- **RESTful API methods**: Cards, Boards, and Agents endpoints

#### API Methods

**Cards:**

- `get_card(card_id: str)` → `GET /v1/card/{id}`
- `update_card(card_id: str, data: Dict)` → `PUT /v1/card/{id}`
- `create_batch_activities(card_id: str, activities: List)` → `PUT /v1/card/{id}/activities`

**Boards:**

- `get_board(board_id: str)` → `GET /v1/board/{id}`

**Agents:**

- `get_agent(agent_id: str)` → `GET /v1/agent/{id}`

#### Configuration

```python
from agent.kaiban_integration import KaibanClient

client = KaibanClient(
    tenant="agi",  # Kaiban tenant name
    token="your_token",  # Optional, uses KAIBAN_SHARED_TOKEN env var
    base_url="https://agi.kaiban.io/api"  # Optional, auto-constructed
)
```

#### Environment Variables

- `KAIBAN_TENANT`: Tenant name (default: "agi")
- `KAIBAN_SHARED_TOKEN`: Authentication token
- `KAIBAN_API_URL`: Base API URL (default: `https://{tenant}.kaiban.io/api`)

### 2. `WeatherController` (`controller.py`)

Controller that handles Kaiban activities and orchestrates the weather agent execution.

#### Responsibilities

1. **Activity Processing**: Handles different activity types from Kaiban
2. **Card State Management**: Moves cards through workflow stages (todo → doing → done/blocked)
3. **Weather Agent Execution**: Invokes the weather agent and formats results
4. **Activity Logging**: Creates activity records for audit trails

#### Activity Types Handled

- `card_created`: New card created
- `card_cloned`: Card cloned
- `card_column_changed`: Card moved to different column
- `card_comment_added`: Comment added to card

#### Workflow Stages

The controller manages cards through these process stages:

- **`todo`**: Initial state, card ready to be processed
- **`doing`**: Card is being processed by the agent
- **`done`**: Card processing completed successfully
- **`blocked`**: Card processing failed with error

#### Key Methods

**`build()` - Factory Method**

```python
controller = await WeatherController.build(
    tenant="agi",
    thread_id="context-123",
    card_id="card-456",
    user_id="user-789"
)
```

Fetches card, board, and agent data from Kaiban API and initializes the controller.

**`process_activity(activity: Dict)`**

```python
await controller.process_activity(activity_data)
```

Processes incoming Kaiban activities and triggers weather agent execution when appropriate.

**`process_weather_agent_execution(activity, user_input=None)`**

```python
await controller.process_weather_agent_execution(activity, user_input="What's the weather in Paris?")
```

1. Moves card to `doing` status
2. Executes weather agent with input
3. Formats response
4. Updates card with result and moves to `done` status
5. Creates activity records for all state changes
6. On error, moves card to `blocked` status

**`get_column_key_for_stage(stage: str)`**

```python
column_key = controller.get_column_key_for_stage("doing")
```

Maps process stage names to board column keys.

**`format_weather_response(response: str)`**

```python
formatted = controller.format_weather_response(weather_agent_output)
```

Formats weather agent JSON response into Markdown for Kaiban card display.

#### Constants

**Process Stages:**

- `TODO_PROCESS_STAGE = "todo"`
- `DOING_PROCESS_STAGE = "doing"`
- `DONE_PROCESS_STAGE = "done"`
- `BLOCKED_PROCESS_STAGE = "blocked"`

**Card Statuses:**

- `CARD_STATUS_TODO = "todo"`
- `CARD_STATUS_DOING = "doing"`
- `CARD_STATUS_DONE = "done"`
- `CARD_STATUS_BLOCKED = "blocked"`

**Activity Types:**

- `ACTIVITY_TYPE_CARD_CREATED = "card_created"`
- `ACTIVITY_TYPE_CARD_CLONED = "card_cloned"`
- `ACTIVITY_TYPE_CARD_COLUMN_CHANGED = "card_column_changed"`
- `ACTIVITY_TYPE_CARD_COMMENT_ADDED = "card_comment_added"`
- `ACTIVITY_TYPE_CARD_STATUS_CHANGED = "card_status_changed"`
- `ACTIVITY_TYPE_CARD_RESULT_CHANGED = "card_result_changed"`

### 3. `__init__.py`

Package initialization file that exports the main components:

```python
from agent.kaiban_integration import KaibanClient, WeatherController
```

## Integration Flow

```
Kaiban Platform
    ↓
A2A Protocol (JSON-RPC 2.0)
    ↓
WeatherAgentExecutor (executor.py)
    ↓
WeatherController.process_activity()
    ↓
WeatherAgent.process() (weather_agent.py)
    ↓
WeatherController.format_weather_response()
    ↓
KaibanClient.update_card() + create_batch_activities()
    ↓
Kaiban Platform (Card updated with result)
```

## Usage Example

```python
from agent.kaiban_integration import WeatherController

# Process a Kaiban activity
activity = {
    "type": "card_created",
    "card_id": "card-123",
    "board_id": "board-456",
    "team_id": "team-789",
    "actor": {"id": "user-1", "type": "user", "name": "John"}
}

controller = await WeatherController.build(
    tenant="agi",
    thread_id="thread-abc",
    card_id="card-123"
)

await controller.process_activity(activity)
```

## Creating Cards in Kaiban

To create a card in Kaiban that will be processed by the Weather Agent, you must follow a specific format in the card's description field.

### Card Description Format

When creating a card in the Kaiban board assigned to the Weather Agent, write the following in the **description** field:

```
weather in {city_name}
```

**Examples:**

- `weather in Paris`
- `weather in New York`
- `weather in Tokyo`
- `weather in London`

### How It Works

1. **Create a card** in the Kaiban board assigned to the Weather Agent
2. **Set the description** to `weather in {city_name}` (replace `{city_name}` with the actual city name)
3. The agent will automatically:
   - Detect the card creation activity
   - Extract the city name from the description
   - Fetch weather data for that city
   - Update the card with the weather forecast and activity recommendations
   - Move the card through the workflow stages (todo → doing → done)

### Alternative: Using Comments

You can also trigger the weather agent by adding a comment to an existing card with the same format:

```
weather in {city_name}
```

The agent will process the comment and update the card with the weather information.

## Error Handling

The controller implements comprehensive error handling:

1. **Card Not Found**: If card doesn't exist, controller creation fails gracefully
2. **Weather Agent Errors**: Exceptions during weather agent execution move card to `blocked` status
3. **API Errors**: HTTP errors from Kaiban API are propagated with proper error messages

## Dependencies

- `requests`: HTTP client library
- `python-dotenv`: Environment variable management
- `agent.weather_agent`: Weather agent implementation

## Configuration

All configuration is done through environment variables. The project includes a `.env.example` file with all required variables.

### Setup Steps

1. **Copy the example file:**

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual values:**
   ```bash
   # Edit .env file with your credentials
   nano .env  # or use your preferred editor
   ```

### Environment Variables

**Kaiban Configuration:**

- `KAIBAN_TENANT`: Your Kaiban tenant name (default: `"agi"`)
- `KAIBAN_SHARED_TOKEN`: Your Kaiban shared token for API authentication
- `KAIBAN_API_URL`: Base URL for Kaiban API (default: `https://{tenant}-dev.kaiban.io/api`)
  - Note: The `{tenant}` placeholder will be automatically replaced with the `KAIBAN_TENANT` value

**A2A Server Configuration:**

- `A2A_BASE_URL`: **IMPORTANT** - Base URL where the A2A server is accessible (default: `http://localhost:3000`)
  - This URL is used in the AgentCard and must be publicly accessible for Kaiban to communicate with your agent
  - **For local development**: It's highly recommended to use a tunnel service like [ngrok](https://ngrok.com/) to expose your local server
    - Install ngrok: `brew install ngrok` (macOS) or download from [ngrok.com](https://ngrok.com/download)
    - Start your A2A server: `python main.py`
    - In another terminal, create tunnel: `ngrok http 3000`
    - Copy the HTTPS URL (e.g., `https://a9e797ba2247.ngrok-free.app`) and set it as `A2A_BASE_URL`
    - Example: `A2A_BASE_URL=https://a9e797ba2247.ngrok-free.app`
  - **For production**: Use your deployed service URL
  - **Why it matters**: Kaiban needs to reach your agent's endpoints (`/a2a` and `/a2a/.well-known/agent-card.json`). If this URL is incorrect or unreachable, Kaiban cannot communicate with your agent.
- `PORT`: Port for the A2A server (default: `3000`)
- `HOST`: Host address for the server (default: `0.0.0.0`)

**OpenAI Configuration:**

- `OPENAI_API_KEY`: Your OpenAI API key (required for weather agent functionality)

### Example `.env` file:

```env
# Kaiban Configuration
KAIBAN_TENANT=agi
KAIBAN_SHARED_TOKEN=your_kaiban_shared_token_here
KAIBAN_API_URL=https://{tenant}-dev.kaiban.io/api

# A2A Server Configuration
A2A_BASE_URL=http://localhost:3000
PORT=3000
HOST=0.0.0.0

# OpenAI Configuration (required for weather agent)
OPENAI_API_KEY=your_openai_api_key_here
```

### Getting Your Credentials

**Kaiban:**

- Contact your Kaiban administrator to obtain:
  - Tenant name
  - Shared token
  - API URL (if different from default)

**OpenAI:**

- Sign up at [OpenAI](https://platform.openai.com/)
- Generate an API key from the API keys section
- Add billing information if required

**A2A Base URL:**

- **Critical for Kaiban Integration**: This URL must be publicly accessible. Kaiban cannot reach `localhost` URLs.
- **Recommended for local development**: Use ngrok or similar tunnel service:
  1. Install ngrok: `brew install ngrok` (macOS) or download from [ngrok.com](https://ngrok.com/download)
  2. Start your A2A server: `python main.py` (runs on port 3000 by default)
  3. In a separate terminal, create tunnel: `ngrok http 3000`
  4. Copy the HTTPS forwarding URL (e.g., `https://a9e797ba2247.ngrok-free.app`)
  5. Set in `.env`: `A2A_BASE_URL=https://a9e797ba2247.ngrok-free.app`
  6. Restart your A2A server to load the new configuration
  7. Create the agent in Kaiban with the configuration below
- **Alternative tunnel services**: Cloudflare Tunnel, localtunnel, serveo, etc.
- **For production**: Use your deployed service URL (e.g., Cloud Run, AWS, etc.)

## Creating the Agent in Kaiban

After setting up your A2A server and obtaining the ngrok URL, you need to create an A2A agent in Kaiban with the following configuration.

### Step 1: Get Your ngrok URL

1. Start your A2A server: `python main.py`
2. In a separate terminal, run: `ngrok http 3000`
3. Copy the HTTPS forwarding URL (e.g., `https://a9e797ba2247.ngrok-free.app`)
4. Set this URL in your `.env` file as `A2A_BASE_URL`

### Step 2: Create the Agent in Kaiban

When creating the A2A agent in Kaiban, use the following configuration:

```json
{
  "url": "{A2A_BASE_URL}/a2a",
  "cardUrl": "{A2A_BASE_URL}/a2a/.well-known/agent-card.json"
}
```

**Example with ngrok URL:**

```json
{
  "url": "https://a9e797ba2247.ngrok-free.app/a2a",
  "cardUrl": "https://a9e797ba2247.ngrok-free.app/a2a/.well-known/agent-card.json"
}
```

**Where:**

- `url`: The A2A JSON-RPC endpoint where Kaiban will send task requests
- `cardUrl`: The endpoint where Kaiban can fetch the agent's metadata (AgentCard)

**Important Notes:**

- Replace `{A2A_BASE_URL}` with the actual ngrok URL from your `.env` file
- Both URLs must be publicly accessible (ngrok provides this)
- The `cardUrl` must return a valid AgentCard JSON when accessed
- The `url` must accept POST requests with JSON-RPC 2.0 format
- If you restart ngrok, you'll get a new URL and need to update both the `.env` file and the agent configuration in Kaiban

### Step 3: Assign the Agent to a Board

After creating the agent, assign it to the board where you want it to process cards. The agent will automatically process cards created in that board when they match the expected format.

## Testing

To test the integration:

```python
from agent.kaiban_integration import KaibanClient, WeatherController

# Test client
client = KaibanClient(tenant="agi")
card = client.get_card("card-id")
print(card)

# Test controller
controller = await WeatherController.build(
    tenant="agi",
    thread_id="test-thread",
    card_id="card-id"
)
```

## Notes

- The package follows the same patterns as the TypeScript `@kaiban/sdk` and `kaiban-controller.ts`
- All API endpoints use the `/v1` prefix automatically
- Card updates use `PUT` method (not `PATCH`)
- Batch activities use `PUT /v1/card/{id}/activities` with `card_updates` and `activities` fields
- All endpoints use singular form: `card/{id}`, `board/{id}`, `agent/{id}`
