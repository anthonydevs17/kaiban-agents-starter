import logging
import os

# A2A SDK imports
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import DataPart, TaskState, TaskStatus, TaskStatusUpdateEvent
from dotenv import load_dotenv

from agent.kaiban_integration.controller import WeatherController

load_dotenv()

# Configure logger (similar to uvicorn format)
logger = logging.getLogger("weather_agent.executor")
logger.setLevel(logging.INFO)

TENANT = os.getenv("KAIBAN_TENANT", "agi")
A2A_DATA_PART_TYPE_KAIBAN_ACTIVITY = "kaiban_activity"


class WeatherAgentExecutor(AgentExecutor):
    """Executor for the Weather Agent using the official A2A SDK"""

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Execute an A2A task - expects message with DataPart containing kaiban_activity"""
        task_id = context.task_id or ""
        context_id = context.context_id or task_id
        user_message = context.message

        logger.info(f"Executing task task_id={task_id} context_id={context_id}")

        # Publish created task status
        submitted_event = TaskStatusUpdateEvent(
            task_id=task_id,
            context_id=context_id,
            kind="status-update",
            status=TaskStatus(
                state=TaskState.submitted,
            ),
            final=False,
        )
        await event_queue.enqueue_event(submitted_event)
        logger.info(f"Task submitted task_id={task_id}")

        # Process only DataParts with kaiban_activity type
        if user_message and user_message.parts:
            # Filter only data parts
            data_parts = [
                part.root
                for part in user_message.parts
                if isinstance(part.root, DataPart)
            ]
            logger.info(
                f"Found {len(data_parts)} data parts in message task_id={task_id}"
            )

            # Process each kaiban_activity DataPart
            for data_part in data_parts:
                data = data_part.data

                # Only process kaiban_activity type
                if (
                    isinstance(data, dict)
                    and data.get("type") == A2A_DATA_PART_TYPE_KAIBAN_ACTIVITY
                ):
                    activity = data.get("activity")

                    if not isinstance(activity, dict):
                        logger.warning(
                            f"Activity is not a dict, skipping task_id={task_id}"
                        )
                        continue

                    card_id = activity.get("card_id")

                    if not card_id:
                        logger.warning(
                            f"No card_id in activity, skipping task_id={task_id}"
                        )
                        continue

                    logger.info(
                        f"Processing Kaiban activity card_id={card_id} activity_type={activity.get('type')} task_id={task_id}"
                    )

                    # Create controller and process activity
                    controller = await WeatherController.build(
                        tenant=TENANT,
                        thread_id=context_id,
                        card_id=card_id,
                        user_id="anonymous",
                    )
                    logger.info(
                        f"Controller built for card_id={card_id} task_id={task_id}"
                    )

                    await controller.process_activity(activity)
                    logger.info(
                        f"Activity processed successfully card_id={card_id} task_id={task_id}"
                    )
                else:
                    logger.debug(
                        f"Skipping non-kaiban_activity data part task_id={task_id}"
                    )
        else:
            logger.warning(f"No message or parts in request task_id={task_id}")

        # Publish completed status
        completed_event = TaskStatusUpdateEvent(
            task_id=task_id,
            context_id=context_id,
            kind="status-update",
            status=TaskStatus(
                state=TaskState.completed,
            ),
            final=True,
        )
        await event_queue.enqueue_event(completed_event)
        logger.info(f"Task completed task_id={task_id}")

    async def cancel(self, task_id: str, event_queue: EventQueue) -> None:
        """Cancel a task (not implemented)"""
        raise NotImplementedError("Task cancellation not implemented")


# Executor instance
weather_agent_executor = WeatherAgentExecutor()
