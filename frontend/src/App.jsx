import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { FiCopy, FiCheck, FiPlus, FiMenu, FiTrash2, FiSend } from 'react-icons/fi';

const API_BASE = 'https://stresstest-ai.promptpulse.workers.dev';

export default function App() {
  const [convos, setConvos] = useState(() => JSON.parse(localStorage.getItem('convos') || '[]'));
  const [activeId, setActiveId] = useState(convos[0]?.id || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollRef = useRef(null);
  const userId = useRef(localStorage.getItem('userId') || 'anon');

  const saveConvos = (list) => {
    localStorage.setItem('convos', JSON.stringify(list));
    setConvos(list);
  };

  const loadHistory = async (id) => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`${API_BASE}/chat/history?conversationId=${id}&userId=${userId.current}`);
    const hist = await res.json();
    setMessages(hist);
    setLoading(false);
  };

  useEffect(() => { loadHistory(activeId); }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !activeId) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId.current, conversationId: activeId, message: input })
    });

    const data = await res.json();
    const fullContent = data.history[data.history.length - 1].content;
    const finalMsg = data.history[data.history.length - 1];
    let current = '';

    if (typeof fullContent !== 'string') {
      console.error('Response content is not a string:', fullContent);
      setLoading(false);
      return;
    }

    const interval = setInterval(() => {
      const nextChar = fullContent.charAt(current.length);
      if (nextChar) {
        current += nextChar;
        setMessages((prev) => {
          const withoutThinking = prev.filter((msg) => msg.role !== 'thinking');
          return [...withoutThinking, { role: 'thinking', content: current }];
        });
      } else {
        clearInterval(interval);
        setMessages((prev) => {
          const withoutThinking = prev.filter((msg) => msg.role !== 'thinking');
          return [...withoutThinking, finalMsg];
        });
        setLoading(false);
      }
    }, 15);
  };

  const newConvo = () => {
    const id = 'conv-' + Date.now();
    saveConvos([{ id }, ...convos]);
    setActiveId(id);
    setMessages([]);
    setSidebarOpen(false);
  };

  const deleteConvo = (id) => {
    const updated = convos.filter((x) => x.id !== id);
    saveConvos(updated);
    if (activeId === id) {
      if (updated.length > 0) {
        setActiveId(updated[0].id);
        loadHistory(updated[0].id);
      } else {
        setActiveId(null);
        setMessages([]);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-bg text-gray-200">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-sidebar">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
          <FiMenu size={20} />
        </button>
        <span className="text-lg font-bold">AI Agent</span>
        <button onClick={newConvo} className="text-accent">
          <FiPlus size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`md:w-64 bg-sidebar text-gray-100 flex flex-col border-r border-gray-800 shadow-inner z-10 ${sidebarOpen ? 'block' : 'hidden'} md:block`}>
        <div className="hidden md:flex justify-between items-center px-4 py-3 border-b border-gray-700">
          <span className="text-lg font-semibold">Conversations</span>
          <button onClick={newConvo} className="text-accent">
            <FiPlus size={18} />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {convos.map((c) => (
            <li
              key={c.id}
              className={`group px-4 py-2 text-sm truncate rounded cursor-pointer transition flex items-center justify-between gap-2 ${
                c.id === activeId ? 'bg-gray-800 font-semibold' : 'hover:bg-gray-700'
              }`}
              title={c.id}
            >
              <span onClick={() => { setActiveId(c.id); setSidebarOpen(false); }} className="flex-1 truncate">
                {c.id}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConvo(c.id); }}
                className="text-red-400 hover:text-red-200 text-xs px-2"
                title="Delete"
              >
                <FiTrash2 />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat */}
      <main className="flex-1 min-h-0 flex flex-col">
        <header className="hidden md:block p-4 border-b border-gray-800 text-xl font-bold tracking-wide bg-sidebar">
          AI Agent
        </header>

        <section className="flex-1 overflow-y-auto px-4 py-6 md:px-6 space-y-4 scrollbar-none">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg shadow-md transition ${
                m.role === 'user' ? 'bg-bubble-user text-right ml-auto max-w-[85%]' : 'bg-bubble-ai'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold capitalize">{m.role}</span>
                {m.role !== 'user' && m.role !== 'thinking' && (
                  <button
                    className="text-xs text-accent flex items-center gap-1 hover:underline"
                    onClick={() => {
                      navigator.clipboard.writeText(m.content);
                      setCopiedIndex(idx);
                      setToastVisible(true);
                      setTimeout(() => setCopiedIndex(null), 2000);
                      setTimeout(() => setToastVisible(false), 2000);
                    }}
                  >
                    {copiedIndex === idx ? <FiCheck /> : <FiCopy />}
                    {copiedIndex === idx ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
              {m.role === 'thinking' ? (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{m.content}</pre>
              ) : (
                <ReactMarkdown className="prose prose-invert text-sm leading-snug max-w-none" components={{
                  p: ({ children }) => <p className="mb-1">{children}</p>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  h2: ({ children }) => <h2 className="mt-4 mb-2 text-white text-lg">{children}</h2>,
                  h3: ({ children }) => <h3 className="mt-3 mb-1 text-white text-base">{children}</h3>
                }}>{m.content}</ReactMarkdown>
              )}
            </div>
          ))}

          {loading && (
            <div className="p-4 rounded-lg shadow bg-bubble-ai opacity-60 italic flex items-center gap-2">
              <span className="text-sm">Thinking</span>
              <span className="flex gap-1 ml-2">
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" />
              </span>
            </div>
          )}

          <div ref={scrollRef} />
        </section>

        {toastVisible && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-300 animate-fade-in">
            Copied to clipboard!
          </div>
        )}

        {activeId && (
          <div className="px-4 py-3 border-t border-gray-800 bg-[#1a1a1a] flex flex-col sm:flex-row justify-center items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="w-full sm:w-[75%] h-14 border-none rounded-md px-4 py-3 bg-[#2c2c2c] text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Type your request..."
            />
            <button
              onClick={send}
              disabled={loading}
              className="h-14 w-14 flex items-center justify-center bg-accent text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <FiSend size={20} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
