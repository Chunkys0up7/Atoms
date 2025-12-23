import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants';

interface CommitInfo {
  commit_hash: string;
  author_name: string;
  author_email: string;
  timestamp: string;
  message: string;
  changes_summary?: string;
}

interface AtomLineage {
  atom_id: string;
  file_path: string;
  created_by: string;
  created_at: string;
  last_modified_by: string;
  last_modified_at: string;
  total_commits: number;
  commits: CommitInfo[];
}

interface LineageViewerProps {
  atomId: string;
  onClose: () => void;
}

export default function LineageViewer({ atomId, onClose }: LineageViewerProps) {
  const [lineage, setLineage] = useState<AtomLineage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null);
  const [diff, setDiff] = useState<string | null>(null);

  useEffect(() => {
    loadLineage();
  }, [atomId]);

  const loadLineage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/lineage/atom/${atomId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No git history found for this atom. It may not be committed yet.');
        }
        throw new Error('Failed to load lineage data');
      }

      const data = await response.json();
      setLineage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lineage');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDiff = async (commit: CommitInfo) => {
    setSelectedCommit(commit);
    setDiff(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/lineage/diff/${atomId}/${commit.commit_hash}`
      );

      if (!response.ok) {
        throw new Error('Failed to load diff');
      }

      const data = await response.json();
      setDiff(data.diff);
    } catch (err) {
      console.error('Error loading diff:', err);
      setDiff('Failed to load diff');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
  };

  const getAuthorInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAuthorColor = (email: string) => {
    // Generate consistent color from email
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 50%)`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '1000px',
        width: '90%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--spacing-lg)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
              History & Lineage
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {atomId}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--color-text-tertiary)'
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {isLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 'var(--spacing-xl)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>⚠️</div>
              <div style={{ color: 'var(--color-error)', fontSize: '14px', textAlign: 'center' }}>{error}</div>
              <button onClick={loadLineage} className="btn btn-sm" style={{ marginTop: 'var(--spacing-md)' }}>
                Retry
              </button>
            </div>
          ) : lineage ? (
            <>
              {/* Timeline */}
              <div style={{
                width: '400px',
                borderRight: '1px solid var(--color-border)',
                overflowY: 'auto',
                padding: 'var(--spacing-lg)'
              }}>
                {/* Summary */}
                <div style={{
                  padding: 'var(--spacing-md)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderRadius: '8px',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Created by</div>
                      <div style={{ fontWeight: '600' }}>{lineage.created_by}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                        {formatDate(lineage.created_at)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Last modified</div>
                      <div style={{ fontWeight: '600' }}>{lineage.last_modified_by}</div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                        {formatDate(lineage.last_modified_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    {lineage.total_commits} commit{lineage.total_commits !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Commit timeline */}
                <h3 style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-md)' }}>
                  Commit History
                </h3>

                <div style={{ position: 'relative' }}>
                  {/* Timeline line */}
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '12px',
                    bottom: '12px',
                    width: '2px',
                    backgroundColor: 'var(--color-border)'
                  }}></div>

                  {lineage.commits.map((commit, index) => (
                    <div
                      key={commit.commit_hash}
                      onClick={() => loadDiff(commit)}
                      style={{
                        position: 'relative',
                        padding: 'var(--spacing-sm)',
                        marginBottom: 'var(--spacing-sm)',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        backgroundColor: selectedCommit?.commit_hash === commit.commit_hash ? '#f0f9ff' : 'transparent',
                        border: selectedCommit?.commit_hash === commit.commit_hash ? '1px solid #3b82f6' : '1px solid transparent'
                      }}
                    >
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute',
                        left: '10px',
                        top: '18px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: getAuthorColor(commit.author_email),
                        border: '3px solid white',
                        boxShadow: '0 0 0 1px var(--color-border)'
                      }}></div>

                      <div style={{ marginLeft: '36px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: getAuthorColor(commit.author_email),
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '700'
                            }}
                          >
                            {getAuthorInitials(commit.author_name)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: '600' }}>{commit.author_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                              {formatDate(commit.timestamp)}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            color: 'var(--color-text-tertiary)',
                            padding: '2px 6px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderRadius: '3px'
                          }}>
                            {commit.commit_hash}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
                          {commit.message}
                        </div>
                        {commit.changes_summary && (
                          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                            {commit.changes_summary}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diff view */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                {!selectedCommit ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-tertiary)' }}>
                    <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>📝</div>
                    <div>Select a commit to view changes</div>
                  </div>
                ) : diff === null ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
                    <div className="loading-spinner"></div>
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-md)' }}>
                      Changes in {selectedCommit.commit_hash}
                    </h3>
                    <pre style={{
                      backgroundColor: '#f8fafc',
                      padding: 'var(--spacing-md)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      lineHeight: '1.6',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {diff}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
