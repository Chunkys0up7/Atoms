
import React, { useState } from 'react';
import { Atom, AtomType } from '../types';
import { ATOM_COLORS } from '../constants';

interface AtomExplorerProps {
  atoms: Atom[];
  onSelect: (atom: Atom) => void;
}

const AtomExplorer: React.FC<AtomExplorerProps> = ({ atoms, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AtomType | 'ALL'>('ALL');

  const filteredAtoms = atoms.filter(atom => {
    const name = atom.name || atom.title || '';
    const id = atom.id || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || atom.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '4px' }}>Atom Registry</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-tertiary)' }}>
              System-wide documentation units
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Total Units
            </div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-primary)' }}>{atoms.length}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <input
            type="text"
            placeholder="Search by ID or name..."
            className="form-input"
            style={{ flex: 1 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-select"
            style={{ width: '200px' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
          >
            <option value="ALL">All Types</option>
            {Object.values(AtomType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto content-area">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {filteredAtoms.map(atom => {
              const displayTitle = atom.title || atom.name || 'Untitled';
              const displaySummary = atom.summary || (atom.content && atom.content.summary) || '';
              return (
                <tr
                  key={atom.id}
                  onClick={() => onSelect(atom)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>{atom.id}</td>
                  <td style={{ fontWeight: '500' }}>{displayTitle}</td>
                  <td><span className="badge badge-info">{atom.type}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{atom.owner || '-'}</td>
                  <td>
                    {atom.status && <span className="badge badge-success">{atom.status}</span>}
                  </td>
                  <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-tertiary)' }}>
                    {displaySummary}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredAtoms.length === 0 && (
          <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            No atoms found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default AtomExplorer;
