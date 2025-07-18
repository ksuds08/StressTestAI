const API_BASE = 'https://stresstest-ai.promptpulse.workers.dev';

/* ---------- State ---------- */
let userId = localStorage.getItem('userId') || 'anon';
localStorage.setItem('userId', userId);

let currentId = null;
const convosKey = 'convos';
const starters = [
  "Generate an idea about AI fitness apps",
  "I have an idea: Uber for lawn care",
  "Pivot this idea for SMBs",
  "Show 3 monetization models"
];

/* ---------- DOM ---------- */
const convosEl   = document.getElementById('convos');
const messagesEl = document.getElementById('messages');
const inputEl    = document.getElementById('input');
const sendBtn    = document.getElementById('send');
const inputArea  = document.getElementById('inputArea');  // new

/* ---------- Helpers ---------- */
function saveConvos(list) { localStorage.setItem(convosKey, JSON.stringify(list)); }
function loadConvos() { return JSON.parse(localStorage.getItem(convosKey) || '[]'); }

function renderConvos() {
  convosEl.innerHTML = '';
  loadConvos().forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.id;
    li.className = `px-4 py-2 cursor-pointer hover:bg-gray-800 ${c.id === currentId ? 'bg-gray-800' : ''}`;
    li.onclick = () => loadConvo(c.id);
    convosEl.appendChild(li);
  });
}

function createMsgElement(m, isLoading = false) {
  const div = document.createElement('div');
  div.className = `p-3 rounded-lg shadow ${m.role === 'user' ? 'bg-blue-100 self-end' : 'bg-gray-200'} ${isLoading ? 'opacity-60 italic' : ''}`;
  div.innerHTML = `
    <div class="flex justify-between items-center">
      <span class="font-semibold capitalize">${m.role}</span>
      ${isLoading ? '' : `<button class="text-xs text-blue-600" onclick="navigator.clipboard.writeText(\`${m.content.replace(/`/g,'\\`')}\`)">Copy</button>`}
    </div>
    <div class="mt-1 prose prose-sm">${marked.parse(m.content)}</div>
  `;
  return div;
}

function addMsg(m, isLoading = false) {
  const div = createMsgElement(m, isLoading);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

async function loadConvo(id) {
  currentId = id;
  renderConvos();
  inputArea.classList.remove('hidden');  // show input area
  messagesEl.innerHTML = '<p class="text-gray-500">Loading...</p>';
  const res = await fetch(`${API_BASE}/chat/history?conversationId=${id}&userId=${userId}`);
  const history = await res.json();
  messagesEl.innerHTML = '';
  history.forEach(addMsg);
}

/* ---------- Send (Solver‑only display + Loading) ---------- */
async function send() {
  const msg = inputEl.value.trim();
  if (!msg || !currentId) return;

  // Disable UI during request
  inputEl.disabled = true;
  sendBtn.disabled = true;
  sendBtn.classList.add('opacity-50', 'cursor-not-allowed');

  inputEl.value = '';
  addMsg({ role: 'user', content: msg });

  // Show loading placeholder
  const loadingDiv = addMsg({ role: 'solver', content: 'Thinking…' }, true);

  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, conversationId: currentId, message: msg })
    });
    const data = await res.json();

    // Replace loading placeholder with actual Solver reply
    const solverMsg = data.history[data.history.length - 1];
    const newDiv = createMsgElement(solverMsg);
    loadingDiv.replaceWith(newDiv);
  } catch (err) {
    loadingDiv.replaceWith(createMsgElement({ role: 'system', content: 'Error fetching reply.' }));
    console.error(err);
  } finally {
    // Re‑enable UI
    inputEl.disabled = false;
    sendBtn.disabled = false;
    sendBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    inputEl.focus();
  }
}

/* ---------- Event Listeners ---------- */
sendBtn.onclick = send;
inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

document.getElementById('newConv').onclick = () => {
  const id = 'conv-' + Date.now();
  saveConvos([{ id }, ...loadConvos()]);
  renderConvos();
  loadConvo(id);
};

/* ---------- Starter Prompts ---------- */
const startersEl = document.getElementById('starters');
starters.forEach(text => {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = 'px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm';
  btn.onclick = () => { inputEl.value = text; send(); };
  startersEl.appendChild(btn);
});

/* ---------- Init ---------- */
renderConvos();
const existing = loadConvos();
if (existing.length) loadConvo(existing[0].id);

