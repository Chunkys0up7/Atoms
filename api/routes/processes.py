"""
Process Management API Routes

REST API for managing workflow process instances.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import sys

try:
    from ..orchestrator import WorkflowEngine, ProcessStatus, get_event_bus, EventType
    from ..database import get_postgres_client
except ImportError:
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from orchestrator import WorkflowEngine, ProcessStatus, get_event_bus, EventType
    from database import get_postgres_client


router = APIRouter()
engine = WorkflowEngine()
db = get_postgres_client()
event_bus = get_event_bus()


# ============================================================================
# Request/Response Models
# ============================================================================

class StartProcessRequest(BaseModel):
    """Request to start a new process"""
    process_definition_id: str
    process_name: str
    process_type: str
    initiated_by: str
    input_data: Optional[Dict[str, Any]] = {}
    assigned_to: Optional[str] = None
    priority: str = 'medium'
    sla_target_mins: Optional[int] = None
    business_context: Optional[Dict[str, Any]] = {}


class UpdateProcessStatusRequest(BaseModel):
    """Request to update process status"""
    new_status: str
    user_id: Optional[str] = 'system'
    error_message: Optional[str] = None
    output_data: Optional[Dict[str, Any]] = None


class ProcessResponse(BaseModel):
    """Process instance response"""
    id: str
    process_definition_id: str
    process_name: str
    process_type: str
    status: str
    progress_percentage: float
    initiated_by: str
    assigned_to: Optional[str]
    priority: str
    sla_status: str
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]
    due_date: Optional[str]


class ProcessListResponse(BaseModel):
    """List of processes with pagination"""
    processes: List[ProcessResponse]
    total: int
    limit: int
    offset: int


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/api/processes")
def start_process(request: StartProcessRequest) -> ProcessResponse:
    """
    Start a new process instance

    Args:
        request: Process start request

    Returns:
        Created process instance
    """
    try:
        process = engine.start_process(
            process_definition_id=request.process_definition_id,
            process_name=request.process_name,
            process_type=request.process_type,
            initiated_by=request.initiated_by,
            input_data=request.input_data,
            assigned_to=request.assigned_to,
            priority=request.priority,
            sla_target_mins=request.sla_target_mins,
            business_context=request.business_context
        )

        # Publish event
        event_bus.publish(
            EventType.PROCESS_STARTED,
            {
                'process_id': str(process['id']),
                'process_name': process['process_name'],
                'initiated_by': request.initiated_by
            },
            source=request.initiated_by
        )

        return ProcessResponse(
            id=str(process['id']),
            process_definition_id=process['process_definition_id'],
            process_name=process['process_name'],
            process_type=process['process_type'],
            status=process['status'],
            progress_percentage=process['progress_percentage'],
            initiated_by=process['initiated_by'],
            assigned_to=process.get('assigned_to'),
            priority=process['priority'],
            sla_status=process['sla_status'],
            created_at=process['created_at'].isoformat(),
            started_at=process['started_at'].isoformat() if process.get('started_at') else None,
            completed_at=process['completed_at'].isoformat() if process.get('completed_at') else None,
            due_date=process['due_date'].isoformat() if process.get('due_date') else None
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start process: {str(e)}")


@router.get("/api/processes")
def list_processes(
    status: Optional[str] = Query(None, description="Filter by status"),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee"),
    process_type: Optional[str] = Query(None, description="Filter by type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
) -> ProcessListResponse:
    """
    List process instances with filtering

    Args:
        status: Filter by status
        assigned_to: Filter by assignee
        process_type: Filter by type
        limit: Max results to return
        offset: Number of results to skip

    Returns:
        List of processes
    """
    try:
        # Build query
        where_clauses = []
        params = []

        if status:
            where_clauses.append("status = %s")
            params.append(status)

        if assigned_to:
            where_clauses.append("assigned_to = %s")
            params.append(assigned_to)

        if process_type:
            where_clauses.append("process_type = %s")
            params.append(process_type)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Get total count
        count_query = f"SELECT COUNT(*) as count FROM process_instances {where_sql}"
        count_result = db.execute_query(count_query, tuple(params), fetch='one')
        total = count_result['count'] if count_result else 0

        # Get processes
        params.extend([limit, offset])
        query = f"""
            SELECT *
            FROM process_instances
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """

        processes = db.execute_query(query, tuple(params))

        return ProcessListResponse(
            processes=[
                ProcessResponse(
                    id=str(p['id']),
                    process_definition_id=p['process_definition_id'],
                    process_name=p['process_name'],
                    process_type=p['process_type'],
                    status=p['status'],
                    progress_percentage=float(p['progress_percentage']),
                    initiated_by=p['initiated_by'],
                    assigned_to=p.get('assigned_to'),
                    priority=p['priority'],
                    sla_status=p['sla_status'],
                    created_at=p['created_at'].isoformat(),
                    started_at=p['started_at'].isoformat() if p.get('started_at') else None,
                    completed_at=p['completed_at'].isoformat() if p.get('completed_at') else None,
                    due_date=p['due_date'].isoformat() if p.get('due_date') else None
                )
                for p in (processes or [])
            ],
            total=total,
            limit=limit,
            offset=offset
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list processes: {str(e)}")


@router.get("/api/processes/{process_id}")
def get_process(process_id: str) -> Dict[str, Any]:
    """
    Get a specific process instance

    Args:
        process_id: Process ID

    Returns:
        Process instance details
    """
    try:
        query = "SELECT * FROM process_instances WHERE id = %s"
        process = db.execute_query(query, (process_id,), fetch='one')

        if not process:
            raise HTTPException(status_code=404, detail=f"Process {process_id} not found")

        return process

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get process: {str(e)}")


@router.put("/api/processes/{process_id}/status")
def update_process_status(
    process_id: str,
    request: UpdateProcessStatusRequest
) -> Dict[str, Any]:
    """
    Update process status

    Args:
        process_id: Process ID
        request: Status update request

    Returns:
        Updated process
    """
    try:
        # Validate status
        try:
            status = ProcessStatus(request.new_status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {request.new_status}")

        process = engine.update_process_status(
            UUID(process_id),
            status,
            user_id=request.user_id,
            error_message=request.error_message,
            output_data=request.output_data
        )

        # Publish event
        event_type = {
            ProcessStatus.COMPLETED: EventType.PROCESS_COMPLETED,
            ProcessStatus.FAILED: EventType.PROCESS_FAILED,
            ProcessStatus.SUSPENDED: EventType.PROCESS_SUSPENDED,
            ProcessStatus.RESUMED: EventType.PROCESS_RESUMED,
            ProcessStatus.CANCELLED: EventType.PROCESS_CANCELLED
        }.get(status)

        if event_type:
            event_bus.publish(
                event_type,
                {'process_id': process_id, 'new_status': request.new_status},
                source=request.user_id or 'system'
            )

        return process

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update process status: {str(e)}")


@router.post("/api/processes/{process_id}/suspend")
def suspend_process(
    process_id: str,
    user_id: str,
    reason: str
) -> Dict[str, Any]:
    """
    Suspend a running process

    Args:
        process_id: Process ID
        user_id: User suspending the process
        reason: Reason for suspension

    Returns:
        Updated process
    """
    try:
        process = engine.suspend_process(UUID(process_id), user_id, reason)

        event_bus.publish(
            EventType.PROCESS_SUSPENDED,
            {'process_id': process_id, 'reason': reason},
            source=user_id
        )

        return process

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suspend process: {str(e)}")


@router.post("/api/processes/{process_id}/resume")
def resume_process(
    process_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Resume a suspended process

    Args:
        process_id: Process ID
        user_id: User resuming the process

    Returns:
        Updated process
    """
    try:
        process = engine.resume_process(UUID(process_id), user_id)

        event_bus.publish(
            EventType.PROCESS_RESUMED,
            {'process_id': process_id},
            source=user_id
        )

        return process

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resume process: {str(e)}")


