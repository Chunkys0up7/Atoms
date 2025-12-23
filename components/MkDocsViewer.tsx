import React, { useState, useEffect } from 'react';

interface MkDocsStatus {
  running: boolean;
  pid: number | null;
  url: string | null;
  port: number;
  host: string;
}

const MkDocsViewer: React.FC = () => {
  const [status, setStatus] = useState<MkDocsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/status');

      if (!response.ok) {
        throw new Error('Failed to check MkDocs status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  const startMkDocs = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/start', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start MkDocs');
      }

      // Wait a bit for server to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh status
      await checkStatus();

      // Force iframe reload
      setIframeKey(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start MkDocs');
    } finally {
      setIsStarting(false);
    }
  };

  const stopMkDocs = async () => {
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/stop', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to stop MkDocs');
      }

      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop MkDocs');
    }
  };

  const restartMkDocs = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/restart', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restart MkDocs');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkStatus();
      setIframeKey(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart MkDocs');
    } finally {
      setIsStarting(false);
    }
  };

  const reloadIframe = () => {
    setIframeKey(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-md)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--color-border)',
          borderTop: '4px solid var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Checking MkDocs status...
        </div>
      </div>
    );
  }

  if (!status?.running) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-xl)'
      }}>
        <div style={{
          fontSize: '48px',
          opacity: 0.5
        }}>
          📚
        </div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '8px',
          color: 'var(--color-text-primary)'
        }}>
          MkDocs Documentation Site
        </h2>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          maxWidth: '500px',
          lineHeight: '1.6'
        }}>
          The documentation site is not currently running. Click the button below to start the MkDocs development server.
        </p>

        {error && (
          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#c00',
            maxWidth: '600px'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={startMkDocs}
          disabled={isStarting}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            color: 'white',
            backgroundColor: isStarting ? '#999' : 'var(--color-primary)',
            border: 'none',
            borderRadius: '8px',
            cursor: isStarting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)'
          }}
        >
          {isStarting ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid white',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Starting...
            </>
          ) : (
            <>
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Documentation Server
            </>
          )}
        </button>

        <div style={{
          fontSize: '12px',
          color: 'var(--color-text-tertiary)',
          textAlign: 'center'
        }}>
          Server will start on {status?.host}:{status?.port}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Control Bar */}
      <div style={{
        padding: 'var(--spacing-md)',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981'
          }} />
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text-primary)' }}>
            Documentation Server Running
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {status.url}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button
            onClick={reloadIframe}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Reload"
          >
            <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button
            onClick={restartMkDocs}
            disabled={isStarting}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: isStarting ? 'not-allowed' : 'pointer',
              opacity: isStarting ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Restart"
          >
            <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restart
          </button>

          <button
            onClick={stopMkDocs}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              color: '#ef4444',
              backgroundColor: 'var(--color-bg-tertiary)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Stop"
          >
            <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          key={iframeKey}
          src={status.url || ''}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          title="MkDocs Documentation"
        />
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MkDocsViewer;
