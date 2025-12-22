import { useState } from 'react';
import { Journey, Phase } from '../types';
import { API_ENDPOINTS } from '../constants';

interface RuntimeContext {
  customer_data?: {
    credit_score?: number;
    annual_income?: number;
  };
  transaction_data?: {
    amount?: number;
    currency?: string;
  };
  risk_flags?: string[];
  compliance_requirements?: string[];
}

interface PhaseModification {
  action: string;
  phase_id: string;
  reason: string;
  criticality: string;
}

interface JourneyEvaluation {
  original_journey_id: string;
  modified_journey: any;
  modifications: PhaseModification[];
  total_phases_added: number;
  total_phases_removed: number;
  risk_score: number;
}

export default function RuntimeSimulator() {
  const [selectedJourney, setSelectedJourney] = useState<string>('journey-loan-origination');
  const [context, setContext] = useState<RuntimeContext>({
    customer_data: { credit_score: 750, annual_income: 100000 },
    transaction_data: { amount: 250000, currency: 'USD' },
    risk_flags: [],
    compliance_requirements: []
  });
  const [evaluation, setEvaluation] = useState<JourneyEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      // Mock journey for demonstration
      const baseJourney = {
        id: selectedJourney,
        name: 'Loan Origination Journey',
        phases: ['phase-application', 'phase-assessment', 'phase-approval', 'phase-funding']
      };

      const response = await fetch(`${API_ENDPOINTS.base}/runtime/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journey: baseJourney,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const result = await response.json();
      setEvaluation(result);
    } catch (error) {
      console.error('Error evaluating journey:', error);
      alert('Failed to evaluate journey. Make sure the backend is running.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRiskFlagToggle = (flag: string) => {
    setContext(prev => ({
      ...prev,
      risk_flags: prev.risk_flags?.includes(flag)
        ? prev.risk_flags.filter(f => f !== flag)
        : [...(prev.risk_flags || []), flag]
    }));
  };

  const handleComplianceToggle = (req: string) => {
    setContext(prev => ({
      ...prev,
      compliance_requirements: prev.compliance_requirements?.includes(req)
        ? prev.compliance_requirements.filter(r => r !== req)
        : [...(prev.compliance_requirements || []), req]
    }));
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.7) return '#ef4444';
    if (score >= 0.4) return '#f59e0b';
    if (score >= 0.2) return '#fbbf24';
    return '#10b981';
  };

  const getCriticalityColor = (criticality: string) => {
    const colors = {
      'CRITICAL': '#ef4444',
      'HIGH': '#f97316',
      'MEDIUM': '#f59e0b',
      'LOW': '#10b981'
    };
    return colors[criticality as keyof typeof colors] || '#64748b';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'white' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          Runtime Simulator
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
          See how workflows adapt in real-time based on risk, compliance, and context
        </p>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px 1fr', gap: 0, overflow: 'hidden' }}>
        {/* Context Input Panel */}
        <div style={{
          padding: 'var(--spacing-lg)',
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'white',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
            Scenario Configuration
          </h3>

          {/* Customer Data */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Customer Credit Score
            </label>
            <input
              type="number"
              value={context.customer_data?.credit_score || 750}
              onChange={(e) => setContext(prev => ({
                ...prev,
                customer_data: { ...prev.customer_data, credit_score: parseInt(e.target.value) }
              }))}
              className="input"
              style={{ width: '100%' }}
              min="300"
              max="850"
            />
            <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              {context.customer_data?.credit_score! < 620 ? '⚠️ Below threshold - will trigger manual review' : '✓ Above threshold'}
            </p>
          </div>

          {/* Transaction Amount */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Transaction Amount ($)
            </label>
            <input
              type="number"
              value={context.transaction_data?.amount || 250000}
              onChange={(e) => setContext(prev => ({
                ...prev,
                transaction_data: { ...prev.transaction_data, amount: parseInt(e.target.value) }
              }))}
              className="input"
              style={{ width: '100%' }}
              min="0"
              step="50000"
            />
            <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              {context.transaction_data?.amount! > 1_000_000 ? '⚠️ Over $1M - requires senior approval' : '✓ Standard amount'}
            </p>
          </div>

          {/* Risk Flags */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Risk Flags
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['suspicious_activity', 'identity_mismatch', 'velocity_check_failed', 'high_risk_country'].map(flag => (
                <label key={flag} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={context.risk_flags?.includes(flag)}
                    onChange={() => handleRiskFlagToggle(flag)}
                  />
                  <span style={{ fontSize: '12px' }}>{flag.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Compliance Requirements */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Compliance Requirements
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['AML', 'KYC', 'OFAC', 'CIP'].map(req => (
                <label key={req} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={context.compliance_requirements?.includes(req)}
                    onChange={() => handleComplianceToggle(req)}
                  />
                  <span style={{ fontSize: '12px' }}>{req}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Evaluate Button */}
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
          >
            {isEvaluating ? 'Evaluating...' : 'Evaluate Journey'}
          </button>
        </div>

        {/* Results Panel */}
        <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto' }}>
          {!evaluation ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-tertiary)' }}>
              <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>⚡</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Configure a scenario and click "Evaluate Journey"
              </div>
              <div style={{ fontSize: '13px' }}>
                See how the workflow adapts based on risk and compliance requirements
              </div>
            </div>
          ) : (
            <div>
              {/* Risk Score */}
              <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                marginBottom: 'var(--spacing-lg)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                      RISK SCORE
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: getRiskColor(evaluation.risk_score) }}>
                      {(evaluation.risk_score * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Phases Added</div>
                    <div style={{ fontSize: '24px', fontWeight: '600', color: '#3b82f6' }}>+{evaluation.total_phases_added}</div>
                  </div>
                </div>
              </div>

              {/* Modifications */}
              {evaluation.modifications.length > 0 && (
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                    Applied Modifications ({evaluation.modifications.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {evaluation.modifications.map((mod, index) => (
                      <div
                        key={index}
                        style={{
                          padding: 'var(--spacing-md)',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          border: `2px solid ${getCriticalityColor(mod.criticality)}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            color: getCriticalityColor(mod.criticality)
                          }}>
                            {mod.criticality}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            backgroundColor: '#e0f2fe',
                            borderRadius: '4px',
                            color: '#0369a1'
                          }}>
                            {mod.action.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                          {mod.phase_id}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {mod.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.modifications.length === 0 && (
                <div style={{
                  padding: 'var(--spacing-lg)',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #10b981',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>
                    ✓ No Modifications Required
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    This scenario can proceed with the standard workflow
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
