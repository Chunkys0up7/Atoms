from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pathlib import Path
import subprocess
import psutil
import os
import signal
from typing import Optional, Dict, Any

router = APIRouter()

# Global MkDocs process reference
_mkdocs_process: Optional[subprocess.Popen] = None
MKDOCS_PORT = 8001
MKDOCS_HOST = "127.0.0.1"


def get_mkdocs_dir() -> Path:
    """Get the docs directory containing mkdocs.yml"""
    # MkDocs config is in the project root
    base = Path(__file__).parent.parent.parent
    return base


def is_mkdocs_running() -> bool:
    """Check if MkDocs server is running on the configured port."""
    # Check if we have a process reference and it's still running
    if _mkdocs_process and _mkdocs_process.poll() is None:
        return True

    # Check if any process is using the MkDocs port
    for conn in psutil.net_connections(kind='inet'):
        if conn.laddr.port == MKDOCS_PORT and conn.status == 'LISTEN':
            return True

    return False


def get_mkdocs_pid() -> Optional[int]:
    """Get the PID of the running MkDocs process."""
    if _mkdocs_process and _mkdocs_process.poll() is None:
        return _mkdocs_process.pid

    # Try to find the process by port
    for conn in psutil.net_connections(kind='inet'):
        if conn.laddr.port == MKDOCS_PORT and conn.status == 'LISTEN':
            return conn.pid

    return None


@router.get("/api/mkdocs/status")
def get_mkdocs_status() -> Dict[str, Any]:
    """Get the current status of the MkDocs server."""
    running = is_mkdocs_running()
    pid = get_mkdocs_pid() if running else None

    return {
        'running': running,
        'pid': pid,
        'url': f"http://{MKDOCS_HOST}:{MKDOCS_PORT}" if running else None,
        'port': MKDOCS_PORT,
        'host': MKDOCS_HOST
    }


@router.post("/api/mkdocs/start")
def start_mkdocs() -> Dict[str, Any]:
    """Start the MkDocs development server."""
    global _mkdocs_process

    if is_mkdocs_running():
        return {
            'status': 'already_running',
            'message': f'MkDocs server already running on port {MKDOCS_PORT}',
            'url': f"http://{MKDOCS_HOST}:{MKDOCS_PORT}"
        }

    mkdocs_dir = get_mkdocs_dir()

    if not (mkdocs_dir / "mkdocs.yml").exists():
        raise HTTPException(
            status_code=500,
            detail=f"mkdocs.yml not found in {mkdocs_dir}"
        )

    try:
        # Start MkDocs server
        _mkdocs_process = subprocess.Popen(
            [
                'mkdocs', 'serve',
                '--dev-addr', f'{MKDOCS_HOST}:{MKDOCS_PORT}',
                '--no-livereload'  # Disable livereload to prevent conflicts
            ],
            cwd=str(mkdocs_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )

        # Give it a moment to start
        import time
        time.sleep(2)

        # Check if it started successfully
        if _mkdocs_process.poll() is not None:
            # Process ended immediately, something went wrong
            stdout, stderr = _mkdocs_process.communicate()
            raise HTTPException(
                status_code=500,
                detail=f"Failed to start MkDocs: {stderr.decode()}"
            )

        return {
            'status': 'started',
            'message': f'MkDocs server started on port {MKDOCS_PORT}',
            'url': f"http://{MKDOCS_HOST}:{MKDOCS_PORT}",
            'pid': _mkdocs_process.pid
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="MkDocs not installed. Install with: pip install mkdocs mkdocs-material"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start MkDocs: {str(e)}"
        )


@router.post("/api/mkdocs/stop")
def stop_mkdocs() -> Dict[str, str]:
    """Stop the MkDocs development server."""
    global _mkdocs_process

    if not is_mkdocs_running():
        return {
            'status': 'not_running',
            'message': 'MkDocs server is not running'
        }

    try:
        pid = get_mkdocs_pid()

        if pid:
            process = psutil.Process(pid)

            # Terminate gracefully
            if os.name == 'nt':
                # Windows: use CTRL_BREAK_EVENT
                process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                # Unix: use SIGTERM
                process.terminate()

            # Wait for process to end
            try:
                process.wait(timeout=5)
            except psutil.TimeoutExpired:
                # Force kill if it doesn't stop gracefully
                process.kill()

        _mkdocs_process = None

        return {
            'status': 'stopped',
            'message': 'MkDocs server stopped successfully'
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop MkDocs: {str(e)}"
        )


@router.post("/api/mkdocs/restart")
def restart_mkdocs() -> Dict[str, Any]:
    """Restart the MkDocs development server."""
    if is_mkdocs_running():
        stop_mkdocs()

    import time
    time.sleep(1)

    return start_mkdocs()


@router.post("/api/mkdocs/build")
def build_mkdocs() -> Dict[str, str]:
    """Build the static MkDocs site."""
    mkdocs_dir = get_mkdocs_dir()

    try:
        # Run mkdocs build
        result = subprocess.run(
            ['mkdocs', 'build', '--clean'],
            cwd=str(mkdocs_dir),
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Build failed: {result.stderr}"
            )

        site_dir = mkdocs_dir / "site"

        return {
            'status': 'success',
            'message': 'MkDocs site built successfully',
            'output_dir': str(site_dir),
            'stdout': result.stdout
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=500,
            detail="Build timed out after 60 seconds"
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="MkDocs not installed. Install with: pip install mkdocs mkdocs-material"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build MkDocs: {str(e)}"
        )
