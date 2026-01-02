import React, { useState, useEffect } from 'react';
import { Users, UserCheck, AlertTriangle, TrendingUp, PieChart, BarChart3, CheckCircle, XCircle } from 'lucide-react';

interface OwnershipCoverage {
  total_atoms: number;
  atoms_with_owner: number;
  atoms_with_steward: number;
  atoms_with_both: number;
  atoms_with_neither: number;
  owner_coverage_pct: number;
  steward_coverage_pct: number;
  full_coverage_pct: number;
}

interface OwnerStats {
  name: string;
  atom_count: number;
  domains: string[];
  atom_types: Record<string, number>;
  criticality_breakdown: Record<string, number>;
  avg_compliance_score: number | null;
}

interface AtomOwnershipInfo {
  atom_id: string;
  name: string;
  atom_type: string;
  domain: string | null;
  owner: string | null;
  steward: string | null;
  criticality: string;
  compliance_score: number | null;
  last_modified: string | null;
  has_owner: boolean;
  has_steward: boolean;
}

interface OwnershipReport {
  coverage: OwnershipCoverage;
  top_owners: OwnerStats[];
  top_stewards: OwnerStats[];
  domain_coverage: Record<string, OwnershipCoverage>;
  unassigned_atoms: AtomOwnershipInfo[];
  ownership_gaps: string[];
}

export default function OwnershipDashboard() {
  const [report, setReport] = useState<OwnershipReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'owners' | 'stewards' | 'gaps'>('overview');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/ownership/report');
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        setError('Failed to load ownership report');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Failed to load ownership report:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (pct: number) => {
    if (pct >= 90) return 'text-green-600 bg-green-100';
    if (pct >= 70) return 'text-yellow-600 bg-yellow-100';
    if (pct >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading ownership report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || 'Failed to load report'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Ownership Dashboard</h1>
        <p className="text-gray-600 mt-1">Analyze ownership and stewardship assignments across the knowledge graph</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Atoms</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{report.coverage.total_atoms}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <PieChart className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Owner Coverage</p>
              <p className={`text-3xl font-bold mt-1 ${getCoverageColor(report.coverage.owner_coverage_pct).split(' ')[0]}`}>
                {report.coverage.owner_coverage_pct}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${getCoverageColor(report.coverage.owner_coverage_pct)}`}>
              <Users size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {report.coverage.atoms_with_owner} of {report.coverage.total_atoms} atoms
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Steward Coverage</p>
              <p className={`text-3xl font-bold mt-1 ${getCoverageColor(report.coverage.steward_coverage_pct).split(' ')[0]}`}>
                {report.coverage.steward_coverage_pct}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${getCoverageColor(report.coverage.steward_coverage_pct)}`}>
              <UserCheck size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {report.coverage.atoms_with_steward} of {report.coverage.total_atoms} atoms
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unassigned</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{report.coverage.atoms_with_neither}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Missing both owner and steward
          </div>
        </div>
      </div>

      {/* Ownership Gaps Alert */}
      {report.ownership_gaps.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 mb-2">Ownership Gaps Identified</h3>
              <ul className="space-y-1 text-sm text-yellow-700">
                {report.ownership_gaps.map((gap, i) => (
                  <li key={i}>• {gap}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('owners')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'owners'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Owners ({report.top_owners.length})
          </button>
          <button
            onClick={() => setActiveTab('stewards')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stewards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Stewards ({report.top_stewards.length})
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gaps'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unassigned ({report.unassigned_atoms.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Domain Coverage */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 size={20} />
                Coverage by Domain
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(report.domain_coverage).map(([domain, coverage]) => (
                  <div key={domain} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">{domain}</h3>
                      <span className="text-sm text-gray-500">{coverage.total_atoms} atoms</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600 mb-1">Owner Coverage</div>
                        <div className={`font-semibold ${getCoverageColor(coverage.owner_coverage_pct).split(' ')[0]}`}>
                          {coverage.owner_coverage_pct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">Steward Coverage</div>
                        <div className={`font-semibold ${getCoverageColor(coverage.steward_coverage_pct).split(' ')[0]}`}>
                          {coverage.steward_coverage_pct}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">Full Coverage</div>
                        <div className={`font-semibold ${getCoverageColor(coverage.full_coverage_pct).split(' ')[0]}`}>
                          {coverage.full_coverage_pct}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'owners' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={20} />
              Top Owners
            </h2>
          </div>
          <div className="divide-y">
            {report.top_owners.map((owner) => (
              <div key={owner.name} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{owner.name}</h3>
                    <p className="text-sm text-gray-600">{owner.atom_count} atoms owned</p>
                  </div>
                  {owner.avg_compliance_score !== null && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Avg Compliance</div>
                      <div className={`font-semibold ${getCoverageColor(owner.avg_compliance_score * 100).split(' ')[0]}`}>
                        {Math.round(owner.avg_compliance_score * 100)}%
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-2">Domains</div>
                    <div className="flex flex-wrap gap-1">
                      {owner.domains.map(domain => (
                        <span key={domain} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-2">Criticality Breakdown</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(owner.criticality_breakdown).map(([level, count]) => (
                        <span key={level} className={`px-2 py-1 rounded-full text-xs ${getCriticalityColor(level)}`}>
                          {level}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stewards' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UserCheck size={20} />
              Top Stewards
            </h2>
          </div>
          <div className="divide-y">
            {report.top_stewards.map((steward) => (
              <div key={steward.name} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{steward.name}</h3>
                    <p className="text-sm text-gray-600">{steward.atom_count} atoms stewarded</p>
                  </div>
                  {steward.avg_compliance_score !== null && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Avg Compliance</div>
                      <div className={`font-semibold ${getCoverageColor(steward.avg_compliance_score * 100).split(' ')[0]}`}>
                        {Math.round(steward.avg_compliance_score * 100)}%
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-2">Domains</div>
                    <div className="flex flex-wrap gap-1">
                      {steward.domains.map(domain => (
                        <span key={domain} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-2">Criticality Breakdown</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(steward.criticality_breakdown).map(([level, count]) => (
                        <span key={level} className={`px-2 py-1 rounded-full text-xs ${getCriticalityColor(level)}`}>
                          {level}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'gaps' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={20} />
              Unassigned Atoms
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Atoms missing owner or steward assignments (sorted by criticality)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criticality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.unassigned_atoms.map((atom) => (
                  <tr key={atom.atom_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{atom.name}</div>
                      <div className="text-xs text-gray-500">{atom.atom_id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{atom.atom_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{atom.domain || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCriticalityColor(atom.criticality)}`}>
                        {atom.criticality}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {atom.has_owner ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-sm">{atom.owner}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle size={16} />
                          <span className="text-sm">Missing</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {atom.has_steward ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-sm">{atom.steward}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle size={16} />
                          <span className="text-sm">Missing</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.unassigned_atoms.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                All atoms have ownership assignments!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
