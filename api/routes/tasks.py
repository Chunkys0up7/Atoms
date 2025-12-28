"""
Task Management API Routes

REST API for managing workflow tasks.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import sys

try:
    from ..orchestrator import WorkflowEngine, TaskRouter, AssignmentMethod, get_event_bus, EventType
    from ..database import get_postgres_client
except ImportError:
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from orchestrator import WorkflowEngine, TaskRouter, AssignmentMethod, get_event_bus, EventType
    from database import get_postgres_client


router = APIRouter()
engine = WorkflowEngine()
task_router = TaskRouter()
db = get_postgres_client()
event_bus = get_event_bus()


# ============================================================================
# Request/Response Models
# ============================================================================

class CreateTaskRequest(BaseModel):
    """Request to create a new task"""
    process_instance_id: str
    task_definition_id: str
    task_name: str
    task_type: str
    assigned_to: Optional[str] = None
    depends_on: Optional[List[str]] = []
    priority: Optional[str] = None
    sla_target_mins: Optional[int] = None
    input_data: Optional[Dict[str, Any]] = {}


class AssignTaskRequest(BaseModel):
    """Request to assign a task"""
    assigned_to: Optional[str] = None
    assignment_method: str = 'manual'
    team: Optional[str] = None


class StartTaskRequest(BaseModel):
    """Request to start a task"""
    user_id: str


class CompleteTaskRequest(BaseModel):
    """Request to complete a task"""
    user_id: str
    output_data: Optional[Dict[str, Any]] = {}


class ReassignTaskRequest(BaseModel):
    """Request to reassign a task"""
    new_assignee: str
    reassigned_by: str
    reason: str


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/api/tasks")
def create_task(request: CreateTaskRequest) -> Dict[str, Any]:
    """
    Create a new task

    Args:
        request: Task creation request

    Returns:
        Created task
    """
    try:
        task = engine.create_task(
            process_instance_id=UUID(request.process_instance_id),
            task_definition_id=request.task_definition_id,
            task_name=request.task_name,
            task_type=request.task_type,
            assigned_to=request.assigned_to,
            depends_on=[UUID(tid) for tid in request.depends_on] if request.depends_on else None,
            priority=request.priority,
            sla_target_mins=request.sla_target_mins,
            input_data=request.input_data
        )

        # Publish event
        event_bus.publish(
            EventType.TASK_CREATED,
            {
                'task_id': str(task['id']),
                'task_name': task['task_name'],
                'process_id': request.process_instance_id
            },
            source='system'
        )

        return task

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@router.get("/api/tasks")
def list_tasks(
    process_id: Optional[str] = Query(None, description="Filter by process ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    List tasks with filtering

    Args:
        process_id: Filter by process ID
        status: Filter by status
        assigned_to: Filter by assignee
        limit: Max results
        offset: Results to skip

    Returns:
        List of tasks with pagination
    """
    try:
        # Build query
        where_clauses = []
        params = []

        if process_id:
            where_clauses.append("process_instance_id = %s")
            params.append(process_id)

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if assigned_to:
            where_clauses.append("assigned_to = %s")
            params.append(assigned_to)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Get total count
        count_query = f"SELECT COUNT(*) as count FROM tasks {where_sql}"
        count_result = db.execute_query(count_query, tuple(params), fetch='one')
        total = count_result['count'] if count_result else 0

        # Get tasks
        params.extend([limit, offset])
        query = f"""
            SELECT *
            FROM tasks
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """

        tasks = db.execute_query(query, tuple(params))

        return {
            'tasks': tasks or [],
            'total': total,
            'limit': limit,
            'offset': offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tasks: {str(e)}")


@router.get("/api/tasks/{task_id}")
def get_task(task_id: str) -> Dict[str, Any]:
    """
    Get a specific task

    Args:
        task_id: Task ID

    Returns:
        Task details
    """
    try:
        query = "SELECT * FROM tasks WHERE id = %s"
        task = db.execute_query(query, (task_id,), fetch='one')

        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

        return task

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get task: {str(e)}")


@router.post("/api/tasks/{task_id}/assign")
def assign_task(task_id: str, request: AssignTaskRequest) -> Dict[str, Any]:
    """
    Assign a task to a user

    Args:
        task_id: Task ID
        request: Assignment request

    Returns:
        Updated task
    """
    try:
        # Validate assignment method
        try:
            method = AssignmentMethod(request.assignment_method)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid assignment method: {request.assignment_method}")

        if method == AssignmentMethod.MANUAL:
            if not request.assigned_to:
                raise HTTPException(status_code=400, detail="assigned_to required for manual assignment")

            task = engine.assign_task(
                UUID(task_id),
                request.assigned_to,
                assigned_by='system',
                assignment_method='manual'
            )
        else:
            # Use TaskRouter for intelligent assignment
            assigned_to = task_router.assign_task(
                task_id,
                method,
                team=request.team
            )

            task = db.execute_query(
                "SELECT * FROM tasks WHERE id = %s",
                (task_id,),
                fetch='one'
            )

        # Publish event
        event_bus.publish(
            EventType.TASK_ASSIGNED,
            {
                'task_id': task_id,
                'assigned_to': task['assigned_to'],
                'method': request.assignment_method
            },
            source='system'
        )

        return task

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign task: {str(e)}")


@router.post("/api/tasks/{task_id}/start")
def start_task(task_id: str, request: StartTaskRequest) -> Dict[str, Any]:
    """
    Start working on a task

    Args:
        task_id: Task ID
        request: Start task request

    Returns:
        Updated task
    """
    try:
        task = engine.start_task(UUID(task_id), request.user_id)

        # Publish event
        event_bus.publish(
            EventType.TASK_STARTED,
            {'task_id': task_id, 'user_id': request.user_id},
            source=request.user_id
        )

        return task

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start task: {str(e)}")


@router.post("/api/tasks/{task_id}/complete")
def complete_task(task_id: str, request: CompleteTaskRequest) -> Dict[str, Any]:
    """
    Complete a task

    Args:
        task_id: Task ID
        request: Complete task request

    Returns:
        Updated task
    """
    try:
        task = engine.complete_task(
            UUID(task_id),
            request.user_id,
            output_data=request.output_data
        )

        # Publish event
        event_bus.publish(
            EventType.TASK_COMPLETED,
            {'task_id': task_id, 'user_id': request.user_id},
            source=request.user_id
        )

        return task

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete task: {str(e)}")


@router.post("/api/tasks/{task_id}/reassign")
def reassign_task(task_id: str, request: ReassignTaskRequest) -> Dict[str, Any]:
    """
    Reassign a task to a different user

    Args:
        task_id: Task ID
        request: Reassignment request

    Returns:
        Updated task
    """
    try:
        task = task_router.reassign_task(
            UUID(task_id),
            request.new_assignee,
            request.reassigned_by,
            request.reason
        )

        # Publish event
        event_bus.publish(
            EventType.TASK_REASSIGNED,
            {
                'task_id': task_id,
                'new_assignee': request.new_assignee,
                'reason': request.reason
            },
            source=request.reassigned_by
        )

        return task

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reassign task: {str(e)}")


@router.get("/api/tasks/my-tasks/{user_id}")
def get_my_tasks(user_id: str) -> List[Dict[str, Any]]:
    """
    Get tasks assigned to a user

    Args:
        user_id: User ID

    Returns:
        List of assigned tasks
    """
    try:
        query = """
            SELECT * FROM v_my_tasks
            WHERE assigned_to = %s
            ORDER BY due_date ASC NULLS LAST, priority DESC
        """

        tasks = db.execute_query(query, (user_id,))
        return tasks or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get my tasks: {str(e)}")


@router.get("/api/tasks/stats/assignment")
def get_assignment_stats(team: Optional[str] = None) -> Dict[str, Any]:
    """
    Get task assignment statistics

    Args:
        team: Optional team filter

    Returns:
        Assignment statistics
    """
    try:
        stats = task_router.get_assignment_stats(team)
        return stats

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get assignment stats: {str(e)}")


@router.get("/api/tasks/stats/workload")
def get_workload_stats() -> Dict[str, Any]:
    """
    Get workload distribution statistics

    Returns:
        Workload statistics
    """
    try:
        query = """
            SELECT
                assigned_to,
                COUNT(*) as active_tasks,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                COUNT(*) FILTER (WHERE sla_status = 'at_risk') as at_risk,
                COUNT(*) FILTER (WHERE sla_status = 'breached') as breached
            FROM tasks
            WHERE status IN ('assigned', 'in_progress')
              AND assigned_to IS NOT NULL
            GROUP BY assigned_to
            ORDER BY active_tasks DESC
        """

        workloads = db.execute_query(query)
        return {'user_workloads': workloads or []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get workload stats: {str(e)}")
