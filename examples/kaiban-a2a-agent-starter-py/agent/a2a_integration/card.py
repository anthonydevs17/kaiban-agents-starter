import os
# A2A SDK imports
from a2a.types import AgentCard
from dotenv import load_dotenv

load_dotenv()

A2A_BASE_URL = os.getenv("A2A_BASE_URL", "http://localhost:5000")

weather_agent_card = AgentCard(
    name="Weather Agent",
    description="Agent that provides weather information and activity recommendations for cities",
    protocol_version="0.3.0",
    version="0.1.0",
    url=f"{A2A_BASE_URL}/a2a",
    default_input_modes=["text"],
    default_output_modes=["text"],
    skills=[
        {
            "id": "weather-forecast",
            "name": "Weather Forecast",
            "description": "Get current weather conditions for any city",
            "tags": ["weather", "forecast", "city", "activities"]
        }
    ],
    capabilities={
        "streaming": False,
        "pushNotifications": False,
        "stateTransitionHistory": False
    }
)

