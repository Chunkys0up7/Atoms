
import React, { useState } from 'react';
import { Atom, Module, DocTemplateType } from '../types';
import { compileDocument } from '../geminiService';

interface PublisherProps {
  atoms: Atom[];
  modules: Module[];
}

const Publisher: React.FC<PublisherProps> = ({ atoms, modules }) => {
  const [selectedModuleId, setSelectedModuleId] = useState(modules[0]?.id || '');
  const [template, setTemplate] = useState<DocTemplateType>('SOP');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledText, setCompiledText] = useState<string | null>(null);

  const activeModule = modules.find(m => m.id === selectedModuleId);
  const moduleAtoms = atoms.filter(a => activeModule?.atoms.includes(a.id));

  const handleCompile = async () => {
    if (!activeModule) return;
    setIsCompiling(true);
    setCompiledText(null);
    try {
      const result = await compileDocument(moduleAtoms, activeModule, template);
      setCompiledText(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDownload = () => {
    if (!compiledText) return;
    const blob = new Blob([compiledText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeModule?.id || 'doc'}_${template}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="p-10 border-b border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">AI Document Compiler</h2>
          <p className="text-gray-600 text-sm font-medium">Synthesize atomic units into cohesive professional artifacts via LLM.</p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-white border border-gray-300 rounded-2xl p-1 flex">
             {(['SOP', 'TECHNICAL_DESIGN', 'EXECUTIVE_SUMMARY', 'COMPLIANCE_AUDIT'] as DocTemplateType[]).map(t => (
               <button 
                key={t}
                onClick={() => setTemplate(t)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${template === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 {t.replace('_', ' ')}
               </button>
             ))}
           </div>
           
           <button 
             onClick={handleCompile}
             disabled={isCompiling || !selectedModuleId}
             className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-200 disabled:text-gray-400 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-3"
           >
             {isCompiling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a2 2 0 00-1.96 1.414l-.477 2.387a2 2 0 00.547 1.022l1.428 1.428a2 2 0 001.022.547l2.387.477a2 2 0 001.96-1.414l.477-2.387a2 2 0 00-.547-1.022l-1.428-1.428z" /></svg>}
             Compile {template}
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Module Picker */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
           <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Select Scope</h3>
           <div className="space-y-3">
             {modules.map(mod => (
               <button
                 key={mod.id}
                 onClick={() => setSelectedModuleId(mod.id)}
                 className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedModuleId === mod.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}
               >
                 <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-50">{mod.id}</div>
                 <div className="text-sm font-bold">{mod.name}</div>
                 <div className="text-[10px] mt-2 italic">{mod.atoms.length} atoms in scope</div>
               </button>
             ))}
           </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 bg-white p-12 overflow-y-auto custom-scrollbar relative">
          {compiledText ? (
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-200">
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">Compiled Output Preview</h3>
                 <button 
                  onClick={handleDownload}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-300 flex items-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   Download .md
                 </button>
              </div>
              <div className="prose prose-blue max-w-none">
                 <div dangerouslySetInnerHTML={{ __html: compiledText.replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
               <div className="w-20 h-20 rounded-full border border-gray-300 flex items-center justify-center mb-6">
                 <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
               </div>
               <h3 className="text-xl font-black text-gray-900">Compiler Standby</h3>
               <p className="text-gray-600 max-w-xs mt-2">Select a module and template, then click Compile to generate a polished enterprise document.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Publisher;
