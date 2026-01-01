"""
Standardized error response models for GNDP API.

Provides consistent error formatting across all API endpoints.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ErrorCode(str, Enum):
    """Standard error codes for API responses."""

    # Client errors (4xx)
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    ALREADY_EXISTS = "ALREADY_EXISTS"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    BAD_REQUEST = "BAD_REQUEST"

    # Server errors (5xx)
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    DATABASE_ERROR = "DATABASE_ERROR"
    FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR"


class ErrorDetail(BaseModel):
    """Detailed error information for specific field or validation errors."""

    field: Optional[str] = Field(None, description="Field name that caused the error")
    message: str = Field(..., description="Human-readable error message")
    code: Optional[str] = Field(None, description="Machine-readable error code")

    class Config:
        json_schema_extra = {"example": {"field": "email", "message": "Invalid email format", "code": "INVALID_FORMAT"}}


class ErrorResponse(BaseModel):
    """
    Standardized error response format.

    Used across all API endpoints for consistent error reporting.
    Follows RFC 7807 Problem Details for HTTP APIs.
    """

    success: bool = Field(False, description="Always false for error responses")
    error: str = Field(..., description="Error code (machine-readable)")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[List[ErrorDetail]] = Field(None, description="Additional error details")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO 8601 timestamp")
    path: Optional[str] = Field(None, description="API endpoint path where error occurred")
    request_id: Optional[str] = Field(None, description="Request tracking ID")

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "VALIDATION_ERROR",
                "message": "Invalid input data",
                "details": [{"field": "atom_id", "message": "Atom ID must be alphanumeric", "code": "INVALID_FORMAT"}],
                "timestamp": "2025-12-25T10:30:00Z",
                "path": "/api/atoms",
                "request_id": "req_123abc",
            }
        }


class SuccessResponse(BaseModel):
    """Standardized success response format."""

    success: bool = Field(True, description="Always true for successful responses")
    data: Any = Field(..., description="Response data")
    message: Optional[str] = Field(None, description="Optional success message")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="ISO 8601 timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {"id": "ATOM-001", "name": "Example Atom"},
                "message": "Atom created successfully",
                "timestamp": "2025-12-25T10:30:00Z",
            }
        }


def create_error_response(
    error_code: ErrorCode,
    message: str,
    details: Optional[List[ErrorDetail]] = None,
    path: Optional[str] = None,
    request_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        error_code: Machine-readable error code
        message: Human-readable error message
        details: Optional list of detailed error information
        path: API endpoint path
        request_id: Request tracking ID

    Returns:
        Dictionary formatted as ErrorResponse

    Example:
        >>> error = create_error_response(
        ...     ErrorCode.NOT_FOUND,
        ...     "Atom 'ATOM-123' not found",
        ...     path="/api/atoms/ATOM-123"
        ... )
    """
    response = ErrorResponse(error=error_code.value, message=message, details=details, path=path, request_id=request_id)
    return response.model_dump()


def create_success_response(data: Any, message: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a standardized success response.

    Args:
        data: Response data
        message: Optional success message

    Returns:
        Dictionary formatted as SuccessResponse

    Example:
        >>> response = create_success_response(
        ...     data={"atoms": [...]},
        ...     message="Retrieved 10 atoms"
        ... )
    """
    response = SuccessResponse(data=data, message=message)
    return response.model_dump()
