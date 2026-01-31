import json
import logging
from typing import Dict, Any, Optional
from agent.kaiban_integration.client import KaibanClient
from agent.weather_agent import WeatherAgent

# Configure logger (similar to uvicorn format)
logger = logging.getLogger("weather_agent.controller")
logger.setLevel(logging.INFO)

# Constants (same as in TypeScript)
TODO_PROCESS_STAGE = "todo"
DOING_PROCESS_STAGE = "doing"
DONE_PROCESS_STAGE = "done"
BLOCKED_PROCESS_STAGE = "blocked"

CARD_STATUS_TODO = "todo"
CARD_STATUS_DOING = "doing"
CARD_STATUS_DONE = "done"
CARD_STATUS_BLOCKED = "blocked"

ACTIVITY_TYPE_CARD_CREATED = "card_created"
ACTIVITY_TYPE_CARD_CLONED = "card_cloned"
ACTIVITY_TYPE_CARD_COLUMN_CHANGED = "card_column_changed"
ACTIVITY_TYPE_CARD_COMMENT_ADDED = "card_comment_added"
ACTIVITY_TYPE_CARD_STATUS_CHANGED = "card_status_changed"
ACTIVITY_TYPE_CARD_RESULT_CHANGED = "card_result_changed"


class WeatherController:
    """Controller to handle Kaiban activities (similar to kaiban-controller.ts)"""
    
    def __init__(
        self,
        tenant: str,
        thread_id: str,
        card: Dict[str, Any],
        board: Dict[str, Any],
        agent: Dict[str, Any],
        kaiban_sdk: KaibanClient
    ):
        self.tenant = tenant
        self.thread_id = thread_id
        self.card = card
        self.board = board
        self.agent = agent
        self.kaiban_sdk = kaiban_sdk
        
        self.kaiban_actor = {
            "id": agent["id"],
            "type": "system",
            "name": agent["name"]
        }
        self.user_actor = {
            "id": "anonymous",
            "type": "user",
            "name": "Anonymous"
        }
    
    @classmethod
    async def build(
        cls,
        tenant: str,
        thread_id: str,
        card_id: str,
        user_id: str = "anonymous"
    ) -> "WeatherController":
        """Factory method to create the controller"""
        logger.info(f"Building controller card_id={card_id} thread_id={thread_id} tenant={tenant}")
        kaiban_sdk = KaibanClient(tenant=tenant)
        
        logger.info(f"Fetching card card_id={card_id}")
        card = kaiban_sdk.get_card(card_id)
        logger.info(f"Card fetched board_id={card.get('board_id')} status={card.get('status')} card_id={card_id}")
        
        logger.info(f"Fetching board board_id={card['board_id']}")
        board = kaiban_sdk.get_board(card["board_id"])
        logger.info(f"Board fetched board_id={card['board_id']}")
        
        logger.info(f"Fetching agent agent_id={card['agent_id']}")
        agent = kaiban_sdk.get_agent(card["agent_id"])
        logger.info(f"Agent fetched agent_id={card['agent_id']} name={agent.get('name')}")
        
        logger.info(f"Controller built successfully card_id={card_id}")
        return cls(
            tenant=tenant,
            thread_id=thread_id,
            card=card,
            board=board,
            agent=agent,
            kaiban_sdk=kaiban_sdk
        )
    
    def get_column_key_for_stage(self, stage: str) -> Optional[str]:
        """Gets the column_key for a given stage"""
        for column in self.board.get("columns", []):
            if column.get("process_stage") == stage:
                return column.get("column_key")
        return None
    
    async def process_activity(self, activity: Dict[str, Any]) -> None:
        """Processes a Kaiban activity"""
        activity_type = activity.get("type")
        card_id = activity.get("card_id", self.card.get("id", "unknown"))
        
        logger.info(f"Processing activity card_id={card_id} activity_type={activity_type}")
        
        if activity_type in [
            ACTIVITY_TYPE_CARD_CREATED,
            ACTIVITY_TYPE_CARD_CLONED,
            ACTIVITY_TYPE_CARD_COLUMN_CHANGED
        ]:
            column_key = self.get_column_key_for_stage(TODO_PROCESS_STAGE)
            actor = activity.get("actor", {})
            
            logger.info(f"Activity type requires processing card_id={card_id} current_column={self.card.get('column_key')} target_column={column_key}")
            
            if (
                self.card.get("column_key") == column_key and
                not (actor.get("id") == self.kaiban_actor["id"] and
                     actor.get("type") == self.kaiban_actor["type"])
            ):
                logger.info(f"Triggering weather agent execution card_id={card_id} activity_type={activity_type}")
                await self.process_weather_agent_execution(activity)
            else:
                logger.info(f"Skipping execution - card not in todo column or actor is agent card_id={card_id}")
        
        elif activity_type == ACTIVITY_TYPE_CARD_COMMENT_ADDED:
            logger.info(f"Comment added, triggering weather agent execution card_id={card_id}")
            await self.process_weather_agent_execution(
                activity,
                user_input=activity.get("description")
            )
        else:
            logger.debug(f"Activity type not handled, skipping card_id={card_id} activity_type={activity_type}")
    
    async def process_weather_agent_execution(
        self,
        activity: Dict[str, Any],
        user_input: Optional[str] = None
    ) -> None:
        """Executes the weather agent and updates the card"""
        card_id = activity["card_id"]
        logger.info(f"Starting weather agent execution card_id={card_id} user_input={'provided' if user_input else 'from_card'}")
        
        # Update to DOING
        doing_column = self.get_column_key_for_stage(DOING_PROCESS_STAGE)
        logger.info(f"Moving card to doing status card_id={card_id} column={doing_column}")
        self.kaiban_sdk.update_card(card_id, {
            "status": CARD_STATUS_DOING,
            "column_key": doing_column
        })
        logger.info(f"Card updated to doing card_id={card_id}")
        
        # Create activities
        logger.info(f"Creating batch activities card_id={card_id} count=2")
        self.kaiban_sdk.create_batch_activities(card_id, [
            {
                "type": ACTIVITY_TYPE_CARD_STATUS_CHANGED,
                "description": "Card status changed to doing",
                "board_id": activity["board_id"],
                "team_id": activity["team_id"],
                "actor": self.kaiban_actor,
                "changes": [
                    {
                        "field": "status",
                        "new_value": CARD_STATUS_DOING,
                        "old_value": CARD_STATUS_TODO
                    }
                ]
            },
            {
                "type": ACTIVITY_TYPE_CARD_COLUMN_CHANGED,
                "description": "Card moved to doing column",
                "board_id": activity["board_id"],
                "team_id": activity["team_id"],
                "actor": self.kaiban_actor,
                "changes": [
                    {
                        "field": "column_key",
                        "new_value": doing_column,
                        "old_value": self.get_column_key_for_stage(TODO_PROCESS_STAGE)
                    }
                ]
            }
        ])
        logger.info(f"Batch activities created card_id={card_id}")
        
        try:
            # Execute weather agent
            input_text = user_input or self.card.get("description", "")
            logger.info(f"Executing weather agent card_id={card_id} input_length={len(input_text)}")
            agent = WeatherAgent(use_real_weather=True)
            response = agent.process(input_text)
            logger.info(f"Weather agent executed successfully card_id={card_id} response_length={len(response)}")
            
            # Format response
            formatted_output = self.format_weather_response(response)
            logger.info(f"Response formatted card_id={card_id} formatted_length={len(formatted_output)}")
            
            # Update card with result
            done_column = self.get_column_key_for_stage(DONE_PROCESS_STAGE)
            logger.info(f"Moving card to done status card_id={card_id} column={done_column}")
            self.kaiban_sdk.update_card(card_id, {
                "result": formatted_output,
                "column_key": done_column,
                "status": CARD_STATUS_DONE
            })
            logger.info(f"Card updated to done card_id={card_id}")
            
            # Create completion activities
            logger.info(f"Creating completion activities card_id={card_id} count=3")
            self.kaiban_sdk.create_batch_activities(card_id, [
                {
                    "type": ACTIVITY_TYPE_CARD_RESULT_CHANGED,
                    "description": "Weather information retrieved",
                    "board_id": activity["board_id"],
                    "team_id": activity["team_id"],
                    "actor": self.kaiban_actor,
                    "changes": [
                        {
                            "field": "result",
                            "new_value": formatted_output,
                            "old_value": self.card.get("result")
                        }
                    ]
                },
                {
                    "type": ACTIVITY_TYPE_CARD_COLUMN_CHANGED,
                    "description": "Card moved to done column",
                    "board_id": activity["board_id"],
                    "team_id": activity["team_id"],
                    "actor": self.kaiban_actor,
                    "changes": [
                        {
                            "field": "column_key",
                            "new_value": done_column,
                            "old_value": doing_column
                        }
                    ]
                },
                {
                    "type": ACTIVITY_TYPE_CARD_STATUS_CHANGED,
                    "description": "Card status changed to done",
                    "board_id": activity["board_id"],
                    "team_id": activity["team_id"],
                    "actor": self.kaiban_actor,
                    "changes": [
                        {
                            "field": "status",
                            "new_value": CARD_STATUS_DONE,
                            "old_value": CARD_STATUS_DOING
                        }
                    ]
                }
            ])
            logger.info(f"Completion activities created card_id={card_id}")
            logger.info(f"Weather agent execution completed successfully card_id={card_id}")
        
        except Exception as e:
            logger.error(f"Error executing weather agent card_id={card_id} error={str(e)}", exc_info=True)
            
            # Update to BLOCKED
            blocked_column = self.get_column_key_for_stage(BLOCKED_PROCESS_STAGE)
            logger.warning(f"Moving card to blocked status card_id={card_id} column={blocked_column}")
            self.kaiban_sdk.update_card(card_id, {
                "column_key": blocked_column,
                "status": CARD_STATUS_BLOCKED
            })
            logger.info(f"Card updated to blocked card_id={card_id}")
            
            logger.info(f"Creating error activities card_id={card_id} count=2")
            self.kaiban_sdk.create_batch_activities(card_id, [
                {
                    "type": ACTIVITY_TYPE_CARD_COLUMN_CHANGED,
                    "description": "Card moved to blocked column",
                    "board_id": activity["board_id"],
                    "team_id": activity["team_id"],
                    "actor": self.kaiban_actor,
                    "changes": [
                        {
                            "field": "column_key",
                            "new_value": blocked_column,
                            "old_value": doing_column
                        }
                    ]
                },
                {
                    "type": ACTIVITY_TYPE_CARD_STATUS_CHANGED,
                    "description": "Card status changed to blocked",
                    "board_id": activity["board_id"],
                    "team_id": activity["team_id"],
                    "actor": self.kaiban_actor,
                    "changes": [
                        {
                            "field": "status",
                            "new_value": CARD_STATUS_BLOCKED,
                            "old_value": CARD_STATUS_DOING
                        }
                    ]
                }
            ])
            logger.info(f"Error activities created card_id={card_id}")
    
    def format_weather_response(self, response: str) -> str:
        """Formats the weather agent response for Kaiban"""
        logger.debug(f"Formatting weather response response_length={len(response)}")
        try:
            data = json.loads(response)
            logger.debug(f"Response parsed successfully city={data.get('city', 'unknown')}")
            
            city = data.get("city", "Unknown")
            weather = data.get("weather", {})
            activities = data.get("recommended_activities", [])
            
            formatted = f"# Weather in {city}\n\n"
            formatted += f"**Conditions:** {weather.get('description', 'N/A')}\n"
            formatted += f"**Temperature:** {weather.get('temperature', 'N/A')}°{weather.get('unit', 'C')}\n\n"
            formatted += "## Recommended Activities\n\n"
            
            for i, activity in enumerate(activities, 1):
                formatted += f"{i}. {activity}\n"
            
            logger.debug(f"Response formatted successfully city={data.get('city', 'unknown')}")
            return formatted
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse JSON response, returning raw response response_length={len(response)}")
            return response

