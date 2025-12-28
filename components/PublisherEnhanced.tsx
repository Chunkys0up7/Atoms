import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { FileText, Building2, BarChart3, CheckCircle2, Search, Layers, Sparkles, FileOutput, Plus } from 'lucide-react';
import { Atom, Module, DocTemplateType } from '../types';
import { compileDocument } from '../aiService';

interface PublisherProps {
  atoms: Atom[];
  modules: Module[];
}

interface TemplateInfo {
  template_id: string;
  template_name: string;
  title?: string;
  description: string;
  icon?: React.ReactNode;
  sections: Array<{ name: string; description?: string; required?: boolean; order?: number }>;
  example?: string;
  category: string;
  builtin?: boolean;
}

// Icon mapping for template categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  SOP: <FileText className="w-5 h-5" />,
  TECHNICAL: <Building2 className="w-5 h-5" />,
  BUSINESS: <BarChart3 className="w-5 h-5" />,
  COMPLIANCE: <CheckCircle2 className="w-5 h-5" />,
  CUSTOM: <FileText className="w-5 h-5" />
};

interface CompilationStage {
  name: string;
  description: string;
  icon: React.ReactNode;
}

const COMPILATION_STAGES: CompilationStage[] = [
  { name: 'Analyzing', description: 'Reading atom metadata and relationships', icon: <Search className="w-4 h-4" /> },
  { name: 'Structuring', description: 'Building document outline and flow', icon: <Layers className="w-4 h-4" /> },
  { name: 'Generating', description: 'Synthesizing content with AI', icon: <Sparkles className="w-4 h-4" /> },
  { name: 'Formatting', description: 'Applying template and styling', icon: <FileOutput className="w-4 h-4" /> }
];

const PublisherEnhanced: React.FC<PublisherProps> = ({ atoms, modules }) => {
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id || '');
  const [template, setTemplate] = useState<string>('SOP');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledText, setCompiledText] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [showTemplatePreview, setShowTemplatePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [mkdocsPath, setMkdocsPath] = useState<string | null>(null);
  const [ragIndexResult, setRagIndexResult] = useState<any>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const activeModule = modules.find(m => m.id === selectedModuleId);
  const moduleAtoms = atoms.filter(a => activeModule?.atoms.includes(a.id));
  const activeTemplate = templates.find(t => t.template_id === template);

  // Load templates from API on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/templates');
        if (response.ok) {
          const data = await response.json();
          const loadedTemplates = data.templates.map((t: any) => ({
            ...t,
            icon: CATEGORY_ICONS[t.category] || CATEGORY_ICONS.CUSTOM,
            title: t.template_name
          }));
          setTemplates(loadedTemplates);
        } else {
          console.error('Failed to load templates:', response.statusText);
        }
      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const handleCompile = async () => {
    if (!activeModule) {
      setCompileError('Please select a module to compile.');
      return;
    }

    if (moduleAtoms.length === 0) {
      setCompileError('The selected module has no atoms. Please select a different module.');
      return;
    }

    setIsCompiling(true);
    setCompiledText(null);
    setCurrentStage(0);
    setCompileError(null);
    setError(null);

    let stageInterval: NodeJS.Timeout | null = null;

    try {
      // Simulate stages for better UX
      stageInterval = setInterval(() => {
        setCurrentStage(prev => Math.min(prev + 1, COMPILATION_STAGES.length - 1));
      }, 1500);

      const result = await compileDocument(moduleAtoms, activeModule, template);

      if (stageInterval) clearInterval(stageInterval);
      setCurrentStage(COMPILATION_STAGES.length - 1);

      setTimeout(() => {
        setCompiledText(result);
        setIsCompiling(false);
      }, 500);
    } catch (err) {
      if (stageInterval) clearInterval(stageInterval);
      console.error('Compilation error:', err);
      setCompileError(
        err instanceof Error
          ? `Compilation failed: ${err.message}`
          : 'An unexpected error occurred during compilation. Please try again.'
      );
      setIsCompiling(false);
    }
  };

  const handleDownload = (format: 'markdown' | 'html') => {
    if (!compiledText) return;

    if (format === 'markdown') {
      const blob = new Blob([compiledText], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeModule?.id || 'doc'}_${template}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      // Convert markdown to HTML
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeModule?.name || 'Document'} - ${activeTemplate?.template_name || 'Document'}</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Arial, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica', sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 40px auto;
        padding: 0 20px;
        color: #333;
      }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
      font-size: 85%;
    }
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow: auto;
    }
    pre code {
      background-color: transparent;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #dfe2e5;
      padding: 6px 13px;
    }
    th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0;
    }
  </style>
