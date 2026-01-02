
import React, { useState } from 'react';
import { Atom, EdgeType } from '../../../types';
import { ATOM_COLORS } from '../../../constants';

interface EdgeExplorerProps {
  atoms: Atom[];
  onSelectAtom: (atom: Atom) => void;
}

const EdgeExplorer: React.FC<EdgeExplorerProps> = ({ atoms, onSelectAtom }) => {
  const [filter, setFilter] = useState<EdgeType | 'ALL'>('ALL');

  const allEdges = atoms.flatMap(atom =>
    (atom.edges || []).map(edge => ({
      source: atom,
      targetId: edge.targetId,
      type: edge.type,
      description: edge.description
    }))
  ).filter(e => filter === 'ALL' || e.type === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>Dependency & Edge Network</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', maxWidth: '600px' }}>Monitor how atomic units trigger, require, or govern one another across the enterprise graph.</p>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', overflowX: 'auto' }}>
          <button
            onClick={() => setFilter('ALL')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: filter === 'ALL' ? 'var(--color-primary)' : '#e2e8f0',
              color: filter === 'ALL' ? '#ffffff' : 'var(--color-text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            All Relations
          </button>
          {Object.values(EdgeType).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                border: filter === type ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                cursor: 'pointer',
                backgroundColor: filter === type ? 'rgba(37, 99, 235, 0.1)' : '#ffffff',
                color: filter === type ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
          <thead>
            <tr style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--color-text-tertiary)' }}>
              <th style={{ paddingBottom: '12px', paddingLeft: '16px', textAlign: 'left' }}>Source Atom (Node)</th>
              <th style={{ paddingBottom: '12px', textAlign: 'left' }}>Relationship (Edge)</th>
              <th style={{ paddingBottom: '12px', textAlign: 'left' }}>Target Reference</th>
              <th style={{ paddingBottom: '12px', textAlign: 'left' }}>Category Impact</th>
            </tr>
          </thead>
          <tbody>
            {allEdges.map((edge, i) => {
              const targetAtom = atoms.find(a => a.id === edge.targetId);
              const sourceTitle = edge.source.title || edge.source.name || 'Untitled';
              const targetTitle = targetAtom ? (targetAtom.title || targetAtom.name || 'Untitled') : '';
              return (
                <tr key={i} style={{ cursor: 'pointer' }}>
                  <td
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      borderTop: '1px solid var(--color-border)',
                      borderBottom: '1px solid var(--color-border)',
                      borderLeft: '1px solid var(--color-border)',
                      borderTopLeftRadius: '8px',
                      borderBottomLeftRadius: '8px'
                    }}
                    onClick={() => onSelectAtom(edge.source)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ATOM_COLORS[edge.source.type] }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{sourceTitle}</div>
                        <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>{edge.source.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      backgroundColor: '#e2e8f0',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase'
                    }}>
                      {edge.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td
                    style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
                    onClick={() => targetAtom && onSelectAtom(targetAtom)}
                  >
                    {targetAtom ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ATOM_COLORS[targetAtom.type] }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{targetTitle}</div>
                          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>{targetAtom.id}</div>
                        </div>
                      </div>
                    ) : (
                      <span style={{
                        color: '#ef4444',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        fontWeight: '600',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px'
                      }}>Broken Ref: {edge.targetId}</span>
                    )}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    borderRight: '1px solid var(--color-border)',
                    borderTopRightRadius: '8px',
                    borderBottomRightRadius: '8px'
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>
                      {edge.source.category} → {targetAtom?.category || 'UNKNOWN'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EdgeExplorer;
