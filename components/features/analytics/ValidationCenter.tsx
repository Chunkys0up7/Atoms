
import React, { useMemo } from 'react';
import { Atom, Module, LintIssue } from '../../../types';
import { detectCycles, validateEdges, runEnterpriseLinter } from '../../../graphLogic';

interface ValidationCenterProps {
  atoms: Atom[];
  modules: Module[];
  onFocusAtom: (atom: Atom) => void;
}

const ValidationCenter: React.FC<ValidationCenterProps> = ({ atoms, modules, onFocusAtom }) => {
  const graphIssues = useMemo(() => {
    return [...detectCycles(atoms), ...validateEdges(atoms)];
  }, [atoms]);

  const lintIssues = useMemo(() => {
    return runEnterpriseLinter(atoms, modules);
  }, [atoms, modules]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>CI/CD Linter & Health</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>Automated Enterprise Checks. Ensuring semantic consistency and graph integrity across {atoms.length} units.</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
        {/* Graph Integrity Section */}
        <section style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--spacing-md)' }}>Graph Integrity ({graphIssues.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {graphIssues.map((issue, i) => (
              <div key={i} style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: 'var(--spacing-md)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{issue.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Severity: {issue.severity}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {issue.affectedAtoms.map(id => (
                    <button key={id} onClick={() => { const a = atoms.find(x => x.id === id); if (a) onFocusAtom(a); }} style={{ fontSize: '11px', padding: '6px 12px', backgroundColor: '#f8fafc', color: 'var(--color-text-secondary)', borderRadius: '6px', border: '1px solid var(--color-border)', cursor: 'pointer', fontWeight: '600' }}>Locate {id}</button>
                  ))}
                </div>
              </div>
            ))}
            {graphIssues.length === 0 && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>No graph integrity violations detected.</div>}
          </div>
        </section>

        {/* Semantic Linter Section */}
        <section>
          <h3 style={{ fontSize: '11px', fontWeight: '600', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--spacing-md)' }}>Enterprise Linter ({lintIssues.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-md)' }}>
            {lintIssues.map((issue, i) => (
              <div key={i} style={{ padding: 'var(--spacing-lg)', borderRadius: '16px', border: `1px solid ${issue.severity === 'ERROR' ? '#fecaca' : '#fde68a'}`, backgroundColor: issue.severity === 'ERROR' ? '#fef2f2' : '#fefce8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', padding: '4px 8px', borderRadius: '4px', backgroundColor: issue.severity === 'ERROR' ? '#dc2626' : '#f59e0b', color: '#ffffff' }}>{issue.severity}</span>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>{issue.category}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{issue.id}</span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>{issue.message}</p>
                <div style={{ backgroundColor: '#f8fafc', padding: 'var(--spacing-sm)', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: '600', marginRight: '8px' }}>FIX:</span>{issue.suggestion}
                </div>
                {issue.atomId && (
                  <button onClick={() => { const a = atoms.find(x => x.id === issue.atomId); if (a) onFocusAtom(a); }} style={{ marginTop: 'var(--spacing-md)', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>View Affected Atom</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ValidationCenter;