</head>
<body>
${compiledText.split('\n').map(line => {
  // Basic markdown to HTML conversion
  line = line.replace(/^# (.+)$/, '<h1>$1</h1>');
  line = line.replace(/^## (.+)$/, '<h2>$1</h2>');
  line = line.replace(/^### (.+)$/, '<h3>$1</h3>');
  line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  line = line.replace(/\*(.+?)\*/g, '<em>$1</em>');
  line = line.replace(/`(.+?)`/g, '<code>$1</code>');
  return line;
}).join('\n')}
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeModule?.id || 'doc'}_${template}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!compiledText) {
      setError('No content to save. Please compile a document first.');
      return;
    }

    if (!activeModule) {
      setError('No module selected. Please select a module.');
      return;
    }

    const title = documentTitle.trim() || `${activeModule.name} - ${activeTemplate?.template_name || template}`;

    if (title.length < 3) {
      setError('Document title must be at least 3 characters.');
      return;
    }

    if (compiledText.length < 50) {
      setError('Document content is too short. Please compile a proper document.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSavedDocId(null);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          template_type: template,
          module_id: activeModule.id,
          atom_ids: moduleAtoms.map(a => a.id),
          content: compiledText,
          metadata: {
            compiled_at: new Date().toISOString(),
            atom_count: moduleAtoms.length,
            template: template
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const savedDoc = await response.json();

      setSaveSuccess(true);
      setSavedDocId(savedDoc.id);

      // Capture MkDocs sync result
      if (savedDoc.mkdocs_sync?.mkdocs_path) {
        setMkdocsPath(savedDoc.mkdocs_sync.mkdocs_path);
      }

      // Capture RAG indexing result
      if (savedDoc.rag_index) {
        setRagIndexResult(savedDoc.rag_index);
      }

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSaveSuccess(false);
        setSavedDocId(null);
        setMkdocsPath(null);
        setRagIndexResult(null);
      }, 5000);
    } catch (err) {
      console.error('Save error:', err);
      setError(
        err instanceof Error
          ? `Failed to save: ${err.message}`
          : 'An unexpected error occurred while saving. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--color-bg-primary)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-xl)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-secondary)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
              AI Document Compiler
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Synthesize atomic units into cohesive professional artifacts
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Template Selector */}
            {templatesLoading ? (
              <div style={{ padding: '8px 16px', color: 'var(--color-text-secondary)' }}>Loading templates...</div>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', backgroundColor: 'var(--color-bg-tertiary)', padding: '4px', borderRadius: '8px', flexWrap: 'wrap' }}>
                {templates.map(t => (
                  <div key={t.template_id} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setTemplate(t.template_id)}
                      onMouseEnter={() => setShowTemplatePreview(t.template_id)}
                      onMouseLeave={() => setShowTemplatePreview(null)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        cursor: 'pointer',
                        backgroundColor: template === t.template_id ? 'var(--color-primary)' : 'transparent',
                        color: template === t.template_id ? 'white' : 'var(--color-text-secondary)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {t.icon} {t.template_id.replace(/_/g, ' ')}
                      {!t.builtin && <Plus className="w-3 h-3" />}
                    </button>

                    {/* Template Preview Tooltip */}
                    {showTemplatePreview === t.template_id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '8px',
                        width: '280px',
                        backgroundColor: 'white',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        padding: 'var(--spacing-md)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 1000
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                          {t.template_name}
                          {!t.builtin && <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--color-primary)', backgroundColor: 'var(--color-bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>CUSTOM</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                          {t.description}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px', fontWeight: '600' }}>
                          Includes:
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {t.sections.map(s => typeof s === 'string' ? s : s.name).join(' • ')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Compile Button */}
            <button
              onClick={handleCompile}
              disabled={isCompiling || !selectedModuleId}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: '10px 20px'
              }}
            >
              {isCompiling ? (
                <>
                  <div className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                  Compiling...
                </>
              ) : (
                <>
                  <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Compile {activeTemplate?.icon}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compilation Progress */}
        {isCompiling && (
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              {COMPILATION_STAGES.map((stage, idx) => (
                <div key={idx} style={{
                  flex: 1,
                  textAlign: 'center',
                  opacity: idx <= currentStage ? 1 : 0.3,
                  transition: 'opacity 0.3s'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stage.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: idx === currentStage ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
                    {stage.name}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                    {stage.description}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: '4px', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--color-primary)',
                width: `${((currentStage + 1) / COMPILATION_STAGES.length) * 100}%`,
                transition: 'width 0.5s ease-out'
              }} />
            </div>
          </div>
        )}

        {/* Error Notifications */}
        {(error || compileError) && (
          <div style={{
            marginTop: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'start',
            gap: 'var(--spacing-sm)'
          }}>
            <svg style={{ width: '20px', height: '20px', flexShrink: 0, color: '#c00' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#c00', marginBottom: '4px' }}>Error</div>
              <div style={{ fontSize: '13px', color: '#c00' }}>{error || compileError}</div>
            </div>
            <button
              onClick={() => { setError(null); setCompileError(null); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#c00',
                opacity: 0.7
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Success Notification */}
        {saveSuccess && (
          <div style={{
            marginTop: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'start',
            gap: 'var(--spacing-sm)'
          }}>
            <svg style={{ width: '20px', height: '20px', flexShrink: 0, color: '#0a0' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a0', marginBottom: '4px' }}>Document Saved & Published!</div>
              <div style={{ fontSize: '13px', color: '#060' }}>
                Your document has been saved to the library{mkdocsPath && ' and synced to MkDocs'}.
                {savedDocId && (
                  <span> Document ID: <code style={{ fontSize: '12px', backgroundColor: '#dfd', padding: '2px 6px', borderRadius: '3px' }}>{savedDocId}</code></span>
                )}
                {mkdocsPath && (
                  <div style={{ marginTop: '4px', fontSize: '12px' }}>
                    📚 Published to: <code style={{ fontSize: '11px', backgroundColor: '#dfd', padding: '2px 6px', borderRadius: '3px' }}>{mkdocsPath}</code>
                  </div>
                )}
                {ragIndexResult && ragIndexResult.status === 'indexed' && (
                  <div style={{ marginTop: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🤖</span>
                    <span>
                      Indexed in RAG system
                      {ragIndexResult.strategy === 'chunked' ? (
                        <span> ({ragIndexResult.chunks_indexed} semantic chunks)</span>
                      ) : (
                        <span> (full document)</span>
                      )}
                    </span>
                  </div>
                )}
                {ragIndexResult && ragIndexResult.status === 'failed' && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#c60' }}>
                    ⚠️ RAG indexing failed - document not searchable in AI Assistant
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Module Picker */}
        <div style={{
          width: '320px',
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          padding: 'var(--spacing-lg)',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--spacing-md)' }}>
            Select Scope
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {modules.map(mod => (
              <button
                key={mod.id}
                onClick={() => setSelectedModuleId(mod.id)}
                style={{
                  textAlign: 'left',
                  padding: 'var(--spacing-md)',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedModuleId === mod.id ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: selectedModuleId === mod.id ? 'var(--color-primary-light)' : 'var(--color-bg-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                  {mod.id}
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: selectedModuleId === mod.id ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>
                  {mod.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  {mod.atoms.length} atoms in scope
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Preview */}
        <div style={{ flex: 1, backgroundColor: 'var(--color-bg-primary)', padding: 'var(--spacing-xl)', overflowY: 'auto' }}>
          {compiledText ? (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--spacing-lg)',
                paddingBottom: 'var(--spacing-md)',
                borderBottom: '1px solid var(--color-border)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Compiled Output</h3>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Document title (optional)"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    style={{
                      flex: '1 1 200px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      backgroundColor: saveSuccess ? '#10b981' : 'var(--color-primary)',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={saveSuccess ? "M5 13l4 4L19 7" : "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"} />
                    </svg>
                    {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to Library'}
                  </button>
                  <button
                    onClick={() => handleDownload('markdown')}
                    className="btn btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download MD
                  </button>
                  <button
                    onClick={() => handleDownload('html')}
                    className="btn btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                  >
                    <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download HTML
                  </button>
                </div>
              </div>

              {/* Properly Rendered Markdown */}
              <div style={{
                backgroundColor: 'white',
                padding: 'var(--spacing-xl)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props: any) {
                      const {node, inline, className, children, ...rest} = props;
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={oneDark as any}
                          language={match[1]}
                          PreTag="div"
                          {...rest}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...rest}>
                          {children}
                        </code>
                      );
                    },
                    h1: ({node, ...props}) => <h1 style={{ fontSize: '28px', fontWeight: '700', marginTop: 'var(--spacing-xl)', marginBottom: 'var(--spacing-md)', borderBottom: '2px solid var(--color-border)', paddingBottom: 'var(--spacing-sm)' }} {...props} />,
                    h2: ({node, ...props}) => <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }} {...props} />,
                    h3: ({node, ...props}) => <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }} {...props} />,
                    p: ({node, ...props}) => <p style={{ lineHeight: '1.6', marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)' }} {...props} />,
                    ul: ({node, ...props}) => <ul style={{ marginLeft: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }} {...props} />,
                    ol: ({node, ...props}) => <ol style={{ marginLeft: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }} {...props} />,
                    li: ({node, ...props}) => <li style={{ marginBottom: 'var(--spacing-xs)', lineHeight: '1.6' }} {...props} />,
                    blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid var(--color-primary)', paddingLeft: 'var(--spacing-md)', marginLeft: 0, color: 'var(--color-text-secondary)', fontStyle: 'italic' }} {...props} />,
                    table: ({node, ...props}) => <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 'var(--spacing-md)' }} {...props} />,
                    th: ({node, ...props}) => <th style={{ border: '1px solid var(--color-border)', padding: 'var(--spacing-sm)', backgroundColor: 'var(--color-bg-tertiary)', textAlign: 'left', fontWeight: '600' }} {...props} />,
                    td: ({node, ...props}) => <td style={{ border: '1px solid var(--color-border)', padding: 'var(--spacing-sm)' }} {...props} />,
                  }}
                >
                  {compiledText}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '2px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <svg style={{ width: '40px', height: '40px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>
                Compiler Ready
              </h3>
              <p style={{ fontSize: '14px', maxWidth: '400px', marginBottom: 'var(--spacing-md)' }}>
                Select a module and template type, then click Compile to generate a professional document.
              </p>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {selectedModuleId ? (
                  <>
                    <strong>{moduleAtoms.length} atoms</strong> ready to compile from <strong>{activeModule?.name}</strong>
                  </>
                ) : (
                  'Select a module to get started'
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublisherEnhanced;
