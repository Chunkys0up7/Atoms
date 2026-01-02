"""
Mock Database Engine

Provides in-memory data persistence when PostgreSQL is not available.
Mimics the behavior of the SQL database for development and testing.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class MockDatabaseEngine:
    """In-memory mock database"""

    def __init__(self):
        self.processes = {}
        self.tasks = {}
        self.events = []
        self._initialize_sample_data()

    def _initialize_sample_data(self):
        """Load initial sample data"""
        # Create some sample processes
        self._create_sample_process(
            "proc-1", "Onboarding", "HR", "running", "John Doe", 50.0
        )
        self._create_sample_process(
            "proc-2", "Loan Application", "Finance", "completed", "Jane Smith", 100.0
        )
        self._create_sample_process(
            "proc-3", "Security Audit", "IT", "running", "Admin", 25.0
        )
        
        # Create some sample tasks
        self._create_sample_task(
            "task-1", "proc-1", "Verify Documents", "assigned", "user1"
        )
        self._create_sample_task(
            "task-2", "proc-1", "Setup Account", "pending", None
        )
        self._create_sample_task(
            "task-3", "proc-2", "Approve Loan", "completed", "manager1"
        )

    def _create_sample_process(self, pid, name, ptype, status, initiator, progress):
        now = datetime.now()
        process = {
            "id": pid,
            "process_definition_id": f"def-{pid}",
            "process_name": name,
            "process_type": ptype,
            "status": status,
            "progress_percentage": progress,
            "initiated_by": initiator,
            "assigned_to": "system",
            "priority": "medium",
            "sla_status": "on_track",
            "created_at": now - timedelta(days=1),
            "started_at": now - timedelta(days=1),
            "completed_at": now if status == "completed" else None,
            "due_date": now + timedelta(days=2),
            "business_context": {},
        }
        self.processes[pid] = process

    def _create_sample_task(self, tid, pid, name, status, assignee):
        now = datetime.now()
        task = {
            "id": tid,
            "process_instance_id": pid,
            "task_definition_id": f"def-{tid}",
            "task_name": name,
            "task_type": "user_task",
            "status": status,
            "assigned_to": assignee,
            "created_at": now,
            "due_date": now + timedelta(days=1),
            "priority": "high",
            "sla_status": "on_track",
            "input_data": {},
            "output_data": {},
        }
        self.tasks[tid] = task

    def execute_query(
        self, query: str, params: Optional[tuple] = None, fetch: str = "all"
    ) -> Optional[Union[List[Dict[str, Any]], Dict[str, Any]]]:
        """Mock SQL query execution"""
        query = query.strip().upper()
        
        # Basic parsing to route to correct handler
        if "FROM PROCESS_INSTANCES" in query:
            if "COUNT(*)" in query:
                return self._handle_count(self.processes, query, params)
            if "SELECT *" in query and "LIMIT" in query:
                return self._handle_select_list(list(self.processes.values()), query, params)
            if "WHERE ID =" in query:
                return self._handle_select_one(self.processes, params)
            if "AVG(" in query: # Stats
                return self._handle_process_stats()

        if "FROM TASKS" in query:
            if "COUNT(*)" in query and "GROUP BY" in query: # Workload
                 return self._handle_workload_stats()
            if "COUNT(*)" in query:
                return self._handle_count(self.tasks, query, params)
            if "SELECT *" in query and "LIMIT" in query:
                return self._handle_select_list(list(self.tasks.values()), query, params)
            if "WHERE ID =" in query:
                return self._handle_select_one(self.tasks, params)
        
        if "FROM V_MY_TASKS" in query:
             return self._handle_select_list(list(self.tasks.values()), query, params)

        # Default empty return
        if fetch == "one":
            return {}
        return []

    def _handle_count(self, data_source, query, params):
        # Very basic mock filtering
        count = len(data_source)
        return {"count": count}

    def _handle_select_list(self, data_list, query, params):
        # Mock pagination (last two params are usually limit, offset)
        if params and len(params) >= 2:
            limit = params[-2]
            offset = params[-1]
            if isinstance(limit, int) and isinstance(offset, int):
                return data_list[offset : offset + limit]
        return data_list

    def _handle_select_one(self, data_dict, params):
        if params and len(params) > 0:
            return data_dict.get(str(params[0]))
        return None

    def _handle_process_stats(self):
        # Mock stats
        return {
            "total_processes": len(self.processes),
            "running": len([p for p in self.processes.values() if p["status"] == "running"]),
            "completed": len([p for p in self.processes.values() if p["status"] == "completed"]),
            "failed": 0,
            "suspended": 0,
            "sla_breached": 0,
            "avg_progress": 45.0,
            "avg_duration_mins": 120.0,
        }

    def _handle_workload_stats(self):
        # Mock workload
        workload = []
        user_tasks = {}
        for task in self.tasks.values():
            user = task.get("assigned_to")
            if user:
                if user not in user_tasks:
                    user_tasks[user] = {"active": 0, "in_progress": 0}
                user_tasks[user]["active"] += 1
                if task["status"] == "in_progress":
                    user_tasks[user]["in_progress"] += 1
        
        for user, stats in user_tasks.items():
            workload.append({
                "assigned_to": user,
                "active_tasks": stats["active"],
                "in_progress": stats["in_progress"],
                "at_risk": 0,
                "breached": 0
            })
            
        return workload

    def execute_command(self, command, params, returning=False):
        return {}

    def execute_batch(self, command, params_list):
        return len(params_list)
