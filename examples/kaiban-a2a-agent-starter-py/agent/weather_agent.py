import json
import os
import time
from typing import Annotated, Any, Dict, List, Optional, TypedDict

import requests
from dotenv import load_dotenv
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langgraph.graph import END, StateGraph

# Load environment variables
load_dotenv()


# Define the state for our graph
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], lambda x, y: x + y]
    city: Optional[str]
    weather_data: Optional[Dict[str, Any]]
    recommended_activities: Optional[List[str]]


class WeatherAgent:
    def __init__(self, use_real_weather: bool = False):
        """Initialize the WeatherAgent.

        Args:
            use_real_weather: If True, fetches real weather data from Open-Meteo.
                           If False, uses mock weather data.
        """
        # Load environment variables from .env file
        load_dotenv()

        # Get API keys from environment variables
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.use_real_weather = use_real_weather

        # Open-Meteo doesn't require API key, so we don't check for it
        if not self.openai_api_key:
            print("Warning: OPENAI_API_KEY not set. Some features may be limited.")
        else:
            os.environ["OPENAI_API_KEY"] = self.openai_api_key

        # Initialize the graph
        self.workflow = StateGraph(AgentState)

        # Define the nodes
        self.workflow.add_node("receive_input", self.receive_input)
        self.workflow.add_node("get_weather", self.get_weather)
        self.workflow.add_node("recommend_activities", self.recommend_activities)
        self.workflow.add_node("format_response", self.format_response)

        # Define the edges
        self.workflow.add_edge("receive_input", "get_weather")
        self.workflow.add_edge("get_weather", "recommend_activities")
        self.workflow.add_edge("recommend_activities", "format_response")
        self.workflow.add_edge("format_response", END)

        # Set the entry point
        self.workflow.set_entry_point("receive_input")

        # Compile the graph
        self.app = self.workflow.compile()

    def receive_input(self, state: AgentState) -> AgentState:
        """Process the initial input from the user."""
        # Get the last message (user input)
        last_message = state["messages"][-1]

        # Default city
        city = "New York"

        if isinstance(last_message, HumanMessage):
            # Ensure content is a string
            message_content = last_message.content
            if isinstance(message_content, str):
                content = message_content.lower()

                # Look for patterns like "weather in London" or "what's the weather in Paris"
                if "weather in" in content:
                    # Get everything after "weather in"
                    parts = content.split("weather in")
                    if len(parts) > 1:
                        # Take the first word after "weather in" as the city
                        city = parts[1].strip().split()[0]
                # If no city found, use the default
                if not city:
                    city = "New York"

        return {
            "messages": state["messages"],
            "city": city,
            "weather_data": state.get("weather_data"),
            "recommended_activities": state.get("recommended_activities"),
        }

    def _get_mock_weather(self, city: str) -> dict:
        """Generate mock weather data for testing."""
        import random
        from datetime import datetime

        # Different weather conditions to cycle through
        conditions = [
            {"main": "Clear", "description": "clear sky"},
            {"main": "Clouds", "description": "few clouds"},
            {"main": "Rain", "description": "light rain"},
            {"main": "Thunderstorm", "description": "thunderstorm with light rain"},
            {"main": "Snow", "description": "light snow"},
        ]

        # Get a consistent condition based on city name
        condition = conditions[hash(city) % len(conditions)]

        # Generate temperature based on condition
        if condition["main"] == "Snow":
            temp = random.uniform(-5, 2)  # Cold for snow
        elif condition["main"] == "Rain" or condition["main"] == "Thunderstorm":
            temp = random.uniform(5, 15)  # Mild for rain
        elif condition["main"] == "Clear":
            temp = random.uniform(18, 32)  # Warm for clear skies
        else:  # Clouds
            temp = random.uniform(10, 25)  # Moderate for clouds

        return {
            "weather": [condition],
            "main": {
                "temp": round(temp, 1),
                "feels_like": round(temp + random.uniform(-2, 2), 1),
                "temp_min": round(temp - random.uniform(0, 5), 1),
                "temp_max": round(temp + random.uniform(0, 5), 1),
                "pressure": random.randint(980, 1030),
                "humidity": random.randint(30, 90),
            },
            "visibility": random.randint(5000, 10000),
            "dt": int(datetime.now().timestamp()),
            "timezone": 0,
            "id": 0,
            "name": city,
            "cod": 200,
        }

    def _get_city_coordinates(self, city: str) -> tuple:
        """Get latitude and longitude for a city using Open-Meteo geocoding."""
        try:
            # Open-Meteo geocoding API (free, no API key required)
            geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
            params = {"name": city, "count": 1, "language": "en", "format": "json"}
            response = requests.get(geocoding_url, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                if data.get("results") and len(data["results"]) > 0:
                    result = data["results"][0]
                    return (result["latitude"], result["longitude"])

            raise ValueError(f"City '{city}' not found")
        except Exception as e:
            raise ValueError(f"Error getting coordinates for '{city}': {str(e)}")

    def get_weather(self, state: AgentState) -> AgentState:
        """Fetch weather data for the given city."""
        city = state["city"]
        if not city:
            raise ValueError("No city provided for weather lookup")

        formatted_city = city.strip()

        if self.use_real_weather:
            try:
                # Get city coordinates
                lat, lon = self._get_city_coordinates(formatted_city)

                # Open-Meteo weather API (free, no API key required)
                weather_url = "https://api.open-meteo.com/v1/forecast"
                params = {
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weather_code",
                    "timezone": "auto",
                }

                response = requests.get(weather_url, params=params, timeout=10)

                if response.status_code != 200:
                    raise ValueError(
                        f"Error fetching weather data: HTTP {response.status_code}"
                    )

                data = response.json()
                current = data.get("current", {})

                # Map Open-Meteo weather codes to descriptions
                weather_codes = {
                    0: "clear sky",
                    1: "mainly clear",
                    2: "partly cloudy",
                    3: "overcast",
                    45: "fog",
                    48: "depositing rime fog",
                    51: "light drizzle",
                    53: "moderate drizzle",
                    55: "dense drizzle",
                    56: "light freezing drizzle",
                    57: "dense freezing drizzle",
                    61: "slight rain",
                    63: "moderate rain",
                    65: "heavy rain",
                    66: "light freezing rain",
                    67: "heavy freezing rain",
                    71: "slight snow fall",
                    73: "moderate snow fall",
                    75: "heavy snow fall",
                    77: "snow grains",
                    80: "slight rain showers",
                    81: "moderate rain showers",
                    82: "violent rain showers",
                    85: "slight snow showers",
                    86: "heavy snow showers",
                    95: "thunderstorm",
                    96: "thunderstorm with slight hail",
                    99: "thunderstorm with heavy hail",
                }

                weather_code = current.get("weather_code", 0)
                weather_desc = weather_codes.get(weather_code, "unknown")
                temp = current.get("temperature_2m", 0)

                # Format response to match expected structure
                weather_data = {
                    "weather": [{"main": "Current", "description": weather_desc}],
                    "main": {
                        "temp": round(temp, 1),
                        "feels_like": round(temp, 1),
                        "temp_min": round(temp - 2, 1),
                        "temp_max": round(temp + 2, 1),
                        "pressure": 1013,
                        "humidity": 60,
                    },
                    "visibility": 10000,
                    "dt": int(time.time()),
                    "timezone": 0,
                    "id": 0,
                    "name": formatted_city,
                    "cod": 200,
                }

            except Exception as e:
                error_msg = (
                    f"Error fetching weather data for '{formatted_city}': {str(e)}"
                )
                raise ValueError(error_msg)
        else:
            # Use mock data
            print(f"Using mock weather data for {city} (real weather is disabled)")
            weather_data = self._get_mock_weather(city)

        return {
            "messages": state["messages"],
            "city": city,
            "weather_data": weather_data,
            "recommended_activities": state.get("recommended_activities"),
        }

    def recommend_activities(self, state: AgentState) -> AgentState:
        """Generate personalized activity recommendations using OpenAI's GPT-4 based on weather data."""
        if not state["weather_data"]:
            raise ValueError("No weather data available")

        weather_desc = state["weather_data"]["weather"][0]["description"]
        temp = state["weather_data"]["main"]["temp"]
        city = state["city"]

        try:
            from openai import OpenAI

            client = OpenAI(api_key=self.openai_api_key)

            # Create a prompt for the AI
            prompt = f"""
            Based on the following weather information for {city}, suggest 3-5 specific and personalized activities.
            Be creative and consider the time of day and weather conditions.
            
            Weather in {city}:
            - Description: {weather_desc}
            - Temperature: {temp}°C
            
            Provide the activities as a JSON array of strings. Only return the JSON array, nothing else.
            Example: ["Activity 1", "Activity 2", "Activity 3"]
            """

            # Call OpenAI API
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful travel assistant that suggests activities based on weather conditions.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=200,
            )

            # Extract and parse the response
            message_content = response.choices[0].message.content
            if not message_content:
                raise ValueError("Empty response from OpenAI API")
            content = message_content.strip()

            # Handle cases where the response might be wrapped in markdown code blocks
            if content.startswith("```json"):
                content = content[content.find("[") : content.rfind("]") + 1]
            elif content.startswith("```"):
                content = content[content.find("[") : content.rfind("]") + 1]

            activities = json.loads(content)

            if not isinstance(activities, list) or not all(
                isinstance(x, str) for x in activities
            ):
                raise ValueError("Unexpected response format from AI")

        except Exception as e:
            print(
                f"Warning: Failed to get AI recommendations. Falling back to default activities. Error: {str(e)}"
            )
            # Fallback to default activities if API call fails
            activities = self._get_default_activities(weather_desc, temp)

        return {
            "messages": state["messages"],
            "city": city,
            "weather_data": state["weather_data"],
            "recommended_activities": activities,
        }

    def _get_default_activities(self, weather_desc: str, temp: float) -> List[str]:
        """Provide default activity recommendations if AI call fails."""
        if "rain" in weather_desc.lower():
            return [
                "Visit a museum",
                "Explore a local cafe",
                "Check out an indoor market",
            ]
        elif temp > 25:
            return [
                "Go to the beach",
                "Have a picnic in the park",
                "Try outdoor swimming",
            ]
        elif temp > 15:
            return [
                "Go for a scenic hike",
                "Visit a botanical garden",
                "Explore local markets",
            ]
        else:
            return ["Visit a museum", "Enjoy a hot drink at a cozy cafe", "See a movie"]

    def format_response(self, state: AgentState) -> AgentState:
        """Format the final response with weather and recommendations."""
        if not state["weather_data"] or not state["recommended_activities"]:
            raise ValueError("Incomplete data to format response")

        weather = state["weather_data"]["weather"][0]["description"]
        temp = state["weather_data"]["main"]["temp"]
        city = state["city"]

        response = f"Weather in {city}: {weather}, {temp}°C\n\n"
        response += "Recommended activities:\n"
        for i, activity in enumerate(state["recommended_activities"], 1):
            response += f"{i}. {activity}\n"

        # In a real implementation, we would use the a2a protocol to format this
        a2a_response = {
            "type": "weather_recommendation",
            "city": city,
            "weather": {"description": weather, "temperature": temp, "unit": "celsius"},
            "recommended_activities": state["recommended_activities"],
        }

        # Add the response to the message history
        messages = state["messages"] + [
            AIMessage(content=json.dumps(a2a_response, indent=2))
        ]

        return {
            "messages": messages,
            "city": city,
            "weather_data": state["weather_data"],
            "recommended_activities": state["recommended_activities"],
        }

    def process(self, input_message: str) -> str:
        """Process an input message and return the response."""
        # Initialize the state with the user's message
        initial_state: AgentState = {
            "messages": [HumanMessage(content=input_message)],
            "city": None,
            "weather_data": None,
            "recommended_activities": None,
        }

        # Run the graph
        result = self.app.invoke(initial_state)

        # Return the last message (the AI's response)
        last_message = result["messages"][-1]
        message_content = last_message.content
        if isinstance(message_content, str):
            return message_content
        return str(message_content)


# Example usage
if __name__ == "__main__":
    # Open-Meteo doesn't require API key - completely free!
    agent = WeatherAgent(use_real_weather=True)

    # Example usage
    print("Weather Agent is running. Type 'quit' to exit.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == "quit":
            break

        try:
            response = agent.process(user_input)
            print("\nAgent:", response, "\n")
        except Exception as e:
            print(f"Error: {str(e)}")
