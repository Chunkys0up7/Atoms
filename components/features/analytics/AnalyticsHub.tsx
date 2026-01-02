import React, { useState } from 'react';
import GraphAnalyticsDashboard from './GraphAnalyticsDashboard';
import OwnershipDashboard from './OwnershipDashboard';
import AnomalyDetectionDashboard from './AnomalyDetectionDashboard';
import OptimizationDashboard from './OptimizationDashboard';
import ValidationCenter from './ValidationCenter';

interface AnalyticsHubProps {
    atoms: any[];
    modules: any[];
}

const AnalyticsHub: React.FC<AnalyticsHubProps> = ({ atoms, modules }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Graph Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: 'ownership', label: 'Ownership & Lineage', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { id: 'quality', label: 'Quality & Health', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { id: 'anomalies', label: 'Anomalies', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        { id: 'optimization', label: 'Optimization', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
    ];

    return (
        <div className="content-area">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900">Analytics Hub</h1>
                    <p className="text-secondary text-sm">Comprehensive system analysis and health monitoring</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
                <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                            </svg>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'overview' && <GraphAnalyticsDashboard />}
                {activeTab === 'ownership' && <OwnershipDashboard />}
                {activeTab === 'quality' && (
                    <ValidationCenter
                        atoms={atoms}
                        modules={modules}
                        onFocusAtom={(a) => console.log('Focus atom', a)}
                    />
                )}
                {activeTab === 'anomalies' && <AnomalyDetectionDashboard />}
                {activeTab === 'optimization' && <OptimizationDashboard />}
            </div>
        </div>
    );
};

export default AnalyticsHub;
