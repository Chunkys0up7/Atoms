import React from 'react';
import { Atom, Module } from '../../types';

interface AtomDetailsSidebarProps {
    atom: Atom;
    modules: Module[];
    allAtoms: Atom[];
    onClose: () => void;
    onSelectAtom: (atom: Atom) => void;
    onNavigate: (view: string) => void;
}

const AtomDetailsSidebar: React.FC<AtomDetailsSidebarProps> = ({ atom: displayAtom, modules, allAtoms, onClose, onSelectAtom, onNavigate }) => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '500px',
            height: '100%',
            backgroundColor: '#ffffff',
            borderLeft: '2px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: 'var(--shadow-lg)'
        }}>
            <div style={{
                padding: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-tertiary)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            Atom Details
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {displayAtom.id}
                        </h3>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            {displayAtom.name || displayAtom.name || 'Untitled'}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '4px',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        <svg style={{ width: '18px', height: '18px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                {/* Basic Info */}
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                        <span className="badge badge-info">{displayAtom.type}</span>
                        {displayAtom.status && <span className="badge badge-success">{displayAtom.status}</span>}
                        {displayAtom.criticality && <span className="badge" style={{ backgroundColor: displayAtom.criticality === 'CRITICAL' ? '#ef4444' : displayAtom.criticality === 'HIGH' ? '#f59e0b' : '#6b7280' }}>{displayAtom.criticality}</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {displayAtom.owner && <div><strong>Owner:</strong> {displayAtom.owner}</div>}
                        {displayAtom.team && <div><strong>Team:</strong> {displayAtom.team}</div>}
                        {displayAtom.version && <div><strong>Version:</strong> {displayAtom.version}</div>}
                        {displayAtom.category && <div><strong>Category:</strong> {displayAtom.category}</div>}
                    </div>
                </div>

                {/* Description */}
                {displayAtom.content?.description && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                            Description
                        </h5>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                            {displayAtom.content.description}
                        </p>
                    </div>
                )}

                {/* Purpose */}
                {displayAtom.content?.purpose && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                            Purpose
                        </h5>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                            {displayAtom.content.purpose}
                        </p>
                    </div>
                )}

                {/* Edges/Relationships */}
                {displayAtom.edges && displayAtom.edges.length > 0 && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                            Relationships ({displayAtom.edges.length})
                        </h5>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {displayAtom.edges.map((edge: any, i: number) => {
                                const targetAtom = allAtoms.find(a => a.id === edge.targetId);
                                return (
                                    <div key={i} style={{ marginBottom: 'var(--spacing-xs)', padding: 'var(--spacing-xs)', backgroundColor: 'var(--color-bg-tertiary)', borderRadius: '4px' }}>
                                        <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>{edge.type}</span>
                                        {' → '}
                                        <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onSelectAtom(targetAtom || { id: edge.targetId } as Atom)}>
                                            {targetAtom?.name || edge.targetId}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Organization */}
                {(displayAtom.moduleId || displayAtom.phaseId) && (
                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <h5 style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--spacing-sm)' }}>
                            Organization
                        </h5>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {displayAtom.moduleId && (
                                <div style={{ marginBottom: '4px' }}>
                                    <strong>Module:</strong> {modules.find(m => m.id === displayAtom.moduleId)?.name || displayAtom.moduleId}
                                </div>
                            )}
                            {displayAtom.phaseId && (
                                <div>
                                    <strong>Phase:</strong> {displayAtom.phaseId.replace('phase-', '').replace('-', ' ')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}>
                <button
                    onClick={() => { onClose(); onNavigate('impact'); }}
                    className="btn"
                    style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
                >
                    View Impact Analysis
                </button>
                <button
                    onClick={() => { onClose(); onNavigate('edges'); }}
                    className="btn"
                    style={{ width: '100%' }}
                >
                    View Edge Network
                </button>
            </div>
        </div>
    );
};

export default AtomDetailsSidebar;
