
import React, { useState, useRef, useEffect } from 'react';
import { Atom } from '../types';
import { chatWithKnowledgeBase } from '../geminiService';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

interface AIAssistantProps {
  atoms: Atom[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ atoms }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Hello! I am the GNDP Assistant. I have indexed your graph-native documentation. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    const aiResponse = await chatWithKnowledgeBase(userMessage, atoms);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full animate-pulse"></div>
            Knowledge Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-1">Ask questions about process flows, roles, or regulations.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none shadow-lg' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex gap-2">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="relative">
          <input 
            type="text" 
            placeholder="e.g., Who owns the loan intake process?" 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-4 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
