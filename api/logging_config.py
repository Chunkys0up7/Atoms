"""
Logging configuration for GNDP API.

Provides structured logging with sensitive field masking.
"""

import logging
import re
from typing import Any

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Patterns to mask in log messages
SENSITIVE_PATTERNS = [
    (re.compile(r'(api[_-]?key["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(token["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(password["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'(secret["\']?\s*[:=]\s*["\']?)([^"\'}\s]+)', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE), 'Bearer ***REDACTED***'),
]


class SensitiveDataFilter(logging.Filter):
    """Filter to mask sensitive data in log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Mask sensitive patterns in log message."""
        if record.msg:
            message = str(record.msg)
            for pattern, replacement in SENSITIVE_PATTERNS:
                message = pattern.sub(replacement, message)
            record.msg = message

        if record.args:
            # Mask args if they're strings
            masked_args = []
            for arg in record.args:
                if isinstance(arg, str):
                    for pattern, replacement in SENSITIVE_PATTERNS:
                        arg = pattern.sub(replacement, arg)
                masked_args.append(arg)
            record.args = tuple(masked_args)

        return True


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with sensitive data filtering.

    Args:
        name: Logger name (typically __name__ of calling module)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.addFilter(SensitiveDataFilter())
    return logger


def mask_sensitive_data(data: Any) -> Any:
    """
    Mask sensitive data in dictionaries or strings.

    Args:
        data: Data to mask (dict, str, or other)

    Returns:
        Data with sensitive fields masked
    """
    if isinstance(data, dict):
        masked = {}
        sensitive_keys = {'api_key', 'apikey', 'token', 'password', 'secret', 'auth', 'authorization'}
        for key, value in data.items():
            if key.lower() in sensitive_keys:
                masked[key] = '***REDACTED***'
            elif isinstance(value, dict):
                masked[key] = mask_sensitive_data(value)
            elif isinstance(value, str):
                for pattern, replacement in SENSITIVE_PATTERNS:
                    value = pattern.sub(replacement, value)
                masked[key] = value
            else:
                masked[key] = value
        return masked
    elif isinstance(data, str):
        for pattern, replacement in SENSITIVE_PATTERNS:
            data = pattern.sub(replacement, data)
        return data
    else:
        return data
