import React, { useState, useRef, useEffect } from 'react';
import { Atom } from '../types';
import { Database, GitBranch, TrendingUp, Zap } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  text: string;
  sources?: Array<{
    id: string;
    type: string;
    file_path?: string;
    distance?: number;
  }>;
  context_atoms?: string[];
  rag_mode?: string;
}

interface AIAssistantProps {
  atoms: Atom[];
}

type RAGMode = 'entity' | 'path' | 'impact';

const AIAssistantEnhanced: React.FC<AIAssistantProps> = ({ atoms }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: 'Hello! I am the GNDP RAG Assistant with **dual-index architecture** (vector + graph). I can help you explore the knowledge base using three modes:\n\n• **Entity Search**: Semantic similarity search\n• **Path Search**: Graph relationship traversal\n• **Impact Analysis**: Downstream dependency analysis\n\n**📚 New:** I can now search published documents! When you publish a document, it\'s automatically indexed for semantic search.\n\nHow can I help you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragMode, setRagMode] = useState<RAGMode>('entity');
  const [ragHealth, setRagHealth] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    // Check RAG system health on mount
    checkRagHealth();
  }, []);

  const checkRagHealth = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/rag/health');
      if (response.ok) {
        const health = await response.json();
        setRagHealth(health);
      }
    } catch (error) {
      console.error('Failed to check RAG health:', error);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setIsLoading(true);

    try {
      // Call backend RAG API (dual-index architecture)
      const response = await fetch('http://localhost:8001/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          top_k: 5,
          rag_mode: ragMode
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'ai',
          text: data.answer,
          sources: data.sources,
          context_atoms: data.context_atoms,
          rag_mode: ragMode
        }]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'ai',
          text: `Error: ${error.detail || 'Failed to query RAG system'}`
        }]);
      }
    } catch (error) {
      console.error('RAG query error:', error);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Failed to connect to RAG backend. Please ensure the API server is running.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = {
    entity: [
      "Find loan application processes",
      "What controls govern credit scoring?",
      "Summarize published SOP documents"
    ],
    path: [
      "What systems connect to payment processing?",
      "Show dependencies of compliance controls",
      "How are published documents related to atoms?"
    ],
    impact: [
      "What would break if we change credit verification?",
      "Show downstream impacts of risk scoring",
      "Which documents reference this compliance control?"
    ]
  };

  const getRagModeIcon = (mode: RAGMode) => {
    switch (mode) {
      case 'entity': return <Database size={14} />;
      case 'path': return <GitBranch size={14} />;
      case 'impact': return <TrendingUp size={14} />;
    }
  };

  const getRagModeDescription = (mode: RAGMode) => {
    switch (mode) {
      case 'entity': return 'Semantic similarity search using vector embeddings';
      case 'path': return 'Graph relationship traversal (2-3 hop bounded)';
      case 'impact': return 'Downstream dependency analysis via graph traversal';
    }
  };

  const getRagHealthStatus = () => {
    if (!ragHealth) return { color: 'gray', text: 'Unknown', ready: false };

    if (ragHealth.full_rag_ready) {
      return { color: 'green', text: 'Dual-Index Ready', ready: true };
    } else if (ragHealth.dual_index_ready) {
      return { color: 'yellow', text: 'Vector + Graph (No LLM)', ready: true };
    } else if (ragHealth.vector_db_exists) {
      return { color: 'orange', text: 'Vector Only', ready: true };
    } else {
      return { color: 'red', text: 'Not Initialized', ready: false };
    }
  };

  const healthStatus = getRagHealthStatus();

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] text-white">AI</div>
              RAG Assistant
            </h2>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">
              Dual-Index Architecture (Vector + Graph)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full bg-${healthStatus.color}-500`}></div>
            <span className="text-[9px] font-black uppercase text-slate-500">{healthStatus.text}</span>
          </div>
        </div>

        {/* RAG Mode Selector */}
        <div className="grid grid-cols-3 gap-2">
          {(['entity', 'path', 'impact'] as RAGMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setRagMode(mode)}
              className={`p-3 rounded-lg border transition-all ${
                ragMode === mode
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-blue-500 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {getRagModeIcon(mode)}
                <span className="text-xs font-bold capitalize">{mode}</span>
              </div>
              <p className="text-[9px] text-left opacity-75">{getRagModeDescription(mode)}</p>
            </button>
          ))}
        </div>

        {/* System Status */}
        {ragHealth && (
          <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="grid grid-cols-2 gap-3 text-[10px] mb-3">
              <div>
                <div className="text-slate-500 mb-1">Atoms Indexed</div>
                <div className={`font-bold ${ragHealth.vector_db_exists ? 'text-green-400' : 'text-red-400'}`}>
                  {ragHealth.vector_db_exists ? `${ragHealth.collection_count} atoms` : 'Not initialized'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Documents Indexed</div>
                <div className={`font-bold ${ragHealth.document_collection_count > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                  {ragHealth.document_collection_count || 0} docs
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div>
                <div className="text-slate-500 mb-1">Graph DB</div>
                <div className={`font-bold ${ragHealth.neo4j_connected ? 'text-green-400' : 'text-red-400'}`}>
                  {ragHealth.neo4j_connected ? `${ragHealth.graph_atom_count} nodes` : 'Not connected'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">LLM</div>
                <div className={`font-bold ${ragHealth.claude_api_available ? 'text-green-400' : 'text-red-400'}`}>
                  {ragHealth.claude_api_available ? 'Claude' : 'Unavailable'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Status</div>
                <div className={`font-bold ${ragHealth.dual_index_ready ? 'text-green-400' : 'text-red-400'}`}>
                  {ragHealth.dual_index_ready ? 'Ready' : 'Partial'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[2rem] p-5 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none shadow-lg'
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {/* Message Text */}
              <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                {msg.text.split('\n').map((line, idx) => (
                  <p key={idx} className="mb-2">{line}</p>
                ))}
              </div>

              {/* Sources */}
              {msg.role === 'ai' && msg.sources && msg.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Sources ({msg.sources.length}) - Mode: {msg.rag_mode}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {msg.sources.map((source, idx) => (
                      <div key={idx} className="text-[10px] text-slate-400">
                        • {source.id} ({source.type})
                        {source.distance !== undefined && ` - similarity: ${(1 - source.distance).toFixed(3)}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 p-5 rounded-[2rem] rounded-tl-none border border-slate-700 flex gap-2">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length < 3 && (
        <div className="p-6 pt-0">
          <div className="text-[9px] text-slate-500 mb-2 font-bold uppercase">Suggested for {ragMode} mode:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions[ragMode].map(q => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-bold text-slate-400 hover:text-white hover:border-blue-500 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="relative">
          <input
            type="text"
            placeholder={`Ask a question (${ragMode} mode)...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-6 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xl text-white placeholder:text-slate-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={!healthStatus.ready}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || !healthStatus.ready}
            className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            Ask
          </button>
        </div>

        {!healthStatus.ready && (
          <div className="mt-2 text-[10px] text-yellow-500">
            ⚠️ RAG system not initialized. Run: scripts/initialize_vectors.py and scripts/sync_graph_to_neo4j.py
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAssistantEnhanced;
