"""
Workflow Engine - Process Orchestration

Manages process instance lifecycle, task execution, and state transitions.
"""

import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from ..database import get_postgres_client

logger = logging.getLogger(__name__)


class ProcessStatus(str, Enum):
    """Process status enum"""

    PENDING = "pending"
    RUNNING = "running"
    SUSPENDED = "suspended"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskStatus(str, Enum):
    """Task status enum"""

    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class SLAStatus(str, Enum):
    """SLA status enum"""

    ON_TRACK = "on_track"
    AT_RISK = "at_risk"
    BREACHED = "breached"
    MET = "met"


class WorkflowEngine:
    """
    Workflow orchestration engine

    Responsibilities:
    - Create and manage process instances
    - Execute tasks in order
    - Handle dependencies and parallel execution
    - Track SLA compliance
    - Manage state transitions
    - Emit events for audit trail
    """

    def __init__(self):
        self.db = get_postgres_client()

    # ========================================================================
    # Process Instance Management
    # ========================================================================

    def start_process(
        self,
        process_definition_id: str,
        process_name: str,
        process_type: str,
        initiated_by: str,
        input_data: Optional[Dict[str, Any]] = None,
        assigned_to: Optional[str] = None,
        priority: str = "medium",
        sla_target_mins: Optional[int] = None,
        business_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Start a new process instance

        Args:
            process_definition_id: Module ID or workflow ID
            process_name: Human-readable process name
            process_type: Type (journey, phase, module, custom)
            initiated_by: User who started the process
            input_data: Initial input data
            assigned_to: User assigned to this process
            priority: Priority level
            sla_target_mins: SLA target in minutes
            business_context: Business context metadata

        Returns:
            Created process instance
        """
        try:
            # Calculate due date from SLA
            due_date = None
            if sla_target_mins:
                due_date = datetime.now() + timedelta(minutes=sla_target_mins)

            # Create process instance
            query = """
                INSERT INTO process_instances (
                    process_definition_id,
                    process_name,
                    process_type,
                    status,
                    initiated_by,
                    assigned_to,
                    priority,
                    sla_target_mins,
                    due_date,
                    input_data,
                    business_context,
                    started_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
            """

            process = self.db.execute_command(
                query,
                (
                    process_definition_id,
                    process_name,
                    process_type,
                    ProcessStatus.RUNNING.value,
                    initiated_by,
                    assigned_to,
                    priority,
                    sla_target_mins,
                    due_date,
                    input_data or {},
                    business_context or {},
                ),
                returning=True,
            )

            # Log event
            self._log_event(
                process_instance_id=process["id"],
                event_type="process_started",
                event_category="lifecycle",
                user_id=initiated_by,
                message=f"Process '{process_name}' started",
                details={"priority": priority, "type": process_type},
            )

            logger.info(f"Started process {process['id']}: {process_name}")
            return process

        except Exception as e:
            logger.error(f"Failed to start process: {e}")
            raise

    def update_process_status(
        self,
        process_id: UUID,
        new_status: ProcessStatus,
        user_id: Optional[str] = None,
        error_message: Optional[str] = None,
        output_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Update process status

        Args:
            process_id: Process instance ID
            new_status: New status
            user_id: User making the change
            error_message: Error message if failed
            output_data: Output data if completed

        Returns:
            Updated process instance
        """
        try:
            # Get current process
            current = self.db.execute_query(
                "SELECT * FROM process_instances WHERE id = %s", (str(process_id),), fetch="one"
            )

            if not current:
                raise ValueError(f"Process {process_id} not found")

            # Build update query
            updates = ["status = %s", "updated_at = NOW()"]
            params = [new_status.value]

            if new_status == ProcessStatus.COMPLETED:
                updates.append("completed_at = NOW()")
                updates.append("progress_percentage = 100")
                if output_data:
                    updates.append("output_data = %s")
                    params.append(output_data)

            if new_status == ProcessStatus.FAILED:
                if error_message:
                    updates.append("error_message = %s")
                    params.append(error_message)

            params.append(str(process_id))

            query = f"""
                UPDATE process_instances
                SET {', '.join(updates)}
                WHERE id = %s
                RETURNING *
            """

            process = self.db.execute_command(query, tuple(params), returning=True)

            # Log event
            self._log_event(
                process_instance_id=process_id,
                event_type=f"process_{new_status.value}",
                event_category="lifecycle",
                user_id=user_id or "system",
                message=f"Process status changed to {new_status.value}",
                old_status=current["status"],
                new_status=new_status.value,
                details={"error": error_message} if error_message else {},
            )

            logger.info(f"Process {process_id} status updated to {new_status.value}")
            return process

        except Exception as e:
            logger.error(f"Failed to update process status: {e}")
            raise

    def suspend_process(self, process_id: UUID, user_id: str, reason: str) -> Dict[str, Any]:
        """Suspend a running process"""
        process = self.update_process_status(process_id, ProcessStatus.SUSPENDED, user_id=user_id)

        self._log_event(
            process_instance_id=process_id,
            event_type="process_suspended",
            event_category="lifecycle",
            user_id=user_id,
            message=f"Process suspended: {reason}",
            details={"reason": reason},
        )

        return process

    def resume_process(self, process_id: UUID, user_id: str) -> Dict[str, Any]:
        """Resume a suspended process"""
        process = self.update_process_status(process_id, ProcessStatus.RUNNING, user_id=user_id)

        self._log_event(
            process_instance_id=process_id,
            event_type="process_resumed",
            event_category="lifecycle",
            user_id=user_id,
            message="Process resumed",
        )

        return process

    # ========================================================================
    # Task Management
    # ========================================================================

    def create_task(
        self,
        process_instance_id: UUID,
        task_definition_id: str,
        task_name: str,
        task_type: str,
        assigned_to: Optional[str] = None,
        depends_on: Optional[List[UUID]] = None,
        priority: Optional[str] = None,
        sla_target_mins: Optional[int] = None,
        input_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new task within a process

        Args:
            process_instance_id: Parent process ID
            task_definition_id: Atom ID
            task_name: Human-readable task name
            task_type: Task type (manual, automated, approval)
            assigned_to: User assigned to task
            depends_on: List of task IDs this depends on
            priority: Priority (inherits from process if not specified)
            sla_target_mins: SLA target in minutes
            input_data: Input data for the task

        Returns:
            Created task
        """
        try:
            # Get process to inherit priority
            process = self.db.execute_query(
                "SELECT priority FROM process_instances WHERE id = %s", (str(process_instance_id),), fetch="one"
            )

            if not process:
                raise ValueError(f"Process {process_instance_id} not found")

            # Calculate due date
            due_date = None
            if sla_target_mins:
                due_date = datetime.now() + timedelta(minutes=sla_target_mins)

            # Determine initial status
            status = TaskStatus.PENDING.value
            if assigned_to:
                status = TaskStatus.ASSIGNED.value

            # Create task
            query = """
                INSERT INTO tasks (
                    process_instance_id,
                    task_definition_id,
                    task_name,
                    task_type,
                    status,
                    assigned_to,
                    depends_on,
                    priority,
                    sla_target_mins,
                    due_date,
                    input_data
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """

            task = self.db.execute_command(
                query,
                (
                    str(process_instance_id),
                    task_definition_id,
                    task_name,
                    task_type,
                    status,
                    assigned_to,
                    [str(tid) for tid in (depends_on or [])],
                    priority or process["priority"],
                    sla_target_mins,
                    due_date,
                    input_data or {},
                ),
                returning=True,
            )

            # Log event
            self._log_event(
                process_instance_id=process_instance_id,
                task_id=task["id"],
                event_type="task_created",
                event_category="lifecycle",
                user_id="system",
                message=f"Task '{task_name}' created",
                details={"type": task_type, "assigned_to": assigned_to},
            )

            logger.info(f"Created task {task['id']}: {task_name}")
            return task

        except Exception as e:
            logger.error(f"Failed to create task: {e}")
            raise

    def assign_task(
        self, task_id: UUID, assigned_to: str, assigned_by: str, assignment_method: str = "manual"
    ) -> Dict[str, Any]:
        """
        Assign a task to a user

        Args:
            task_id: Task ID
            assigned_to: User to assign to
            assigned_by: User making the assignment
            assignment_method: Method (manual, round_robin, load_balanced)

        Returns:
            Updated task
        """
        try:
            # Update task
            query = """
                UPDATE tasks
                SET assigned_to = %s,
                    status = %s,
                    assignment_method = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """

            task = self.db.execute_command(
                query, (assigned_to, TaskStatus.ASSIGNED.value, assignment_method, str(task_id)), returning=True
            )

            # Record assignment
            self.db.execute_command(
                """
                INSERT INTO task_assignments (task_id, assigned_to, assigned_by, assignment_method)
                VALUES (%s, %s, %s, %s)
                """,
                (str(task_id), assigned_to, assigned_by, assignment_method),
            )

            # Log event
            self._log_event(
                process_instance_id=task["process_instance_id"],
                task_id=task_id,
                event_type="task_assigned",
                event_category="assignment",
                user_id=assigned_by,
                message=f"Task assigned to {assigned_to}",
                details={"method": assignment_method},
            )

            logger.info(f"Task {task_id} assigned to {assigned_to}")
            return task

        except Exception as e:
            logger.error(f"Failed to assign task: {e}")
            raise

    def start_task(self, task_id: UUID, user_id: str) -> Dict[str, Any]:
        """
        Start working on a task

        Args:
            task_id: Task ID
            user_id: User starting the task

        Returns:
            Updated task
        """
        try:
            query = """
                UPDATE tasks
                SET status = %s,
                    started_at = NOW(),
                    claimed_by = %s,
                    claimed_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """

            task = self.db.execute_command(query, (TaskStatus.IN_PROGRESS.value, user_id, str(task_id)), returning=True)

            # Log event
            self._log_event(
                process_instance_id=task["process_instance_id"],
                task_id=task_id,
                event_type="task_started",
                event_category="lifecycle",
                user_id=user_id,
                message="Task started",
            )

            logger.info(f"Task {task_id} started by {user_id}")
            return task

        except Exception as e:
            logger.error(f"Failed to start task: {e}")
            raise

    def complete_task(
        self, task_id: UUID, user_id: str, output_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Complete a task

        Args:
            task_id: Task ID
            user_id: User completing the task
            output_data: Task output data

        Returns:
            Updated task
        """
        try:
            query = """
                UPDATE tasks
                SET status = %s,
                    completed_at = NOW(),
                    output_data = %s,
                    actual_duration_mins = EXTRACT(EPOCH FROM (NOW() - started_at))/60,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """

            task = self.db.execute_command(
                query, (TaskStatus.COMPLETED.value, output_data or {}, str(task_id)), returning=True
            )

            # Log event
            self._log_event(
                process_instance_id=task["process_instance_id"],
                task_id=task_id,
                event_type="task_completed",
                event_category="lifecycle",
                user_id=user_id,
                message="Task completed",
                details={"duration_mins": task.get("actual_duration_mins")},
            )

            # Check if we should advance the process
            self._check_process_progress(task["process_instance_id"])

            logger.info(f"Task {task_id} completed by {user_id}")
            return task

        except Exception as e:
            logger.error(f"Failed to complete task: {e}")
            raise

    # ========================================================================
    # SLA Management
    # ========================================================================

    def check_sla_compliance(self):
        """
        Check SLA compliance for all active processes and tasks

        Returns:
            Number of SLA violations found
        """
        violations = 0

        try:
            # Check processes
            query = """
                UPDATE process_instances
                SET sla_status = CASE
                    WHEN due_date IS NULL THEN 'on_track'
                    WHEN NOW() > due_date THEN 'breached'
                    WHEN NOW() > (due_date - INTERVAL '15 minutes') THEN 'at_risk'
                    ELSE 'on_track'
                END,
                sla_breach_time = CASE
                    WHEN NOW() > due_date AND sla_status != 'breached' THEN NOW()
                    ELSE sla_breach_time
                END
                WHERE status IN ('running', 'suspended')
                RETURNING id, sla_status
            """

            results = self.db.execute_query(query)

            for row in results or []:
                if row["sla_status"] in ["at_risk", "breached"]:
                    violations += 1
                    self._log_event(
                        process_instance_id=row["id"],
                        event_type=f"sla_{row['sla_status']}",
                        event_category="sla",
                        severity="warning" if row["sla_status"] == "at_risk" else "error",
                        user_id="system",
                        message=f"Process SLA {row['sla_status']}",
                    )

            # Check tasks
            task_query = """
                UPDATE tasks
                SET sla_status = CASE
                    WHEN due_date IS NULL THEN 'on_track'
                    WHEN NOW() > due_date THEN 'breached'
                    WHEN NOW() > (due_date - INTERVAL '15 minutes') THEN 'at_risk'
                    ELSE 'on_track'
                END,
                sla_breach_time = CASE
                    WHEN NOW() > due_date AND sla_status != 'breached' THEN NOW()
                    ELSE sla_breach_time
                END
                WHERE status IN ('assigned', 'in_progress')
                RETURNING id, process_instance_id, sla_status
            """

            task_results = self.db.execute_query(task_query)

            for row in task_results or []:
                if row["sla_status"] in ["at_risk", "breached"]:
                    violations += 1
                    self._log_event(
                        process_instance_id=row["process_instance_id"],
                        task_id=row["id"],
                        event_type=f"sla_{row['sla_status']}",
                        event_category="sla",
                        severity="warning" if row["sla_status"] == "at_risk" else "error",
                        user_id="system",
                        message=f"Task SLA {row['sla_status']}",
                    )

            logger.info(f"SLA check complete: {violations} violations found")
            return violations

        except Exception as e:
            logger.error(f"Failed to check SLA compliance: {e}")
            raise

    # ========================================================================
    # Internal Helpers
    # ========================================================================

    def _log_event(
        self,
        process_instance_id: UUID,
        event_type: str,
        event_category: str,
        user_id: str,
        message: str,
        task_id: Optional[UUID] = None,
        severity: str = "info",
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        """Log a process event"""
        try:
            query = """
                INSERT INTO process_events (
                    process_instance_id,
                    task_id,
                    event_type,
                    event_category,
                    severity,
                    user_id,
                    message,
                    old_status,
                    new_status,
                    details,
                    automated
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """

            self.db.execute_command(
                query,
                (
                    str(process_instance_id),
                    str(task_id) if task_id else None,
                    event_type,
                    event_category,
                    severity,
                    user_id,
                    message,
                    old_status,
                    new_status,
                    details or {},
                    user_id == "system",
                ),
            )

        except Exception as e:
            logger.error(f"Failed to log event: {e}")
            # Don't raise - event logging shouldn't break main flow

    def _check_process_progress(self, process_id: UUID):
        """Check if process should advance based on task completion"""
        try:
            # Get task stats
            stats = self.db.execute_query(
                """
                SELECT
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed
                FROM tasks
                WHERE process_instance_id = %s
                """,
                (str(process_id),),
                fetch="one",
            )

            if not stats or stats["total"] == 0:
                return

            # Calculate progress
            progress = (stats["completed"] / stats["total"]) * 100

            # Update process progress
            self.db.execute_command(
                """
                UPDATE process_instances
                SET progress_percentage = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (progress, str(process_id)),
            )

            # Check if all tasks complete
            if stats["completed"] == stats["total"]:
                self.update_process_status(process_id, ProcessStatus.COMPLETED, user_id="system")

            # Check if any task failed
            elif stats["failed"] > 0:
                self.update_process_status(
                    process_id,
                    ProcessStatus.FAILED,
                    user_id="system",
                    error_message=f"{stats['failed']} task(s) failed",
                )

        except Exception as e:
            logger.error(f"Failed to check process progress: {e}")
