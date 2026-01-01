import React, { useState, useEffect } from 'react';
import { Search, FileText, Folder, ChevronRight, ChevronDown, X, RefreshCw, Play, Square, Filter, Clock, Tag, Book } from 'lucide-react';

interface MkDocsStatus {
  running: boolean;
  pid: number | null;
  url: string | null;
  port: number;
  host: string;
}

interface Document {
  filename: string;
  title: string;
  template_type: string;
  module: string;
  created: string | null;
  updated: string | null;
  url: string;
  size?: number;
  modified?: string;
  excerpt?: string;
}

interface DocumentMetadata extends Document {
  doc_id?: string;
  atom_ids?: string[];
  approval_status?: string;
  version?: number;
  reviewed_by?: string;
  published_at?: string;
  word_count?: number;
  line_count?: number;
}

interface DocumentTree {
  documents: Document[];
  groups: Record<string, Document[]>;
  total: number;
  by_type: Record<string, number>;
  by_module: Record<string, number>;
}

const MkDocsViewerEnhanced: React.FC = () => {
  const [status, setStatus] = useState<MkDocsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [hasAttemptedAutoStart, setHasAttemptedAutoStart] = useState(false);

  // Document library state
  const [documentTree, setDocumentTree] = useState<DocumentTree | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['recent']));
  const [activeFilter, setActiveFilter] = useState<'all' | 'type' | 'module'>('all');

  // UI state
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);

  // Phase 2: Search & Discovery state
  const [searchMode, setSearchMode] = useState<'basic' | 'semantic'>('basic');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [relatedDocs, setRelatedDocs] = useState<any[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  // Phase 4: Analytics & Insights state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [documentHealth, setDocumentHealth] = useState<any[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    checkStatus();
    loadDocumentTree();
    loadRecentDocuments();
  }, []);

  useEffect(() => {
    if (!isLoading && status && !status.running && !hasAttemptedAutoStart && !isStarting) {
      setHasAttemptedAutoStart(true);
      startMkDocs();
    }
  }, [status, isLoading, hasAttemptedAutoStart, isStarting]);

  useEffect(() => {
    if (searchQuery) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const checkStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/status');
      if (!response.ok) throw new Error('Failed to check MkDocs status');
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocumentTree = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/documents/tree');
      if (!response.ok) throw new Error('Failed to load documents');
      const data = await response.json();
      setDocumentTree(data);
    } catch (err) {
      console.error('Failed to load document tree:', err);
    }
  };

  const loadRecentDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/documents/recent?limit=5');
      if (!response.ok) throw new Error('Failed to load recent documents');
      const data = await response.json();
      setRecentDocs(data);
    } catch (err) {
      console.error('Failed to load recent documents:', err);
    }
  };

  const performSearch = async () => {
    if (searchMode === 'semantic') {
      performSemanticSearch();
    } else {
      try {
        const response = await fetch(`http://localhost:8000/api/mkdocs/documents/search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();
        setSearchResults(data);

        // Phase 4: Track search
        trackSearch(searchQuery, 'basic', data.length);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }
  };

  // Phase 2: Semantic Search
  const performSemanticSearch = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/mkdocs/documents/semantic-search?query=${encodeURIComponent(searchQuery)}&limit=10`);
      if (!response.ok) throw new Error('Semantic search failed');
      const data = await response.json();
      setSemanticResults(data);
      setSearchResults(data); // Also populate regular results for display

      // Phase 4: Track search
      trackSearch(searchQuery, 'semantic', data.length);
    } catch (err) {
      console.error('Semantic search failed:', err);
    }
  };

  // Phase 2: Load Related Documents
  const loadRelatedDocuments = async (filename: string) => {
    setIsLoadingRelated(true);
    try {
      const response = await fetch(`http://localhost:8000/api/mkdocs/documents/${filename}/related?limit=5`);
      if (!response.ok) throw new Error('Failed to load related documents');
      const data = await response.json();
      setRelatedDocs(data);
    } catch (err) {
      console.error('Failed to load related documents:', err);
      setRelatedDocs([]);
    } finally {
      setIsLoadingRelated(false);
    }
  };

  // Phase 2: Load AI Recommendations
  const loadAiRecommendations = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/mkdocs/documents/${filename}/ai-recommendations?limit=5`);
      if (!response.ok) throw new Error('Failed to load AI recommendations');
      const data = await response.json();
      setAiRecommendations(data);
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
      setAiRecommendations(null);
    }
  };

  const loadDocumentMetadata = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/mkdocs/documents/${filename}/metadata`);
      if (!response.ok) throw new Error('Failed to load metadata');
      const data = await response.json();
      setDocumentMetadata(data);
      setShowMetadata(true);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  // Phase 3: Export Document
  const exportDocument = async (format: 'pdf' | 'docx') => {
    if (!selectedDocument) return;

    try {
      const response = await fetch(`http://localhost:8000/api/mkdocs/documents/${selectedDocument.filename}/export/${format}`);
      if (!response.ok) throw new Error(`Export to ${format.toUpperCase()} failed`);

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedDocument.filename.replace('.md', `.${format}`);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(`Export to ${format.toUpperCase()} failed:`, err);
      alert(`Failed to export document to ${format.toUpperCase()}. Make sure the required libraries are installed.`);
    }
  };

  // Phase 4: Analytics functions
  const trackDocumentView = async (filename: string) => {
    try {
      await fetch('http://localhost:8000/api/mkdocs/analytics/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, timestamp: new Date().toISOString() })
      });
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const trackSearch = async (query: string, mode: string, results_count: number) => {
    try {
      await fetch('http://localhost:8000/api/mkdocs/analytics/track-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode, results_count })
      });
    } catch (err) {
      console.error('Failed to track search:', err);
    }
  };

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        fetch('http://localhost:8000/api/mkdocs/analytics/usage-stats'),
        fetch('http://localhost:8000/api/mkdocs/analytics/document-health')
      ]);

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setUsageStats(stats);
      }

      if (healthResponse.ok) {
        const health = await healthResponse.json();
        setDocumentHealth(health);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocument(doc);
    loadDocumentMetadata(doc.filename);

    // Phase 2: Load related documents and AI recommendations
    loadRelatedDocuments(doc.filename);
    loadAiRecommendations(doc.filename);

    // Phase 4: Track document view
    trackDocumentView(doc.filename);

    // Navigate iframe to document
    if (status?.url) {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = `${status.url}${doc.url}`;
      }
    }
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const startMkDocs = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/start', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start MkDocs');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      await checkStatus();
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
      const response = await fetch('http://localhost:8000/api/mkdocs/stop', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop MkDocs');
      await checkStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop MkDocs');
    }
  };

  const restartMkDocs = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/mkdocs/restart', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to restart MkDocs');
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

  const refreshDocuments = () => {
    loadDocumentTree();
    loadRecentDocuments();
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
        <Book size={48} style={{ opacity: 0.5 }} />
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
          {isStarting
            ? 'Starting the MkDocs development server...'
            : 'The documentation site is not currently running. Click the button below to start the MkDocs development server.'}
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
              <Play size={16} />
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
      overflow: 'hidden',
      backgroundColor: 'var(--color-bg-primary)'
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
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {showSidebar ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

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
            onClick={refreshDocuments}
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
            title="Refresh Documents"
          >
            <RefreshCw size={14} />
            Refresh
          </button>

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
            title="Reload Page"
          >
            <RefreshCw size={14} />
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
            title="Restart Server"
          >
            <RefreshCw size={14} />
            Restart
          </button>

          <button
            onClick={() => {
              setShowAnalytics(!showAnalytics);
              if (!showAnalytics) loadAnalytics();
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              color: showAnalytics ? 'white' : 'var(--color-text-primary)',
              backgroundColor: showAnalytics ? '#6366f1' : 'var(--color-bg-tertiary)',
              border: showAnalytics ? '1px solid #6366f1' : '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Analytics Dashboard"
          >
            📊 Analytics
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
            title="Stop Server"
          >
            <Square size={14} />
            Stop
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Document Library Sidebar */}
        {showSidebar && (
          <div style={{
            width: `${sidebarWidth}px`,
            borderRight: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Search Bar */}
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-tertiary)'
                }} />
                <input
                  type="text"
                  placeholder={searchMode === 'semantic' ? "AI-powered semantic search..." : "Search documents..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '13px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)',
                    outline: 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      padding: '2px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-tertiary)'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Phase 2: Search Mode Toggle */}
              <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setSearchMode('basic')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: searchMode === 'basic' ? 'white' : 'var(--color-text-tertiary)',
                    backgroundColor: searchMode === 'basic' ? '#6366f1' : 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Basic
                </button>
                <button
                  onClick={() => setSearchMode('semantic')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: searchMode === 'semantic' ? 'white' : 'var(--color-text-tertiary)',
                    backgroundColor: searchMode === 'semantic' ? '#6366f1' : 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  ✨ AI Search
                </button>
              </div>

              {/* Filter Buttons */}
              <div style={{ display: 'flex', gap: '6px', marginTop: 'var(--spacing-sm)' }}>
                <button
                  onClick={() => setActiveFilter('all')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: activeFilter === 'all' ? 'white' : 'var(--color-text-secondary)',
                    backgroundColor: activeFilter === 'all' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveFilter('type')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: activeFilter === 'type' ? 'white' : 'var(--color-text-secondary)',
                    backgroundColor: activeFilter === 'type' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  By Type
                </button>
                <button
                  onClick={() => setActiveFilter('module')}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: activeFilter === 'module' ? 'white' : 'var(--color-text-secondary)',
                    backgroundColor: activeFilter === 'module' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  By Module
                </button>
              </div>
            </div>

            {/* Document List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-sm)' }}>
              {searchQuery && searchResults.length > 0 ? (
                <>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase',
                    marginBottom: 'var(--spacing-sm)',
                    padding: '0 var(--spacing-sm)'
                  }}>
                    Search Results ({searchResults.length})
                  </div>
                  {searchResults.map((doc, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleDocumentClick(doc)}
                      style={{
                        padding: 'var(--spacing-sm)',
                        marginBottom: '4px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        backgroundColor: selectedDocument?.filename === doc.filename ? 'var(--color-primary-light)' : 'transparent',
                        ':hover': { backgroundColor: 'var(--color-bg-tertiary)' }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
                        <FileText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {doc.title}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--color-text-tertiary)',
                            marginTop: '2px'
                          }}>
                            {doc.template_type}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : !searchQuery ? (
                <>
                  {/* Recent Documents */}
                  {recentDocs.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                      <div
                        onClick={() => toggleGroup('recent')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 'var(--spacing-sm)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {expandedGroups.has('recent') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Clock size={14} />
                        Recent
                      </div>
                      {expandedGroups.has('recent') && recentDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDocumentClick(doc)}
                          style={{
                            padding: 'var(--spacing-sm)',
                            marginLeft: 'var(--spacing-lg)',
                            marginBottom: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: selectedDocument?.filename === doc.filename ? 'var(--color-primary-light)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
                            <FileText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {doc.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* All Documents or Grouped */}
                  {activeFilter === 'all' && documentTree?.documents && (
                    <div>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'var(--color-text-tertiary)',
                        textTransform: 'uppercase',
                        marginBottom: 'var(--spacing-sm)',
                        padding: '0 var(--spacing-sm)'
                      }}>
                        All Documents ({documentTree.total})
                      </div>
                      {documentTree.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDocumentClick(doc)}
                          style={{
                            padding: 'var(--spacing-sm)',
                            marginBottom: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: selectedDocument?.filename === doc.filename ? 'var(--color-primary-light)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
                            <FileText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {doc.title}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                                marginTop: '2px'
                              }}>
                                {doc.template_type}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Group by Type */}
                  {activeFilter === 'type' && documentTree?.by_type && Object.entries(documentTree.by_type).map(([type, count]) => (
                    <div key={type} style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <div
                        onClick={() => toggleGroup(`type_${type}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 'var(--spacing-sm)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {expandedGroups.has(`type_${type}`) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Tag size={14} />
                        {type} ({count})
                      </div>
                      {expandedGroups.has(`type_${type}`) && documentTree.groups[`type_${type}`]?.map((doc, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDocumentClick(doc)}
                          style={{
                            padding: 'var(--spacing-sm)',
                            marginLeft: 'var(--spacing-lg)',
                            marginBottom: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: selectedDocument?.filename === doc.filename ? 'var(--color-primary-light)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
                            <FileText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {doc.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Group by Module */}
                  {activeFilter === 'module' && documentTree?.by_module && Object.entries(documentTree.by_module).map(([module, count]) => (
                    <div key={module} style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <div
                        onClick={() => toggleGroup(`module_${module}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: 'var(--spacing-sm)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {expandedGroups.has(`module_${module}`) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Folder size={14} />
                        {module} ({count})
                      </div>
                      {expandedGroups.has(`module_${module}`) && documentTree.groups[`module_${module}`]?.map((doc, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDocumentClick(doc)}
                          style={{
                            padding: 'var(--spacing-sm)',
                            marginLeft: 'var(--spacing-lg)',
                            marginBottom: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: selectedDocument?.filename === doc.filename ? 'var(--color-primary-light)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
                            <FileText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--color-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {doc.title}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              ) : (
                <div style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '13px'
                }}>
                  No documents found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Viewer */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {showAnalytics ? (
            /* Phase 4: Analytics Dashboard */
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--color-bg-primary)'
            }}>
              <h1 style={{ fontSize: '24px', marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-primary)' }}>
                📊 Analytics & Insights
              </h1>

              {isLoadingAnalytics ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                  Loading analytics...
                </div>
              ) : (
                <>
                  {/* Usage Statistics */}
                  {usageStats && (
                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                      <h2 style={{ fontSize: '18px', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }}>
                        📈 Usage Statistics
                      </h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ fontSize: '32px', fontWeight: '700', color: '#6366f1', marginBottom: '4px' }}>
                            {usageStats.total_views}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            Total Document Views
                          </div>
                        </div>
                        <div style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                            {usageStats.total_documents_viewed}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            Unique Documents Viewed
                          </div>
                        </div>
                        <div style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
                            {usageStats.total_searches}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            Total Searches
                          </div>
                        </div>
                        <div style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ec4899', marginBottom: '4px' }}>
                            {usageStats.recent_activity_count}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                            Views (Last 24h)
                          </div>
                        </div>
                      </div>

                      {/* Top Documents */}
                      {usageStats.top_documents && usageStats.top_documents.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-lg)' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-primary)' }}>
                            🔥 Most Viewed Documents
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {usageStats.top_documents.map((doc: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '12px',
                                  backgroundColor: 'var(--color-bg-secondary)',
                                  borderRadius: '6px',
                                  border: '1px solid var(--color-border)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
                                  {idx + 1}. {doc.filename}
                                </div>
                                <div style={{
                                  padding: '4px 12px',
                                  backgroundColor: '#6366f1',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: 'white'
                                }}>
                                  {doc.views} views
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Searches */}
                      {usageStats.top_searches && usageStats.top_searches.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-lg)' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-primary)' }}>
                            🔍 Top Search Queries
                          </h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {usageStats.top_searches.map((search: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: 'var(--color-bg-secondary)',
                                  borderRadius: '16px',
                                  border: '1px solid var(--color-border)',
                                  fontSize: '12px',
                                  color: 'var(--color-text-primary)'
                                }}
                              >
                                "{search.query}" ({search.count})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Health Metrics */}
                  {documentHealth && documentHealth.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                      <h2 style={{ fontSize: '18px', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }}>
                        🏥 Document Health Metrics
                      </h2>

                      {/* Health Summary */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                        {['excellent', 'good', 'fair', 'poor'].map(status => {
                          const count = documentHealth.filter(d => d.health_status === status).length;
                          const colors: any = {
                            excellent: '#10b981',
                            good: '#3b82f6',
                            fair: '#f59e0b',
                            poor: '#ef4444'
                          };
                          return (
                            <div
                              key={status}
                              style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontSize: '24px', fontWeight: '700', color: colors[status] }}>
                                {count}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                                {status}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Documents List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflow: 'auto' }}>
                        {documentHealth.map((doc: any, idx: number) => {
                          const statusColors: any = {
                            excellent: { bg: '#d1fae5', text: '#047857', border: '#6ee7b7' },
                            good: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
                            fair: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
                            poor: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
                          };
                          const colors = statusColors[doc.health_status] || statusColors.poor;
                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '12px',
                                backgroundColor: 'var(--color-bg-secondary)',
                                borderRadius: '6px',
                                border: '1px solid var(--color-border)'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                                    {doc.title}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                                    {doc.filename}
                                  </div>
                                </div>
                                <div style={{
                                  padding: '4px 12px',
                                  backgroundColor: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: colors.text,
                                  textTransform: 'uppercase'
                                }}>
                                  {doc.health_status}
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '11px' }}>
                                <div>
                                  <div style={{ color: 'var(--color-text-tertiary)' }}>Quality</div>
                                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{doc.quality_score}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--color-text-tertiary)' }}>Freshness</div>
                                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{doc.freshness_score}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--color-text-tertiary)' }}>Days Old</div>
                                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{doc.days_since_update}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--color-text-tertiary)' }}>Views</div>
                                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>{doc.views}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={status.url || ''}
              style={{
                flex: 1,
                border: 'none',
                display: 'block'
              }}
              title="MkDocs Documentation"
            />
          )}

          {/* Metadata Panel */}
          {showMetadata && documentMetadata && (
            <div style={{
              width: '300px',
              borderLeft: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-secondary)',
              overflowY: 'auto',
              padding: 'var(--spacing-md)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-md)'
              }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  margin: 0
                }}>
                  Document Info
                </h3>
                <button
                  onClick={() => setShowMetadata(false)}
                  style={{
                    padding: '4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ fontSize: '13px' }}>
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    TITLE
                  </div>
                  <div style={{ color: 'var(--color-text-primary)' }}>
                    {documentMetadata.title}
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    TYPE
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: 'var(--color-primary-light)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: 'var(--color-primary)'
                  }}>
                    {documentMetadata.template_type}
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    MODULE
                  </div>
                  <div style={{ color: 'var(--color-text-primary)' }}>
                    {documentMetadata.module}
                  </div>
                </div>

                {documentMetadata.atom_ids && documentMetadata.atom_ids.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      LINKED ATOMS ({documentMetadata.atom_ids.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {documentMetadata.atom_ids.slice(0, 5).map((atomId, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderRadius: '3px',
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)'
                          }}
                        >
                          {atomId}
                        </div>
                      ))}
                      {documentMetadata.atom_ids.length > 5 && (
                        <div style={{
                          padding: '2px 6px',
                          fontSize: '11px',
                          color: 'var(--color-text-tertiary)'
                        }}>
                          +{documentMetadata.atom_ids.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {documentMetadata.word_count && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      STATS
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {documentMetadata.word_count} words • {documentMetadata.line_count} lines
                    </div>
                  </div>
                )}

                {documentMetadata.approval_status && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      STATUS
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: documentMetadata.approval_status === 'approved' ? '#d1fae5' : '#fee',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: documentMetadata.approval_status === 'approved' ? '#047857' : '#991b1b'
                    }}>
                      {documentMetadata.approval_status}
                    </div>
                  </div>
                )}

                {documentMetadata.modified && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      LAST MODIFIED
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {new Date(documentMetadata.modified).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Phase 3: Export Actions */}
                <div style={{ marginBottom: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                    📄 EXPORT
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => exportDocument('pdf')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#dc2626',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => exportDocument('docx')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '11px',
                        fontWeight: '500',
                        color: 'white',
                        backgroundColor: '#2563eb',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    >
                      WORD
                    </button>
                  </div>
                </div>

                {/* Phase 2: Related Documents */}
                {relatedDocs.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🔗 RELATED DOCUMENTS ({relatedDocs.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {relatedDocs.map((doc, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleDocumentClick(doc)}
                          style={{
                            padding: '8px',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            border: '1px solid transparent',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                            e.currentTarget.style.borderColor = 'transparent';
                          }}
                        >
                          <div style={{ fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                            {doc.shared_atoms_count > 0 ? `${doc.shared_atoms_count} shared atoms` : doc.relation_type}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phase 2: AI Recommendations */}
                {aiRecommendations && aiRecommendations.recommendations.length > 0 && (
                  <div style={{ marginBottom: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✨ AI RECOMMENDATIONS ({aiRecommendations.recommendations.length})
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                      Analyzed {aiRecommendations.rag_atoms_analyzed} related atoms
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {aiRecommendations.recommendations.map((doc: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => handleDocumentClick(doc)}
                          style={{
                            padding: '8px',
                            backgroundColor: '#f0f9ff',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            border: '1px solid #bae6fd',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e0f2fe';
                            e.currentTarget.style.borderColor = '#0ea5e9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                            e.currentTarget.style.borderColor = '#bae6fd';
                          }}
                        >
                          <div style={{ fontWeight: '500', color: '#0369a1', marginBottom: '4px' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '10px', color: '#0c4a6e' }}>
                            {doc.reason}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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

export default MkDocsViewerEnhanced;
