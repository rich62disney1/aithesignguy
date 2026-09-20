(function () {
  if (window.location.pathname === '/') {
    window.location.replace('/pages/welcome');
    return;
  }

  var API = 'https://calico-concierge.onrender.com';
  var STORAGE_KEY = 'calicoConciergeState';

  function loadState() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveState(s) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var state = loadState();
  var history = state.history || [];
  var lastProducts = state.lastProducts || [];
  var isOpen = !!state.isOpen;
  var justArrived = !!state.pendingArrival;

  var style = document.createElement('style');
  style.textContent =
    '#cw-bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#d69735;color:#1e1611;display:flex;align-items:center;justify-content:center;font-size:26px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.35);z-index:2147483000;font-family:Georgia,serif;}' +
    '#cw-panel{position:fixed;bottom:90px;right:20px;width:330px;max-height:65vh;background:#1e1611;color:#f2e6d8;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.45);display:none;flex-direction:column;font-family:Georgia,serif;z-index:2147483000;overflow:hidden;border:1px solid #3d2c20;}' +
    '#cw-panel.open{display:flex;}' +
    '#cw-sheriff-rourke{width:100%;flex-shrink:0;background:#000;}' +
    '#cw-header{background:#681e17;padding:10px 14px;font-weight:bold;color:#d69735;font-size:14px;display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
    '#cw-close{background:none;border:none;color:#d69735;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;}' +
    '#cw-messages{flex:1;overflow-y:auto;padding:10px;max-height:320px;}' +
    '.cw-msg{padding:8px 12px;border-radius:10px;margin:6px 0;max-width:85%;font-size:13px;line-height:1.35;}' +
    '.cw-me{background:#3d2c20;margin-left:auto;}' +
    '.cw-ai{background:#681e17;}' +
    '.cw-products{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;}' +
    '.cw-products img{width:64px;height:64px;object-fit:cover;border-radius:6px;border:2px solid #d69735;}' +
    '#cw-status{font-size:11px;color:#d69735;padding:0 10px 4px;min-height:14px;}' +
    '#cw-controls{display:flex;gap:6px;padding:10px;border-top:1px solid #3d2c20;}' +
    '#cw-input{flex:1;padding:8px;border-radius:6px;border:none;font-size:13px;}' +
    '#cw-mic,#cw-send{padding:8px 10px;border-radius:6px;border:none;background:#d69735;font-weight:bold;cursor:pointer;font-size:13px;}' +
    '#cw-mic.cw-mic-active{background:#c0392b;color:#fff;}' +
    'a[href*="/cart"]{display:none!important;}';
  document.head.appendChild(style);

  var AVATAR_BASE = API + '/avatar';
  var avatarLink = document.createElement('link');
  avatarLink.rel = 'stylesheet';
  avatarLink.href = AVATAR_BASE + '/sheriff-rourke-avatar.css';
  document.head.appendChild(avatarLink);
  var avatarScript = document.createElement('script');
  avatarScript.src = AVATAR_BASE + '/sheriff-rourke-avatar.js';
  document.head.appendChild(avatarScript);

  var bubble = document.createElement('div');
  bubble.id = 'cw-bubble';
  bubble.textContent = '💬';
  document.body.appendChild(bubble);

  var panel = document.createElement('div');
  panel.id = 'cw-panel';
  panel.innerHTML =
    '<div id="cw-sheriff-rourke" class="sr-avatar" aria-label="Sheriff Rourke"></div>' +
    '<div id="cw-header"><span>Calico Wood Signs — Ask Rich</span><button id="cw-close" aria-label="Close chat">✕</button></div>' +
    '<div id="cw-messages"></div>' +
    '<div id="cw-status"></div>' +
    '<div id="cw-controls">' +
    '<input id="cw-input" placeholder="Type or tap mic...">' +
    '<button id="cw-mic">🎤</button>' +
    '<button id="cw-send">Send</button>' +
    '</div>';
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector('#cw-messages');
  var statusEl = panel.querySelector('#cw-status');
  var inputEl = panel.querySelector('#cw-input');
  var micBtn = panel.querySelector('#cw-mic');
  var sendBtn = panel.querySelector('#cw-send');
  var closeBtn = panel.querySelector('#cw-close');

  function setStatus(t) { statusEl.textContent = t || ''; }
  function persist() { saveState({ history: history, lastProducts: lastProducts, isOpen: isOpen }); }

  function addMsg(text, cls) {
    var d = document.createElement('div');
    d.className = 'cw-msg ' + cls;
    d.textContent = text;
    messagesEl.appendChild(d);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  function addProducts(products) {
    if (!products || !products.length) return;
    var row = document.createElement('div');
    row.className = 'cw-products';
    products.forEach(function (p) {
      var img = document.createElement('img');
      img.src = p.image;
      img.title = p.name;
      row.appendChild(img);
    });
    messagesEl.appendChild(row);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderHistory() {
    history.forEach(function (h) {
      if (h.role === 'user') {
        addMsg(h.content, 'cw-me');
      } else {
        try {
          var parsed = JSON.parse(h.content);
          addMsg(parsed.reply, 'cw-ai');
        } catch (e) {}
      }
    });
  }

  function openPanel() { panel.classList.add('open'); isOpen = true; persist(); }
  function closePanel() { panel.classList.remove('open'); isOpen = false; persist(); }
  bubble.onclick = function () { isOpen ? closePanel() : openPanel(); };
  closeBtn.onclick = function () { closePanel(); };

  var audioEl = new Audio();
  function speak(text, onDone) {
    fetch(API + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    }).then(function (res) {
      if (!res.ok) throw new Error('tts failed');
      return res.blob();
    }).then(function (blob) {
      var url = URL.createObjectURL(blob);
      audioEl.onended = function () { URL.revokeObjectURL(url); if (onDone) onDone(); };
      audioEl.onerror = function () { URL.revokeObjectURL(url); if (onDone) onDone(); };
      audioEl.src = url;
      audioEl.play().catch(function () { if (onDone) onDone(); });
    }).catch(function () {
      if (onDone) onDone();
    });
  }

  async function send(text) {
    if (!text.trim()) return;
    addMsg(text, 'cw-me');
    inputEl.value = '';
    history.push({ role: 'user', content: text });
    persist();
    setStatus('Thinking...');
    var data;
    try {
      var res = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(0, -1) })
      });
      data = await res.json();
    } catch (e) {
      addMsg('Sorry, having trouble connecting right now.', 'cw-ai');
      setStatus('');
      if (voiceMode) startListening();
      return;
    }
    if (data.error) {
      addMsg('Error: ' + data.error, 'cw-ai');
      setStatus('');
      if (voiceMode) startListening();
      return;
    }
    addMsg(data.reply, 'cw-ai');
    addProducts(data.products);
    if (data.products && data.products.length) { lastProducts = data.products; }
    if (data.action === 'confirmed' && lastProducts.length) {
      setStatus("Taking you there — I'll be right here when you get there.");
      var target = lastProducts[0].url;
      var st = loadState();
      st.pendingArrival = true;
      saveState(st);
      setTimeout(function () { window.location.href = target; }, 1800);
    }
    history.push({ role: 'assistant', content: JSON.stringify({ reply: data.reply, show: (data.products || []).map(function (p) { return p.name; }), action: data.action }) });
    persist();
    if (voiceMode) {
      setStatus('Speaking...');
      speak(data.reply, function () { if (voiceMode) startListening(); });
    } else {
      setStatus('');
    }
  }

  sendBtn.onclick = function () { send(inputEl.value); };
  inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(inputEl.value); });

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null;
  var listening = false;
  var voiceMode = false;
  var sheriffRourke = null;

  function ensureSheriffRourke() {
    if (sheriffRourke || !window.SheriffRourkeAvatar) return;
    var avatarEl = panel.querySelector('#cw-sheriff-rourke');
    if (!avatarEl) return;
    sheriffRourke = new window.SheriffRourkeAvatar(avatarEl, {
      rest: AVATAR_BASE + '/rourke-real-smile-rest-transparent-v2.webp',
      ah: AVATAR_BASE + '/rourke-real-smile-ah-transparent-v2.webp',
      oo: AVATAR_BASE + '/rourke-real-smile-oo-transparent-v2.webp',
      ee: AVATAR_BASE + '/rourke-real-smile-ee-transparent-v2.webp',
      mbp: AVATAR_BASE + '/rourke-real-smile-mbp-transparent-v2.webp',
      fv: AVATAR_BASE + '/rourke-real-smile-fv-transparent-v2.webp',
      th: AVATAR_BASE + '/rourke-real-smile-th-transparent-v2.webp',
      l: AVATAR_BASE + '/rourke-real-smile-l-transparent-v2.webp',
      blink: AVATAR_BASE + '/rourke-real-smile-blink-transparent-v2.webp'
    });
    sheriffRourke.attachAudio(audioEl);
  }

  function makeRecognition() {
    var r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = function (e) {
      var transcript = e.results[0][0].transcript;
      // On a product page, the Customily voice wizard (step-wizard v3.1)
      // exposes its own command handler so Sheriff Rourke's ONE mic can
      // drive both the chat AND the option-picking - no second "tap to
      // talk" button, no page refresh loop. If it's present, this is the
      // whole conversation on this page: hand it straight to the wizard
      // instead of the normal chat round-trip, then keep hands-free voice
      // mode listening (the wizard has no reply/TTS step of its own).
      if (window.__wizHandleVoiceCommand) {
        addMsg(transcript, 'cw-me');
        window.__wizHandleVoiceCommand(transcript);
        if (voiceMode) { setTimeout(function () { if (voiceMode) startListening(); }, 400); }
        return;
      }
      send(transcript);
    };
    r.onerror = function () {
      listening = false;
      if (voiceMode) {
        setStatus('Listening error, retrying...');
        setTimeout(function () { if (voiceMode) startListening(); }, 1200);
      }
    };
    r.onend = function () { listening = false; };
    return r;
  }

  function startListening() {
    if (!SR || listening) return;
    listening = true;
    setStatus('Listening...');
    rec = makeRecognition();
    try { rec.start(); } catch (e) { listening = false; }
  }

  function stopVoiceMode() {
    voiceMode = false;
    micBtn.textContent = '🎤';
    micBtn.classList.remove('cw-mic-active');
    setStatus('');
    try { audioEl.pause(); } catch (e) {}
    if (rec) { try { rec.abort(); } catch (e) {} }
    listening = false;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && voiceMode) stopVoiceMode();
  });

  if (SR) {
    micBtn.onclick = function () {
      if (!voiceMode) {
        voiceMode = true;
        micBtn.textContent = '🔴';
        micBtn.classList.add('cw-mic-active');
        try { audioEl.play().catch(function () {}); audioEl.pause(); } catch (e) {}
        ensureSheriffRourke();
        startListening();
      } else {
        stopVoiceMode();
      }
    };
  } else {
    micBtn.style.display = 'none';
  }

  if (history.length) {
    renderHistory();
    openPanel();
    if (justArrived) {
      addMsg("Here we are! Taking you right into the editor — I'm right here if you want to see something else.", 'cw-ai');
      var cleared = loadState();
      cleared.pendingArrival = false;
      saveState(cleared);
    }
  }
})();
