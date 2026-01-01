"""
PostgreSQL Client for Workflow Execution Engine

Manages PostgreSQL connections for process state, tasks, and execution history.
"""

import logging
import os
from contextlib import contextmanager
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


class PostgreSQLClient:
    """PostgreSQL database client with connection pooling"""

    _instance: Optional["PostgreSQLClient"] = None
    _pool: Optional[pool.ThreadedConnectionPool] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PostgreSQLClient, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize PostgreSQL connection pool"""
        if self._pool is None:
            self._initialize_pool()

    def _initialize_pool(self):
        """Create connection pool"""
        try:
            # Get connection details from environment
            db_config = {
                "host": os.getenv("POSTGRES_HOST", "localhost"),
                "port": int(os.getenv("POSTGRES_PORT", "5432")),
                "database": os.getenv("POSTGRES_DB", "workflow_db"),
                "user": os.getenv("POSTGRES_USER", "postgres"),
                "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
            }

            # Create connection pool
            self._pool = pool.ThreadedConnectionPool(minconn=2, maxconn=20, **db_config)

            logger.info(
                f"PostgreSQL connection pool created: {db_config['host']}:{db_config['port']}/{db_config['database']}"
            )

        except Exception as e:
            logger.error(f"Failed to create PostgreSQL connection pool: {e}")
            # If the error is because the database does not exist, try to create it
            try:
                if isinstance(e, psycopg2.OperationalError) and "does not exist" in str(e):
                    admin_db = os.getenv("POSTGRES_ADMIN_DB", "postgres")
                    logger.info(
                        f"Attempting to create missing database '{db_config['database']}' using admin DB '{admin_db}'"
                    )

                    # Connect to the admin DB and create the target database
                    admin_conn = psycopg2.connect(
                        host=db_config["host"],
                        port=db_config["port"],
                        user=db_config["user"],
                        password=db_config["password"],
                        dbname=admin_db,
                    )
                    admin_conn.autocommit = True
                    with admin_conn.cursor() as cur:
                        cur.execute(f"CREATE DATABASE \"{db_config['database']}\"")
                    admin_conn.close()

                    # Retry creating the pool
                    self._pool = pool.ThreadedConnectionPool(minconn=2, maxconn=20, **db_config)

                    logger.info(
                        f"PostgreSQL database '{db_config['database']}' created and connection pool established"
                    )
                    return
            except Exception as e2:
                logger.error(f"Failed to create database '{db_config.get('database')}' automatically: {e2}")
                # fall through to raise the original error below

            # If we couldn't create the DB or it's a different error, set pool None and raise
            self._pool = None
            raise

    def is_connected(self) -> bool:
        """Check if connection pool is available"""
        return self._pool is not None

    @contextmanager
    def get_connection(self):
        """
        Get a connection from the pool (context manager)

        Usage:
            with client.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM tasks")
        """
        if not self._pool:
            raise RuntimeError("PostgreSQL connection pool not initialized")

        conn = None
        try:
            conn = self._pool.getconn()
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                self._pool.putconn(conn)

    @contextmanager
    def get_cursor(self, cursor_factory=RealDictCursor):
        """
        Get a cursor (context manager)

        Args:
            cursor_factory: Cursor type (RealDictCursor returns dicts)

        Usage:
            with client.get_cursor() as cursor:
                cursor.execute("SELECT * FROM tasks WHERE id = %s", (task_id,))
                result = cursor.fetchone()
        """
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cursor
            finally:
                cursor.close()

    def execute_query(
        self, query: str, params: Optional[tuple] = None, fetch: str = "all"
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Execute a SELECT query and return results

        Args:
            query: SQL query
            params: Query parameters (tuple)
            fetch: 'all', 'one', or 'none'

        Returns:
            List of dicts for 'all', single dict for 'one', None for 'none'
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())

            if fetch == "all":
                return cursor.fetchall()
            elif fetch == "one":
                return cursor.fetchone()
            else:
                return None

    def execute_command(
        self, command: str, params: Optional[tuple] = None, returning: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Execute an INSERT/UPDATE/DELETE command

        Args:
            command: SQL command
            params: Command parameters (tuple)
            returning: If True, return the RETURNING clause result

        Returns:
            Dict if returning=True, None otherwise
        """
        with self.get_cursor() as cursor:
            cursor.execute(command, params or ())

            if returning:
                return cursor.fetchone()

            return None

    def execute_batch(self, command: str, params_list: List[tuple]) -> int:
        """
        Execute a batch of commands

        Args:
            command: SQL command template
            params_list: List of parameter tuples

        Returns:
            Number of rows affected
        """
        from psycopg2.extras import execute_batch

        with self.get_cursor() as cursor:
            execute_batch(cursor, command, params_list)
            return cursor.rowcount

    def call_function(self, function_name: str, params: Optional[tuple] = None) -> Any:
        """
        Call a PostgreSQL function

        Args:
            function_name: Function name
            params: Function parameters

        Returns:
            Function result
        """
        placeholders = ",".join(["%s"] * len(params or ()))
        query = f"SELECT {function_name}({placeholders})"

        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            result = cursor.fetchone()
            return result[function_name] if result else None

    def initialize_schema(self, schema_file: str = "api/database/schema.sql"):
        """
        Initialize database schema from SQL file

        Args:
            schema_file: Path to schema SQL file
        """
        try:
            # Read schema file
            with open(schema_file, "r") as f:
                schema_sql = f.read()

            # Execute schema
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(schema_sql)
                conn.commit()
                cursor.close()

            logger.info(f"Database schema initialized from {schema_file}")

        except Exception as e:
            logger.error(f"Failed to initialize schema: {e}")
            raise

    def close(self):
        """Close all connections in the pool"""
        if self._pool:
            self._pool.closeall()
            self._pool = None
            logger.info("PostgreSQL connection pool closed")


# Singleton instance
_postgres_client: Optional[PostgreSQLClient] = None


def get_postgres_client() -> PostgreSQLClient:
    """Get singleton PostgreSQL client instance"""
    global _postgres_client

    if _postgres_client is None:
        _postgres_client = PostgreSQLClient()

    return _postgres_client


def close_postgres_client():
    """Close PostgreSQL client"""
    global _postgres_client

    if _postgres_client:
        _postgres_client.close()
        _postgres_client = None
