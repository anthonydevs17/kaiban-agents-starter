import os

# A2A SDK imports
from a2a.server.apps import A2AFastAPIApplication
from a2a.server.tasks import (
    InMemoryPushNotificationConfigStore,
    InMemoryTaskStore,
)
from a2a.server.request_handlers import DefaultRequestHandler
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.a2a_integration.card import weather_agent_card
from agent.a2a_integration.executor import weather_agent_executor

load_dotenv()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application with A2A server"""
    # Create FastAPI application
    app = FastAPI(title="Weather Agent A2A Server")

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Create SDK stores
    from a2a.server.events import InMemoryQueueManager
    
    task_store = InMemoryTaskStore()
    queue_manager = InMemoryQueueManager()
    push_config_store = InMemoryPushNotificationConfigStore()

    # Create request handler using the official SDK
    request_handler = DefaultRequestHandler(
        agent_executor=weather_agent_executor,
        task_store=task_store,
        queue_manager=queue_manager,
        push_config_store=push_config_store,
    )

    # Create A2A application using the official SDK
    a2a_app = A2AFastAPIApplication(
        agent_card=weather_agent_card,
        http_handler=request_handler,  # type: ignore
    )

    # Add A2A routes to the FastAPI application
    # This adds the agent card endpoint and RPC endpoint under /a2a
    a2a_app.add_routes_to_app(
        app=app,
        agent_card_url="/a2a/.well-known/agent-card.json",
        rpc_url="/a2a",
    )

    @app.get("/health")
    async def health_check():
        """Health check endpoint"""
        return {"status": "healthy", "service": "weather-agent-a2a"}

    return app

