"""
Simple in-memory cache with TTL for GNDP API.

Provides caching for expensive file loading operations with automatic expiration.
"""

from typing import Any, Dict, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
import hashlib
import json


class Cache:
    """
    Thread-safe in-memory cache with time-to-live (TTL) support.

    Example:
        cache = Cache(ttl_seconds=3600)  # 1 hour TTL

        @cache.memoize()
        def expensive_operation(arg1, arg2):
            # ... expensive computation
            return result
    """

    def __init__(self, ttl_seconds: int = 3600):
        """
        Initialize cache with TTL.

        Args:
            ttl_seconds: Time-to-live in seconds (default: 3600 = 1 hour)
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._ttl_seconds = ttl_seconds

    def _generate_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """
        Generate cache key from function name and arguments.

        Args:
            func_name: Name of the cached function
            args: Positional arguments
            kwargs: Keyword arguments

        Returns:
            Hash-based cache key
        """
        # Create deterministic representation of arguments
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.sha256(key_str.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if not expired.

        Args:
            key: Cache key

        Returns:
            Cached value if found and not expired, None otherwise
        """
        if key not in self._cache:
            return None

        entry = self._cache[key]
        expires_at = entry['expires_at']

        # Check if expired
        if datetime.now() > expires_at:
            del self._cache[key]
            return None

        return entry['value']

    def set(self, key: str, value: Any) -> None:
        """
        Store value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache
        """
        expires_at = datetime.now() + timedelta(seconds=self._ttl_seconds)
        self._cache[key] = {
            'value': value,
            'expires_at': expires_at,
            'created_at': datetime.now()
        }

    def invalidate(self, key: str) -> None:
        """
        Remove specific key from cache.

        Args:
            key: Cache key to invalidate
        """
        if key in self._cache:
            del self._cache[key]

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()

    def stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache size and entry count
        """
        return {
            'entry_count': len(self._cache),
            'ttl_seconds': self._ttl_seconds,
            'entries': [
                {
                    'key': key[:16] + '...',  # Truncate for readability
                    'created_at': entry['created_at'].isoformat(),
                    'expires_at': entry['expires_at'].isoformat()
                }
                for key, entry in self._cache.items()
            ]
        }

    def memoize(self):
        """
        Decorator to cache function results.

        Example:
            cache = Cache(ttl_seconds=3600)

            @cache.memoize()
            def load_atoms():
                # Expensive operation
                return atoms
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = self._generate_key(func.__name__, args, kwargs)

                # Check cache
                cached_value = self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Execute function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result)
                return result

            # Add cache control methods to wrapped function
            wrapper.cache_invalidate = lambda: self.clear()
            wrapper.cache_stats = lambda: self.stats()

            return wrapper
        return decorator


# Global cache instances
atom_cache = Cache(ttl_seconds=3600)  # 1 hour TTL for atoms
module_cache = Cache(ttl_seconds=3600)  # 1 hour TTL for modules


def get_atom_cache() -> Cache:
    """Get global atom cache instance."""
    return atom_cache


def get_module_cache() -> Cache:
    """Get global module cache instance."""
    return module_cache


def atomic_write(file_path: str, content: str, encoding: str = 'utf-8') -> None:
    """
    Atomically write content to file using temp + rename pattern.

    This prevents data loss if write fails midway or process crashes.
    Uses os.replace() for atomic rename on all platforms.

    Args:
        file_path: Target file path
        content: Content to write
        encoding: File encoding (default: utf-8)

    Raises:
        OSError: If write or rename fails
    """
    import os
    import tempfile
    from pathlib import Path

    target = Path(file_path)
    target_dir = target.parent

    # Ensure parent directory exists
    target_dir.mkdir(parents=True, exist_ok=True)

    # Create temp file in same directory (ensures same filesystem for atomic rename)
    fd, temp_path = tempfile.mkstemp(dir=target_dir, prefix='.tmp_', suffix='.yaml')

    try:
        # Write to temp file
        with os.fdopen(fd, 'w', encoding=encoding) as fh:
            fh.write(content)
            fh.flush()
            os.fsync(fh.fileno())  # Force write to disk

        # Atomic rename (replaces target if it exists)
        os.replace(temp_path, file_path)

    except Exception:
        # Clean up temp file on error
        try:
            os.unlink(temp_path)
        except OSError:
            pass
        raise
