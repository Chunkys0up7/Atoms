"""
Task Router - Intelligent Task Assignment

Handles task routing using different assignment strategies:
- Round-robin: Distribute evenly
- Load-balanced: Assign to least busy user
- Skill-based: Match task requirements to user skills
- Manual: Direct assignment
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from ..database import get_postgres_client

logger = logging.getLogger(__name__)


class AssignmentMethod(str, Enum):
    """Assignment method enum"""

    MANUAL = "manual"
    ROUND_ROBIN = "round_robin"
    LOAD_BALANCED = "load_balanced"
    SKILL_BASED = "skill_based"


class TaskRouter:
    """
    Intelligent task assignment router

    Implements multiple assignment strategies to optimize
    workload distribution and match tasks to appropriate users.
    """

    def __init__(self):
        self.db = get_postgres_client()
        self._round_robin_index = {}  # Track round-robin position per team

    def assign_task(
        self,
        task_id: str,
        method: AssignmentMethod,
        team: Optional[str] = None,
        pool: Optional[List[str]] = None,
        assigned_by: str = "system",
        task_requirements: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Assign a task using specified method

        Args:
            task_id: Task to assign
            method: Assignment method
            team: Team name for pool-based assignment
            pool: List of user IDs to choose from
            assigned_by: User making the assignment
            task_requirements: Task requirements for skill matching

        Returns:
            User ID assigned to
        """
        if method == AssignmentMethod.MANUAL:
            raise ValueError("Manual assignment requires explicit user_id")

        elif method == AssignmentMethod.ROUND_ROBIN:
            return self._assign_round_robin(task_id, team, pool, assigned_by)

        elif method == AssignmentMethod.LOAD_BALANCED:
            return self._assign_load_balanced(task_id, team, pool, assigned_by)

        elif method == AssignmentMethod.SKILL_BASED:
            return self._assign_skill_based(task_id, team, pool, assigned_by, task_requirements)

        else:
            raise ValueError(f"Unknown assignment method: {method}")

    def _assign_round_robin(
        self, task_id: str, team: Optional[str], pool: Optional[List[str]], assigned_by: str
    ) -> str:
        """
        Round-robin assignment

        Distributes tasks evenly across available users in rotation.
        """
        # Get candidate pool
        candidates = pool or self._get_team_members(team)

        if not candidates:
            raise ValueError(f"No candidates available for assignment (team={team})")

        # Get or initialize round-robin index for this team/pool
        pool_key = team or "default"
        if pool_key not in self._round_robin_index:
            self._round_robin_index[pool_key] = 0

        # Get next user in rotation
        index = self._round_robin_index[pool_key] % len(candidates)
        assigned_to = candidates[index]

        # Increment for next time
        self._round_robin_index[pool_key] = (index + 1) % len(candidates)

        # Perform assignment
        self._execute_assignment(task_id, assigned_to, assigned_by, AssignmentMethod.ROUND_ROBIN)

        logger.info(f"Task {task_id} assigned to {assigned_to} via round-robin (index {index}/{len(candidates)})")
        return assigned_to

    def _assign_load_balanced(
        self, task_id: str, team: Optional[str], pool: Optional[List[str]], assigned_by: str
    ) -> str:
        """
        Load-balanced assignment

        Assigns to the user with the fewest active tasks.
        """
        # Get candidate pool
        candidates = pool or self._get_team_members(team)

        if not candidates:
            raise ValueError(f"No candidates available for assignment (team={team})")

        # Get current workload for each candidate
        workloads = self._get_user_workloads(candidates)

        # Find user with minimum workload
        min_workload = min(workloads.values())
        least_busy = [user for user, load in workloads.items() if load == min_workload]

        # If multiple users have same workload, pick first alphabetically for consistency
        assigned_to = sorted(least_busy)[0]

        # Perform assignment
        self._execute_assignment(task_id, assigned_to, assigned_by, AssignmentMethod.LOAD_BALANCED)

        logger.info(f"Task {task_id} assigned to {assigned_to} via load-balancing (current load: {min_workload})")
        return assigned_to

    def _assign_skill_based(
        self,
        task_id: str,
        team: Optional[str],
        pool: Optional[List[str]],
        assigned_by: str,
        task_requirements: Optional[Dict[str, Any]],
    ) -> str:
        """
        Skill-based assignment

        Matches task requirements to user skills/capabilities.
        Note: Requires user skills to be stored in database.
        For now, falls back to load-balanced assignment.
        """
        # TODO: Implement skill matching when user skill profiles are available
        # This would:
        # 1. Parse task_requirements to extract needed skills
        # 2. Query user profiles for skill matches
        # 3. Score candidates based on skill fit
        # 4. Assign to best match (or best match with lowest workload)

        logger.warning("Skill-based assignment not fully implemented, falling back to load-balanced")
        return self._assign_load_balanced(task_id, team, pool, assigned_by)

    def _get_team_members(self, team: Optional[str]) -> List[str]:
        """
        Get list of team members

        Note: This is a placeholder. In production, this would query
        a user/team database or directory service.
        """
        # TODO: Implement team member lookup from user database
        # For now, return a mock team
        if team == "underwriters":
            return ["underwriter-1", "underwriter-2", "underwriter-3"]
        elif team == "processors":
            return ["processor-1", "processor-2", "processor-3", "processor-4"]
        elif team == "loan-officers":
            return ["lo-1", "lo-2", "lo-3"]
        else:
            # Default team
            return ["user-1", "user-2", "user-3"]

    def _get_user_workloads(self, user_ids: List[str]) -> Dict[str, int]:
        """
        Get current active task count for each user

        Args:
            user_ids: List of user IDs to check

        Returns:
            Dict mapping user_id to active task count
        """
        try:
            # Query active task counts
            query = """
                SELECT
                    assigned_to,
                    COUNT(*) as task_count
                FROM tasks
                WHERE assigned_to = ANY(%s)
                  AND status IN ('assigned', 'in_progress')
                GROUP BY assigned_to
            """

            results = self.db.execute_query(query, (user_ids,))

            # Build workload dict (default to 0 for users with no tasks)
            workloads = {user_id: 0 for user_id in user_ids}

            for row in results or []:
                workloads[row["assigned_to"]] = row["task_count"]

            return workloads

        except Exception as e:
            logger.error(f"Failed to get user workloads: {e}")
            # Return equal workload on error (will use round-robin-like behavior)
            return {user_id: 0 for user_id in user_ids}

    def _execute_assignment(self, task_id: str, assigned_to: str, assigned_by: str, method: AssignmentMethod):
        """
        Execute the actual task assignment in database

        Args:
            task_id: Task to assign
            assigned_to: User to assign to
            assigned_by: User making assignment
            method: Assignment method used
        """
        try:
            # Update task
            query = """
                UPDATE tasks
                SET assigned_to = %s,
                    status = 'assigned',
                    assignment_method = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING process_instance_id
            """

            result = self.db.execute_command(query, (assigned_to, method.value, task_id), returning=True)

            if not result:
                raise ValueError(f"Task {task_id} not found")

            # Record assignment in history
            self.db.execute_command(
                """
                INSERT INTO task_assignments (
                    task_id,
                    assigned_to,
                    assigned_by,
                    assignment_method
                )
                VALUES (%s, %s, %s, %s)
                """,
                (task_id, assigned_to, assigned_by, method.value),
            )

            # Log event
            self.db.execute_command(
                """
                INSERT INTO process_events (
                    process_instance_id,
                    task_id,
                    event_type,
                    event_category,
                    user_id,
                    message,
                    details,
                    automated
                )
                VALUES (%s, %s, 'task_assigned', 'assignment', %s, %s, %s, true)
                """,
                (
                    result["process_instance_id"],
                    task_id,
                    assigned_by,
                    f"Task assigned to {assigned_to} via {method.value}",
                    {"method": method.value, "assigned_to": assigned_to},
                ),
            )

        except Exception as e:
            logger.error(f"Failed to execute assignment: {e}")
            raise

    def reassign_task(self, task_id: str, new_assignee: str, reassigned_by: str, reason: str) -> Dict[str, Any]:
        """
        Reassign a task to a different user

        Args:
            task_id: Task to reassign
            new_assignee: New user to assign to
            reassigned_by: User making the reassignment
            reason: Reason for reassignment

        Returns:
            Updated task
        """
        try:
            # Get current assignment
            current = self.db.execute_query(
                "SELECT assigned_to, process_instance_id FROM tasks WHERE id = %s", (task_id,), fetch="one"
            )

            if not current:
                raise ValueError(f"Task {task_id} not found")

            # Update task
            query = """
                UPDATE tasks
                SET assigned_to = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
            """

            task = self.db.execute_command(query, (new_assignee, task_id), returning=True)

            # Mark old assignment as reassigned
            self.db.execute_command(
                """
                UPDATE task_assignments
                SET status = 'reassigned'
                WHERE task_id = %s AND status = 'active'
                """,
                (task_id,),
            )

            # Create new assignment record
            self.db.execute_command(
                """
                INSERT INTO task_assignments (
                    task_id,
                    assigned_to,
                    assigned_by,
                    assignment_method,
                    reason
                )
                VALUES (%s, %s, %s, 'manual', %s)
                """,
                (task_id, new_assignee, reassigned_by, reason),
            )

            # Log event
            self.db.execute_command(
                """
                INSERT INTO process_events (
                    process_instance_id,
                    task_id,
                    event_type,
                    event_category,
                    user_id,
                    message,
                    details
                )
                VALUES (%s, %s, 'task_reassigned', 'assignment', %s, %s, %s)
                """,
                (
                    current["process_instance_id"],
                    task_id,
                    reassigned_by,
                    f"Task reassigned from {current['assigned_to']} to {new_assignee}",
                    {"from": current["assigned_to"], "to": new_assignee, "reason": reason},
                ),
            )

            logger.info(f"Task {task_id} reassigned from {current['assigned_to']} to {new_assignee}")
            return task

        except Exception as e:
            logger.error(f"Failed to reassign task: {e}")
            raise

    def get_assignment_stats(self, team: Optional[str] = None) -> Dict[str, Any]:
        """
        Get assignment statistics for analysis

        Args:
            team: Optional team filter

        Returns:
            Assignment statistics
        """
        try:
            # Get assignment method breakdown
            method_query = """
                SELECT
                    assignment_method,
                    COUNT(*) as count
                FROM task_assignments
                WHERE assigned_at > NOW() - INTERVAL '7 days'
                GROUP BY assignment_method
            """

            methods = self.db.execute_query(method_query)

            # Get user workload distribution
            workload_query = """
                SELECT
                    assigned_to,
                    COUNT(*) as active_tasks,
                    AVG(EXTRACT(EPOCH FROM (NOW() - assigned_at))/60) as avg_age_mins
                FROM tasks
                WHERE status IN ('assigned', 'in_progress')
                GROUP BY assigned_to
                ORDER BY active_tasks DESC
            """

            workloads = self.db.execute_query(workload_query)

            # Get reassignment rate
            reassign_query = """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'reassigned') as reassigned,
                    COUNT(*) as total
                FROM task_assignments
                WHERE assigned_at > NOW() - INTERVAL '7 days'
            """

            reassign_stats = self.db.execute_query(reassign_query, fetch="one")

            reassignment_rate = 0
            if reassign_stats and reassign_stats["total"] > 0:
                reassignment_rate = (reassign_stats["reassigned"] / reassign_stats["total"]) * 100

            return {
                "assignment_methods": {row["assignment_method"]: row["count"] for row in (methods or [])},
                "user_workloads": workloads or [],
                "reassignment_rate": round(reassignment_rate, 2),
                "total_reassignments": reassign_stats["reassigned"] if reassign_stats else 0,
            }

        except Exception as e:
            logger.error(f"Failed to get assignment stats: {e}")
            raise
