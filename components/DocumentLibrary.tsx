import React, { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  template_type: string;
  module_id: string;
  atom_ids: string[];
  created_at: string;
  updated_at: string;
  version: number;
  content?: string;
}

interface DocumentLibraryProps {
  onLoadDocument?: (doc: Document) => void;
  moduleId?: string;
}

const DocumentLibrary: React.FC<DocumentLibraryProps> = ({ onLoadDocument, moduleId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [filterTemplateType, setFilterTemplateType] = useState<string>('');

  useEffect(() => {
    loadDocuments();
  }, [moduleId, filterTemplateType]);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (moduleId) params.append('module_id', moduleId);
      if (filterTemplateType) params.append('template_type', filterTemplateType);

      const response = await fetch(`http://localhost:8000/api/documents?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocumentDetails = async (docId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${docId}`);

      if (!response.ok) {
        throw new Error('Failed to load document details');
      }

      const doc = await response.json();
      setSelectedDoc(doc);

      if (onLoadDocument) {
        onLoadDocument(doc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Reload list
      await loadDocuments();

      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    }
  };

  const downloadDocument = async (docId: string, format: 'markdown' | 'html') => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/export/${docId}/${format}`);

      if (!response.ok) {
        throw new Error('Failed to export document');
      }

      const content = await response.text();
      const doc = documents.find(d => d.id === docId);
      const filename = `${doc?.title || 'document'}.${format === 'markdown' ? 'md' : 'html'}`;

      const blob = new Blob([content], { type: format === 'markdown' ? 'text/markdown' : 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export document');
    }
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString();
  };

  const getTemplateIcon = (templateType: string) => {
    switch (templateType) {
      case 'SOP': return '📋';
      case 'TECHNICAL_DESIGN': return '🏗️';
      case 'EXECUTIVE_SUMMARY': return '📊';
      case 'COMPLIANCE_AUDIT': return '✅';
      default: return '📄';
    }
  };

  const getTemplateLabel = (templateType: string) => {
    switch (templateType) {
      case 'SOP': return 'Standard Operating Procedure';
      case 'TECHNICAL_DESIGN': return 'Technical Design';
      case 'EXECUTIVE_SUMMARY': return 'Executive Summary';
      case 'COMPLIANCE_AUDIT': return 'Compliance Audit';
      default: return templateType;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: 'var(--spacing-lg)',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Document List */}
      <div style={{
        flex: '0 0 400px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: 'var(--spacing-md)',
            color: 'var(--color-text-primary)'
          }}>
            Document Library
          </h2>

          {/* Filter */}
          <select
            value={filterTemplateType}
            onChange={(e) => setFilterTemplateType(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            <option value="">All Templates</option>
            <option value="SOP">Standard Operating Procedure</option>
            <option value="TECHNICAL_DESIGN">Technical Design</option>
            <option value="EXECUTIVE_SUMMARY">Executive Summary</option>
            <option value="COMPLIANCE_AUDIT">Compliance Audit</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        {/* Document List */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)'
        }}>
          {documents.length === 0 ? (
            <div style={{
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '14px'
            }}>
              No documents found. Create your first document using the Publisher.
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => loadDocumentDetails(doc.id)}
                style={{
                  padding: 'var(--spacing-md)',
                  border: `1px solid ${selectedDoc?.id === doc.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: '6px',
                  backgroundColor: selectedDoc?.id === doc.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--color-bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedDoc?.id !== doc.id) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDoc?.id !== doc.id) {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                  <span style={{ fontSize: '20px' }}>{getTemplateIcon(doc.template_type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '14px',
                      marginBottom: '4px',
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {doc.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '4px'
                    }}>
                      {getTemplateLabel(doc.template_type)}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      Updated {formatDate(doc.updated_at)} • v{doc.version}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Preview/Actions */}
      {selectedDoc && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            paddingBottom: 'var(--spacing-md)',
            borderBottom: '1px solid var(--color-border)'
          }}>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '4px',
                color: 'var(--color-text-primary)'
              }}>
                {selectedDoc.title}
              </h3>
              <div style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)'
              }}>
                {getTemplateLabel(selectedDoc.template_type)} • Module: {selectedDoc.module_id}
              </div>
              <div style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                marginTop: '4px'
              }}>
                Created {formatDate(selectedDoc.created_at)} • {selectedDoc.atom_ids.length} atoms
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={() => downloadDocument(selectedDoc.id, 'markdown')}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Download MD
              </button>
              <button
                onClick={() => downloadDocument(selectedDoc.id, 'html')}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Download HTML
              </button>
              <button
                onClick={() => deleteDocument(selectedDoc.id)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#ef4444',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Content Preview */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: '6px',
            border: '1px solid var(--color-border)'
          }}>
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontSize: '13px',
              lineHeight: '1.6',
              margin: 0,
              color: 'var(--color-text-primary)'
            }}>
              {selectedDoc.content || 'No content available'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
