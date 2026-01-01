"""
Conflict Resolution Service

Handles merge conflicts for collaborative editing using three-way merge algorithm.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional


class ConflictType:
    """Types of conflicts"""

    NO_CONFLICT = "no_conflict"
    CLEAN_MERGE = "clean_merge"
    FIELD_CONFLICT = "field_conflict"
    TYPE_CONFLICT = "type_conflict"


class MergeResult:
    """Result of a merge operation"""

    def __init__(
        self,
        success: bool,
        merged_data: Dict[str, Any],
        conflicts: List[Dict[str, Any]],
        conflict_type: str = ConflictType.NO_CONFLICT,
    ):
        self.success = success
        self.merged_data = merged_data
        self.conflicts = conflicts
        self.conflict_type = conflict_type
        self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "merged_data": self.merged_data,
            "conflicts": self.conflicts,
            "conflict_type": self.conflict_type,
            "timestamp": self.timestamp,
        }


class ConflictResolver:
    """
    Three-way merge conflict resolver for atom data

    Uses the following algorithm:
    1. If local == remote: no conflict (both made same change)
    2. If local == base: accept remote (only remote changed)
    3. If remote == base: accept local (only local changed)
    4. Otherwise: conflict (both changed differently)
    """

    def __init__(self):
        self.merge_strategies = {
            "last_write_wins": self._last_write_wins,
            "field_level": self._field_level_merge,
            "three_way": self._three_way_merge,
        }

    def merge(
        self,
        base: Dict[str, Any],
        local: Dict[str, Any],
        remote: Dict[str, Any],
        strategy: str = "three_way",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MergeResult:
        """
        Merge three versions of atom data

        Args:
            base: Common ancestor version
            local: Local changes
            remote: Remote changes
            strategy: Merge strategy to use
            metadata: Additional context (user info, timestamps, etc.)

        Returns:
            MergeResult with merged data and conflicts
        """
        if strategy not in self.merge_strategies:
            raise ValueError(f"Unknown merge strategy: {strategy}")

        return self.merge_strategies[strategy](base, local, remote, metadata)

    def _last_write_wins(
        self,
        base: Dict[str, Any],
        local: Dict[str, Any],
        remote: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MergeResult:
        """
        Simple last-write-wins strategy

        Uses timestamp to determine winner. If no timestamps provided,
        defaults to remote (server version).
        """
        if not metadata:
            # No metadata, default to remote
            return MergeResult(success=True, merged_data=remote, conflicts=[], conflict_type=ConflictType.NO_CONFLICT)

        local_timestamp = metadata.get("local_timestamp", "")
        remote_timestamp = metadata.get("remote_timestamp", "")

        if local_timestamp > remote_timestamp:
            winner = local
            conflicts = [
                {
                    "field": "entire_document",
                    "resolution": "local_wins",
                    "reason": f"Local timestamp ({local_timestamp}) > Remote timestamp ({remote_timestamp})",
                }
            ]
        else:
            winner = remote
            conflicts = [
                {
                    "field": "entire_document",
                    "resolution": "remote_wins",
                    "reason": f"Remote timestamp ({remote_timestamp}) >= Local timestamp ({local_timestamp})",
                }
            ]

        return MergeResult(
            success=True, merged_data=winner, conflicts=conflicts, conflict_type=ConflictType.CLEAN_MERGE
        )

    def _field_level_merge(
        self,
        base: Dict[str, Any],
        local: Dict[str, Any],
        remote: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MergeResult:
        """
        Field-level merge strategy

        Merges fields independently. If a field is changed in only one version,
        that change wins. If changed in both, it's a conflict.
        """
        merged = {}
        conflicts = []

        # Get all fields from all versions
        all_fields = set(base.keys()) | set(local.keys()) | set(remote.keys())

        for field in all_fields:
            base_val = base.get(field)
            local_val = local.get(field)
            remote_val = remote.get(field)

            if local_val == remote_val:
                # Both agree, use that value
                merged[field] = local_val
            elif local_val == base_val:
                # Only remote changed, use remote
                merged[field] = remote_val
            elif remote_val == base_val:
                # Only local changed, use local
                merged[field] = local_val
            else:
                # Both changed differently - conflict
                merged[field] = local_val  # Default to local
                conflicts.append(
                    {
                        "field": field,
                        "base_value": base_val,
                        "local_value": local_val,
                        "remote_value": remote_val,
                        "resolution": "local_chosen",
                        "reason": "Both versions modified this field differently",
                    }
                )

        conflict_type = ConflictType.FIELD_CONFLICT if conflicts else ConflictType.CLEAN_MERGE

        return MergeResult(
            success=len(conflicts) == 0, merged_data=merged, conflicts=conflicts, conflict_type=conflict_type
        )

    def _three_way_merge(
        self,
        base: Dict[str, Any],
        local: Dict[str, Any],
        remote: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MergeResult:
        """
        Three-way merge algorithm

        Most sophisticated merge strategy. Attempts to automatically resolve
        conflicts by understanding the intent of each change.
        """
        merged = {}
        conflicts = []

        # Get all fields
        all_fields = set(base.keys()) | set(local.keys()) | set(remote.keys())

        for field in all_fields:
            base_val = base.get(field)
            local_val = local.get(field)
            remote_val = remote.get(field)

            # Case 1: No conflict - both agree
            if local_val == remote_val:
                merged[field] = local_val
                continue

            # Case 2: Only remote changed
            if local_val == base_val and remote_val != base_val:
                merged[field] = remote_val
                continue

            # Case 3: Only local changed
            if remote_val == base_val and local_val != base_val:
                merged[field] = local_val
                continue

            # Case 4: Both changed - check if mergeable
            merge_attempt = self._try_automatic_merge(field, base_val, local_val, remote_val)

            if merge_attempt["success"]:
                merged[field] = merge_attempt["value"]
            else:
                # True conflict - cannot auto-merge
                merged[field] = None  # Mark as conflicted
                conflicts.append(
                    {
                        "field": field,
                        "base_value": base_val,
                        "local_value": local_val,
                        "remote_value": remote_val,
                        "resolution": "manual_required",
                        "reason": merge_attempt["reason"],
                    }
                )

        conflict_type = ConflictType.FIELD_CONFLICT if conflicts else ConflictType.CLEAN_MERGE

        return MergeResult(
            success=len(conflicts) == 0, merged_data=merged, conflicts=conflicts, conflict_type=conflict_type
        )

    def _try_automatic_merge(self, field: str, base_val: Any, local_val: Any, remote_val: Any) -> Dict[str, Any]:
        """
        Attempt to automatically merge a conflicting field

        Returns dict with:
        - success: bool
        - value: merged value (if success)
        - reason: explanation
        """
        # String concatenation for text fields
        if isinstance(base_val, str) and isinstance(local_val, str) and isinstance(remote_val, str):
            # If both added text to the end, concatenate
            if local_val.startswith(base_val) and remote_val.startswith(base_val):
                local_addition = local_val[len(base_val) :]
                remote_addition = remote_val[len(base_val) :]

                return {
                    "success": True,
                    "value": base_val + local_addition + remote_addition,
                    "reason": "Concatenated non-overlapping text additions",
                }

        # List merging
        if isinstance(base_val, list) and isinstance(local_val, list) and isinstance(remote_val, list):
            # Merge lists by combining additions
            local_additions = [item for item in local_val if item not in base_val]
            remote_additions = [item for item in remote_val if item not in base_val]

            merged_list = base_val + local_additions + remote_additions

            return {"success": True, "value": merged_list, "reason": "Merged list additions from both versions"}

        # Dict merging
        if isinstance(base_val, dict) and isinstance(local_val, dict) and isinstance(remote_val, dict):
            # Recursively merge dicts
            merged_dict = dict(base_val)

            # Apply local changes
            for key, val in local_val.items():
                if key not in base_val or base_val[key] != val:
                    merged_dict[key] = val

            # Apply remote changes (with conflict detection)
            for key, val in remote_val.items():
                if key not in base_val:
                    # New key in remote
                    merged_dict[key] = val
                elif base_val[key] != val and local_val.get(key) != val:
                    # Conflict - both changed same key
                    return {"success": False, "reason": f"Both versions modified nested key '{key}'"}

            return {"success": True, "value": merged_dict, "reason": "Merged dictionary changes"}

        # Cannot auto-merge
        return {"success": False, "reason": "Incompatible changes - manual resolution required"}

    def resolve_manually(
        self, conflict: Dict[str, Any], chosen_value: Any, user_id: str, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a manual conflict resolution

        Args:
            conflict: The conflict being resolved
            chosen_value: The value the user chose
            user_id: User making the resolution
            reason: Optional reason for the choice

        Returns:
            Resolution record
        """
        return {
            "field": conflict["field"],
            "base_value": conflict.get("base_value"),
            "local_value": conflict.get("local_value"),
            "remote_value": conflict.get("remote_value"),
            "chosen_value": chosen_value,
            "resolved_by": user_id,
            "resolved_at": datetime.now().isoformat(),
            "reason": reason or "Manual resolution",
        }

    def get_conflict_summary(self, conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a summary of conflicts

        Args:
            conflicts: List of conflict dicts

        Returns:
            Summary statistics
        """
        return {
            "total_conflicts": len(conflicts),
            "fields_affected": [c["field"] for c in conflicts],
            "manual_resolution_required": sum(1 for c in conflicts if c.get("resolution") == "manual_required"),
            "auto_resolved": sum(1 for c in conflicts if c.get("resolution") != "manual_required"),
        }


# Global instance
_conflict_resolver = ConflictResolver()


def get_conflict_resolver() -> ConflictResolver:
    """Get the global conflict resolver instance"""
    return _conflict_resolver
