
import React from 'react';

const OntologyView: React.FC = () => {
  const hierarchy = [
    { level: 'JOURNEY', name: 'Purchase Loan Journey', desc: 'End-to-end process lifecycle (Application → Funding).', icon: '🌍' },
    { level: 'PHASE', name: 'Processing Milestone', desc: 'Major operational stages and milestones within a journey.', icon: '🏁' },
    { level: 'MODULE', name: 'Income Verification', desc: 'Reusable workflow patterns (DIDs). A group of related atoms.', icon: '📦' },
    { level: 'ATOM', name: 'Atomic Unit', desc: 'Indivisible unit: atom-cust, atom-bo, or atom-sys.', icon: '⚛️' },
  ];

  const edgeCategories = [
    { 
      name: 'Dependency Edges', 
      items: [
        { type: 'DEPENDS_ON', desc: 'A requires B to be complete.' },
        { type: 'ENABLES', desc: 'Completing A allows B to begin.' },
      ],
      color: 'bg-blue-500/10 border-blue-500/30'
    },
    { 
      name: 'Semantic Edges', 
      items: [
        { type: 'IMPLEMENTS', desc: 'A procedure executes a specific policy.' },
        { type: 'GOVERNED_BY', desc: 'Regulatory requirement controls A.' },
        { type: 'REQUIRES_KNOWLEDGE_OF', desc: 'Conceptual prerequisite.' },
      ],
      color: 'bg-emerald-500/10 border-emerald-500/30'
    },
    { 
      name: 'Lifecycle Edges', 
      items: [
        { type: 'SUPERSEDES', desc: 'Versioning: New unit replaces old unit.' },
        { type: 'ESCALATES_TO', desc: 'Exception/failure path routing.' },
      ],
      color: 'bg-amber-500/10 border-amber-500/30'
    }
  ];

  return (
    <div className="p-12 h-full bg-slate-950 flex flex-col overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-2">Enterprise Ontology</h2>
        <p className="text-slate-500 max-w-2xl">The documentation blueprint: standardized vocabulary, classified entities, and explicit relationship rules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Entity Classification */}
        <div className="lg:col-span-1 space-y-12">
          <section>
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8">Entity Classification (Hierarchy)</h3>
            <div className="space-y-4">
              {hierarchy.map((item, i) => (
                <div key={item.level} className="relative group">
                  <div className="flex items-center gap-6 bg-slate-900 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/50 transition-all shadow-xl">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">{item.level}</div>
                      <h3 className="text-sm font-bold text-white mb-1">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Ontology Ownership</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Domains (e.g., Risk, Ops, Tech) own segments of the ontology. This prevents "vocabulary drift" by ensuring standardized terminology across decentralized teams.
            </p>
          </section>
        </div>

        {/* Relationship Rules (Edges) */}
        <div className="lg:col-span-2 space-y-12">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8">Relationship Rules (Edges)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {edgeCategories.map(cat => (
              <div key={cat.name} className={`p-8 rounded-[2.5rem] border ${cat.color}`}>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6">{cat.name}</h4>
                <div className="space-y-6">
                  {cat.items.map(item => (
                    <div key={item.type}>
                      <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{item.type}</div>
                      <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-lg font-black text-white uppercase tracking-tight mb-4">The Semantic Network</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Our architecture enables <strong>Graph-Based Reasoning</strong>. By making edges first-class objects, the system can perform complex impact analysis and improve LLM retrieval accuracy through high-fidelity context mapping.
              </p>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-slate-900 rounded-xl text-[10px] font-black text-blue-400 uppercase tracking-widest border border-slate-800">No Ambiguity</div>
                <div className="px-4 py-2 bg-slate-900 rounded-xl text-[10px] font-black text-purple-400 uppercase tracking-widest border border-slate-800">Scaleable Context</div>
              </div>
            </div>
            {/* Abstract Background Element */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OntologyView;
