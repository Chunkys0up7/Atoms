"""
Event Bus - Asynchronous Event Communication

Pub/sub system for decoupled communication between workflow components.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """Event type enum"""

    # Process lifecycle
    PROCESS_STARTED = "process.started"
    PROCESS_COMPLETED = "process.completed"
    PROCESS_FAILED = "process.failed"
    PROCESS_SUSPENDED = "process.suspended"
    PROCESS_RESUMED = "process.resumed"
    PROCESS_CANCELLED = "process.cancelled"

    # Task lifecycle
    TASK_CREATED = "task.created"
    TASK_ASSIGNED = "task.assigned"
    TASK_STARTED = "task.started"
    TASK_COMPLETED = "task.completed"
    TASK_FAILED = "task.failed"
    TASK_REASSIGNED = "task.reassigned"

    # SLA events
    SLA_AT_RISK = "sla.at_risk"
    SLA_BREACHED = "sla.breached"
    SLA_MET = "sla.met"

    # Assignment events
    ASSIGNMENT_NEEDED = "assignment.needed"
    WORKLOAD_IMBALANCE = "workload.imbalance"

    # Notifications
    NOTIFICATION_SEND = "notification.send"
    ESCALATION_TRIGGERED = "escalation.triggered"


class Event:
    """Event object"""

    def __init__(
        self, event_type: EventType, data: Dict[str, Any], source: str = "system", correlation_id: Optional[str] = None
    ):
        self.event_type = event_type
        self.data = data
        self.source = source
        self.correlation_id = correlation_id
        self.timestamp = datetime.now()
        self.event_id = f"{event_type.value}-{self.timestamp.timestamp()}"

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "data": self.data,
            "source": self.source,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp.isoformat(),
        }


EventHandler = Callable[[Event], None]


class EventBus:
    """
    Event bus for pub/sub messaging

    Features:
    - Subscribe to events by type
    - Publish events to all subscribers
    - Async event handling
    - Event filtering
    - Error isolation (one handler failure doesn't affect others)
    """

    _instance: Optional["EventBus"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EventBus, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._subscribers: Dict[EventType, List[EventHandler]] = defaultdict(list)
        self._wildcard_subscribers: List[EventHandler] = []
        self._event_history: List[Event] = []
        self._max_history = 1000
        self._initialized = True

        logger.info("EventBus initialized")

    def subscribe(self, event_type: EventType, handler: EventHandler):
        """
        Subscribe to an event type

        Args:
            event_type: Type of event to listen for
            handler: Callback function to handle event
        """
        self._subscribers[event_type].append(handler)
        logger.info(f"Subscribed to {event_type.value}: {handler.__name__}")

    def subscribe_all(self, handler: EventHandler):
        """
        Subscribe to all events (wildcard)

        Args:
            handler: Callback function to handle all events
        """
        self._wildcard_subscribers.append(handler)
        logger.info(f"Subscribed to all events: {handler.__name__}")

    def unsubscribe(self, event_type: EventType, handler: EventHandler):
        """
        Unsubscribe from an event type

        Args:
            event_type: Event type to unsubscribe from
            handler: Handler to remove
        """
        if handler in self._subscribers[event_type]:
            self._subscribers[event_type].remove(handler)
            logger.info(f"Unsubscribed from {event_type.value}: {handler.__name__}")

    def publish(
        self, event_type: EventType, data: Dict[str, Any], source: str = "system", correlation_id: Optional[str] = None
    ):
        """
        Publish an event

        Args:
            event_type: Type of event
            data: Event data
            source: Event source (user_id or 'system')
            correlation_id: Correlation ID for tracing
        """
        event = Event(event_type, data, source, correlation_id)

        # Add to history
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history.pop(0)

        logger.debug(f"Publishing event: {event_type.value} from {source}")

        # Notify specific subscribers
        handlers = self._subscribers.get(event_type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Error in event handler {handler.__name__}: {e}", exc_info=True)

        # Notify wildcard subscribers
        for handler in self._wildcard_subscribers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Error in wildcard handler {handler.__name__}: {e}", exc_info=True)

    async def publish_async(
        self, event_type: EventType, data: Dict[str, Any], source: str = "system", correlation_id: Optional[str] = None
    ):
        """
        Publish an event asynchronously

        Args:
            event_type: Type of event
            data: Event data
            source: Event source
            correlation_id: Correlation ID for tracing
        """
        event = Event(event_type, data, source, correlation_id)

        # Add to history
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history.pop(0)

        logger.debug(f"Publishing async event: {event_type.value} from {source}")

        # Notify specific subscribers
        handlers = self._subscribers.get(event_type, [])
        tasks = []

        for handler in handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    tasks.append(handler(event))
                else:
                    # Run sync handler in executor
                    loop = asyncio.get_event_loop()
                    tasks.append(loop.run_in_executor(None, handler, event))
            except Exception as e:
                logger.error(f"Error in event handler {handler.__name__}: {e}", exc_info=True)

        # Notify wildcard subscribers
        for handler in self._wildcard_subscribers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    tasks.append(handler(event))
                else:
                    loop = asyncio.get_event_loop()
                    tasks.append(loop.run_in_executor(None, handler, event))
            except Exception as e:
                logger.error(f"Error in wildcard handler {handler.__name__}: {e}", exc_info=True)

        # Wait for all handlers to complete
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def get_event_history(self, event_type: Optional[EventType] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent event history

        Args:
            event_type: Optional filter by event type
            limit: Maximum number of events to return

        Returns:
            List of events
        """
        events = self._event_history

        if event_type:
            events = [e for e in events if e.event_type == event_type]

        # Return most recent first
        events = list(reversed(events[-limit:]))

        return [e.to_dict() for e in events]

    def clear_history(self):
        """Clear event history"""
        self._event_history = []
        logger.info("Event history cleared")

    def get_subscriber_count(self, event_type: Optional[EventType] = None) -> int:
        """
        Get number of subscribers

        Args:
            event_type: Optional event type to check

        Returns:
            Number of subscribers
        """
        if event_type:
            return len(self._subscribers.get(event_type, []))
        else:
            total = sum(len(handlers) for handlers in self._subscribers.values())
            total += len(self._wildcard_subscribers)
            return total


# Singleton instance
_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Get singleton EventBus instance"""
    global _event_bus

    if _event_bus is None:
        _event_bus = EventBus()

    return _event_bus


# ============================================================================
# Built-in Event Handlers
# ============================================================================


def setup_default_handlers():
    """
    Set up default event handlers

    These handlers provide core functionality like logging,
    notifications, and metrics collection.
    """
    bus = get_event_bus()

    # Logger handler - logs all events
    def log_event_handler(event: Event):
        logger.info(f"Event: {event.event_type.value} | Source: {event.source} | Data: {event.data}")

    bus.subscribe_all(log_event_handler)

    # SLA breach notification handler
    def sla_breach_handler(event: Event):
        if event.event_type == EventType.SLA_BREACHED:
            logger.warning(f"SLA BREACH: {event.data}")
            # TODO: Send notification to managers/stakeholders

    bus.subscribe(EventType.SLA_BREACHED, sla_breach_handler)
    bus.subscribe(EventType.SLA_AT_RISK, sla_breach_handler)

    # Process completion metrics handler
    def process_completion_handler(event: Event):
        if event.event_type == EventType.PROCESS_COMPLETED:
            logger.info(f"Process completed: {event.data.get('process_id')}")
            # TODO: Update performance metrics

    bus.subscribe(EventType.PROCESS_COMPLETED, process_completion_handler)

    logger.info("Default event handlers set up")
