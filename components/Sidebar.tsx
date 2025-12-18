
import React from 'react';

export type ViewType = 'explorer' | 'modules' | 'graph' | 'edges' | 'impact' | 'assistant' | 'ingestion' | 'health' | 'publisher' | 'ontology';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const sections: { title: string; items: { id: ViewType; label: string; icon: string; count?: number }[] }[] = [
    {
      title: 'Discovery',
      items: [
        { id: 'ontology', label: 'Ontology', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'explorer', label: 'Global Registry', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { id: 'modules', label: 'Journeys & Modules', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
      ]
    },
    {
      title: 'Connectivity',
      items: [
        { id: 'graph', label: 'Knowledge Graph', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
        { id: 'edges', label: 'Dependency Audit', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
      ]
    },
    {
      title: 'Governance',
      items: [
        { id: 'health', label: 'Health & Integrity', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
        { id: 'impact', label: 'Impact Analyzer', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'ingestion', label: 'Ingestion Pipeline', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
      ]
    },
    {
      title: 'Publication',
      items: [
        { id: 'publisher', label: 'Publisher Portal', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { id: 'assistant', label: 'AI Assistant', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800 flex flex-col h-full shrink-0">
      <div className="p-8">
        <h2 className="text-lg font-black text-white tracking-widest flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-[14px] text-white shadow-lg shadow-blue-900/30">G</div>
          GNDP
        </h2>
      </div>
      
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{section.title}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                    currentView === item.id
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-inner shadow-blue-900/10'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="p-6 border-t border-slate-800">
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 shadow-sm">
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-3">Sync Status</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500 absolute inset-0 animate-ping"></div>
            </div>
            <span className="text-[10px] font-bold text-slate-300">Graph Database Live</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
