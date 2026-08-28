// =====================================================================
// idlm's AI Workbench — front-end logic
// - Hero search: dispatches to external AI/search engines based on the
//   selected engine, OR (when "chat" is chosen) populates the chat box.
// - Chat: streams responses from /api/chat using fetch + ReadableStream.
// =====================================================================

const ENGINE_URLS = {
  perplexity: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
  chatgpt:    (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
  claude:     (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
  gemini:     (q) => `https://gemini.google.com/app?q=${encodeURIComponent(q)}`,
  phind:      (q) => `https://www.phind.com/search?q=${encodeURIComponent(q)}`,
  you:        (q) => `https://you.com/search?q=${encodeURIComponent(q)}`,
  kagi:       (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  google:     (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
};

// ---------- hero search ----------
const heroForm  = document.getElementById('hero-form');
const heroInput = document.getElementById('hero-input');
const heroEngine = document.getElementById('hero-engine');

heroForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = heroInput.value.trim();
  if (!q) return;
  const engine = heroEngine.value;
  if (engine === 'chat') {
    // Scroll to chat and prefill
    document.getElementById('chat').scrollIntoView({ behavior: 'smooth' });
    const chatInput = document.getElementById('chat-input');
    chatInput.value = q;
    chatInput.focus();
  } else {
    const url = ENGINE_URLS[engine]?.(q);
    if (url) window.open(url, '_blank', 'noopener');
  }
});

// ---------- chat ----------
const messagesEl = document.getElementById('messages');
const chatForm   = document.getElementById('chat-form');
const chatInput  = document.getElementById('chat-input');
const chatSend   = document.getElementById('chat-send');
const chatStatus = document.getElementById('chat-status');

// History persists in localStorage (single conversation)
const HISTORY_KEY = 'idlm_workbench_chat_v1';
let history = [];
try {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (raw) history = JSON.parse(raw);
} catch (_) { /* ignore parse errors */ }

function renderHistory() {
  messagesEl.innerHTML = '';
  if (history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'msg empty';
    empty.textContent = '在上方输入消息开始对话';
    messagesEl.appendChild(empty);
    return;
  }
  for (const m of history) {
    const el = document.createElement('div');
    el.className = `msg ${m.role === 'user' ? 'user' : 'assistant'}`;
    el.textContent = m.content;
    messagesEl.appendChild(el);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function persist() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40))); } catch (_) {}
}
renderHistory();

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // Append the user message and re-render
  history.push({ role: 'user', content: text });
  chatInput.value = '';
  renderHistory();

  // Create a streaming assistant message element
  const assistantEl = document.createElement('div');
  assistantEl.className = 'msg assistant';
  assistantEl.textContent = '';
  messagesEl.scrollTop = messagesEl.scrollHeight;
  // remove the "empty" placeholder if present
  const empty = messagesEl.querySelector('.msg.empty');
  if (empty) empty.remove();
  messagesEl.appendChild(assistantEl);

  chatSend.disabled = true;
  chatStatus.textContent = '正在思考…';

  let responseText = '';
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // strip empty messages; trim history to the last 20
        messages: history.slice(-20),
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP ${res.status}`);
    }
    if (!res.body) {
      throw new Error('no response body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE: split on blank line boundaries
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.delta) {
              responseText += obj.delta;
              assistantEl.textContent = responseText;
              messagesEl.scrollTop = messagesEl.scrollHeight;
            } else if (obj.error) {
              throw new Error(obj.error);
            }
          } catch (parseErr) {
            // ignore malformed chunk
          }
        }
      }
    }

    if (responseText) {
      history.push({ role: 'assistant', content: responseText });
      persist();
      chatStatus.textContent = '';
    } else {
      throw new Error('empty response');
    }
  } catch (err) {
    const errEl = document.createElement('div');
    errEl.className = 'msg error';
    errEl.textContent = `错误: ${err.message || err}`;
    messagesEl.appendChild(errEl);
    chatStatus.textContent = '发送失败,可在 Vercel 项目检查 OPENAI_API_KEY';
  } finally {
    chatSend.disabled = false;
    chatInput.focus();
  }
});
