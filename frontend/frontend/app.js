const API_BASE = 'https://stresstest-ai.<sub>.workers.dev'; // TODO: replace <sub> with your subdomain

let userId = localStorage.getItem('userId') || 'anon';
localStorage.setItem('userId', userId);

let currentId = null;
const convosEl = document.getElementById('convos');
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');

function renderConvos() {
  convosEl.innerHTML = '';
  const convos = JSON.parse(localStorage.getItem('convos') || '[]');
  convos.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.id;
    li.style.cursor = 'pointer';
    li.onclick = () => loadConvo(c.id);
    convosEl.appendChild(li);
  });
}

async function loadConvo(id) {
  currentId = id;
  const res = await fetch(`${API_BASE}/chat/history?conversationId=${id}&userId=${userId}`);
  const history = await res.json();
  messagesEl.innerHTML = '';
  history.forEach(addMsg);
}

function addMsg(m) {
  const div = document.createElement('div');
  div.className = 'msg';
  div.innerHTML = `<span class="user">${m.role}:</span> ${m.content}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function send() {
  const msg = inputEl.value.trim();
  if (!msg || !currentId) return;
  inputEl.value = '';
  addMsg({ role: 'user', content: msg });
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, conversationId: currentId, message: msg })
  });
  const data = await res.json();
  data.history.slice(-3).forEach(addMsg);
}

document.getElementById('send').onclick = send;
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') send();
});

document.getElementById('newConv').onclick = () => {
  const id = 'conv-' + Date.now();
  const convos = JSON.parse(localStorage.getItem('convos') || '[]');
  convos.unshift({ id });
  localStorage.setItem('convos', JSON.stringify(convos));
  renderConvos();
  loadConvo(id);
};

renderConvos();
const existing = JSON.parse(localStorage.getItem('convos') || '[]');
if (existing.length) {
  loadConvo(existing[0].id);
}
