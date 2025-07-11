import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';

const API_BASE = 'https://stresstest-ai.promptpulse.workers.dev';

export default function App() {
  /* ---------- State ---------- */
  const [convos, setConvos] = useState(() => {
    return JSON.parse(localStorage.getItem('convos') || '[]');
  });
  const [activeId, setActiveId] = useState(convos[0]?.id || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const userId = useRef(localStorage.getItem('userId') || 'anon');

  /* ---------- Helpers ---------- */
  const saveConvos = (list) => {
    localStorage.setItem('convos', JSON.stringify(list));
    setConvos(list);
  };

  const loadHistory = async (id) => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(
      `${API_BASE}/chat/history?conversationId=${id}&userId=${userId.current}`
    );
    const hist = await res.json();
    setMessages(hist);
    setLoading(false);
  };

  /* ---------- Effects ---------- */
  useEffect(() => {
    loadHistory(activeId);
  }, [activeId]);

  /* ---------- Send ---------- */
  const send = async () => {
    if (!input.trim() || !activeId) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId.current,
        conversationId: activeId,
        message: input,
      }),
    });
    const data = await res.json();
    const solverMsg = data.history[data.history.length - 1];
    setMessages((prev) => [...prev, solverMsg]);
    setLoading(false);
  };

  /* ---------- New Conversation ---------- */
  const newConvo = () => {
    const id = 'conv-' + Date.now();
    saveConvos([{ id }, ...convos]);
    setActiveId(id);
    setMessages([]);
  };

  /* ---------- Render ---------- */
  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-700 text-lg font-semibold">
          Conversations
        </div>
        <button
          onClick={newConvo}
          className="m-4 px-4 py-2 bg-accent rounded hover:opacity-90"
        >
          + New
        </button>
        <ul className="flex-1 overflow-y-auto">
          {convos.map((c) => (
            <li
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-800 ${
                c.id === activeId ? 'bg-gray-800' : ''
              }`}
            >
              {c.id}
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat */}
      <main className="flex-1 flex flex-col bg-bg text-gray-200">
        <header className="p-4 border-b border-gray-800 shadow">
          StressTest AI
        </header>

        <section className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg shadow ${
                m.role === 'user' ? 'bg-bubble-user' : 'bg-bubble-ai'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold capitalize">{m.role}</span>
                {m.role !== 'user' && (
                  <button
                    className="text-xs text-accent"
                    onClick={() => navigator.clipboard.writeText(m.content)}
                  >
                    Copy
                  </button>
                )}
              </div>
              {/* Corrected Markdown rendering */}
              <div
                className="prose prose-invert prose-sm"
                dangerouslySetInnerHTML=https://operator.chatgpt.com/c/6870edcad03081909a576cc33a5408cd#cua_citation-%20__html:%20marked.parse(m.content)%20
              ></div>
            </div>
          ))}

          {loading && (
            <div className="p-3 rounded-lg shadow bg-bubble-ai opacity-60 italic">
              Thinking…
            </div>
          )}
        </section>

        {/* Input */}
        {activeId && (
          <div className="p-4 border-t border-gray-800 flex gap-2 bg-[#0f0f0f]">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              className="flex-1 border rounded px-3 py-2 bg-[#1a1a1a] text-gray-200"
              placeholder="Type your idea..."
            />
            <button
              onClick={send}
              disabled={loading}
              className="px-5 py-2 bg-accent text-white rounded hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

