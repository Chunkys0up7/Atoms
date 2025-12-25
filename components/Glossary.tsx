
import React, { useState } from 'react';
import { GlossaryItem } from '../types';

export const GLOSSARY_DATA: GlossaryItem[] = [
  // Git
  { category: 'Version Control', term: 'Branch', definition: 'A parallel line of development within a Git repository. Developers create branches to work on features or fixes independently without affecting the main codebase.' },
  { category: 'Version Control', term: 'Commit', definition: 'A snapshot of changes saved to a Git repository with a unique identifier (hash).' },
  { category: 'Version Control', term: 'Merge Request / Pull Request', definition: 'A formal request to review and merge code (or documentation) changes from one branch into another.' },
  // Markup
  { category: 'Markup Languages', term: 'Markdown', definition: 'A lightweight, human-readable plain-text markup language with minimal syntax (using *, #, [], etc.).' },
  { category: 'Markup Languages', term: 'Front Matter', definition: 'YAML or JSON metadata placed at the beginning of a Markdown file, enclosed in triple dashes (---).' },
  // NASA Methodology
  { category: 'NASA Atomic Design', term: 'Atom', definition: 'The smallest indivisible unit of documentation. A single, self-contained piece that covers exactly one concept, task, or touchpoint.' },
  { category: 'NASA Atomic Design', term: 'Module (DID)', definition: 'A reusable workflow pattern composed of multiple atoms. Groups related atoms into coherent processes.' },
  { category: 'NASA Atomic Design', term: 'Phase', definition: 'A high-level stage containing multiple modules. Represents a customer milestone or operational checkpoint.' },
  { category: 'NASA Atomic Design', term: 'Journey', definition: 'The complete end-to-end process lifecycle.' },
  // Ontology
  { category: 'Ontology', term: 'Edge', definition: 'A typed relationship connecting two nodes (Atoms, Modules, etc.). Edges formalize semantic connections.' },
  { category: 'Ontology', term: 'Ontology', definition: 'The formal schema defining what types of nodes exist and what relationships are valid between them.' },
  { category: 'Ontology', term: 'Impact Analysis', definition: 'Programmatic traversal of the graph to determine what downstream nodes are affected by changing a given node.' },
  { category: 'Ontology', term: 'Pointer Reference (Type d)', definition: 'A reference to another document/atom without duplicating content. Keeps the source of truth in one place.' },
];

const Glossary: React.FC = () => {
  const [search, setSearch] = useState('');
  
  const filtered = GLOSSARY_DATA.filter(item => 
    item.term.toLowerCase().includes(search.toLowerCase()) || 
    item.definition.toLowerCase().includes(search.toLowerCase())
  );

  const categories = Array.from(new Set(GLOSSARY_DATA.map(i => i.category)));

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="p-10 border-b border-gray-200 bg-gray-50 shrink-0">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Platform Glossary</h2>
        <p className="text-gray-600 text-sm font-medium">Standardized terminology for Docs-as-Code and NASA-Inspired Atomic Documentation.</p>

        <div className="mt-8 relative max-w-2xl">
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search terminology..."
            className="w-full bg-white border border-gray-300 rounded-2xl py-3.5 pl-12 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 shadow-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        {categories.map(cat => {
          const catItems = filtered.filter(i => i.category === cat);
          if (catItems.length === 0) return null;
          return (
            <div key={cat} className="mb-12">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-6 border-b border-gray-200 pb-2">{cat}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {catItems.map(item => (
                  <div key={item.term} className="bg-white border border-gray-300 p-6 rounded-[2rem] hover:border-gray-400 transition-all shadow-sm">
                    <h4 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">{item.term}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">{item.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Glossary;
