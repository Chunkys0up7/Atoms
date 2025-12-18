
import React, { useState, useRef, useEffect } from 'react';
import { Atom } from '../types';
import { chatWithKnowledgeBase } from '../geminiService';
import { GLOSSARY_DATA } from './Glossary';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface AIAssistantProps {
  atoms: Atom[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ atoms }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello! I am the GNDP RAG Assistant. I have indexed your Registry and Glossary. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setIsLoading(true);

    const aiResponse = await chatWithKnowledgeBase(query, atoms, GLOSSARY_DATA);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setIsLoading(false);
  };

  const suggestedQuestions = [
    "What is an Atom?",
    "Show me atoms in the Loan Origination domain",
    "Explain the 'Pointer Reference' principle",
    "What are the impacts of changing a Process atom?"
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] text-white">AI</div>
            RAG Assistant
          </h2>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Graph-Augmented Intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-[9px] font-black uppercase text-slate-500">Retrieval Active</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[2rem] p-5 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 prose prose-invert prose-sm max-w-none'
            }`}>
              {msg.role === 'ai' ? (
                <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
              ) : (
                msg.text
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

      {messages.length < 3 && (
        <div className="p-6 pt-0 flex flex-wrap gap-2">
          {suggestedQuestions.map(q => (
            <button 
              key={q} 
              onClick={() => handleSend(q)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-[10px] font-bold text-slate-400 hover:text-white hover:border-blue-500 transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search knowledge base or ask a methodology question..." 
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-6 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xl text-white placeholder:text-slate-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 px-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