@router.get("/api/processes/{process_id}/events")
def get_process_events(
    process_id: str,
    limit: int = Query(100, ge=1, le=500)
) -> List[Dict[str, Any]]:
    """
    Get event history for a process

    Args:
        process_id: Process ID
        limit: Max events to return

    Returns:
        List of events
    """
    try:
        query = """
            SELECT *
            FROM process_events
            WHERE process_instance_id = %s
            ORDER BY timestamp DESC
            LIMIT %s
        """

        events = db.execute_query(query, (process_id, limit))
        return events or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get process events: {str(e)}")


@router.get("/api/processes/stats/summary")
def get_process_stats() -> Dict[str, Any]:
    """
    Get overall process statistics

    Returns:
        Process statistics
    """
    try:
        query = """
            SELECT
                COUNT(*) as total_processes,
                COUNT(*) FILTER (WHERE status = 'running') as running,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
                COUNT(*) FILTER (WHERE sla_status = 'breached') as sla_breached,
                AVG(progress_percentage) as avg_progress,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60)
                    FILTER (WHERE completed_at IS NOT NULL) as avg_duration_mins
            FROM process_instances
            WHERE created_at > NOW() - INTERVAL '30 days'
        """

        stats = db.execute_query(query, fetch='one')
        return stats or {}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get process stats: {str(e)}")
