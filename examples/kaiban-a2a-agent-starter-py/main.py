#!/usr/bin/env python3
"""
Main entry point for the Weather Agent A2A Server
"""

import logging
import os

import uvicorn
from dotenv import load_dotenv

from agent.a2a_integration.server import create_app

load_dotenv()

# Configure logging (similar to uvicorn format)
logging.basicConfig(
    level=logging.INFO, format="%(levelname)s:     %(name)s: %(message)s"
)


def main():
    """Main function to start the A2A server"""
    app = create_app()
    port = int(os.getenv("PORT", 3000))
    host = os.getenv("HOST", "0.0.0.0")

    print(f"Starting Weather Agent A2A Server on {host}:{port}")
    print(f"A2A endpoint: http://{host}:{port}/a2a")
    print(f"Health check: http://{host}:{port}/health")

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
