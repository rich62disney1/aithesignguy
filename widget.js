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
    'a[href*="/cart"]{display:none!important;}' +
    '@keyframes cw-pulse{0%{box-shadow:0 4px 12px rgba(0,0,0,.35),0 0 0 0 rgba(192,57,43,.55);}70%{box-shadow:0 4px 12px rgba(0,0,0,.35),0 0 0 14px rgba(192,57,43,0);}100%{box-shadow:0 4px 12px rgba(0,0,0,.35),0 0 0 0 rgba(192,57,43,0);}}' +
    '#cw-bubble.cw-bubble-listening{animation:cw-pulse 1.6s ease-out infinite;background:#c0392b;}';
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
  function persist() {
    // Do not discard a cross-page arrival while the product page is still
    // assembling its Customily editor. It is cleared only after the browser
    // confirms that Sheriff's microphone has actually started.
    var existing = loadState();
    saveState({
      history: history,
      lastProducts: lastProducts,
      isOpen: isOpen,
      pendingArrival: !!existing.pendingArrival
    });
  }

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

  // On a product page, the sign itself gets the screen, not this panel -
  // the pulsing dot is enough to show Sheriff Rourke is there and working.
  // Only used on product pages (window.__wizHandleVoiceCommand present);
  // never touches the normal full-screen chat experience elsewhere.
  var tuckTimer = null;
  function tuckPanelAway() {
    bubble.classList.add('cw-bubble-listening');
    if (tuckTimer) clearTimeout(tuckTimer);
    tuckTimer = setTimeout(function () { closePanel(); }, 1200);
  }

  var audioEl = new Audio();
  var speechGeneration = 0;
  var speechActive = false;
  var speechText = '';
  var recentSpeechText = '';
  var echoGraceUntil = 0;
  var speechController = null;
  var speechUrl = null;
  var chatGeneration = 0;

  function speechWords(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function isSheriffEcho(text) {
    var heard = speechWords(text);
    if (/^(stop|wait|pause|quiet|hush|be quiet|stop talking|hold on)$/.test(heard)) return false;
    var said = speechActive ? speechText : (Date.now() < echoGraceUntil ? recentSpeechText : '');
    return !!heard && (' ' + speechWords(said) + ' ').indexOf(' ' + heard + ' ') !== -1;
  }
  function interruptSpeech() {
    speechGeneration++;
    if (speechActive) echoGraceUntil = Date.now() + 700;
    speechActive = false;
    speechText = '';
    if (speechController) { speechController.abort(); speechController = null; }
    audioEl.onended = audioEl.onerror = audioEl.onplaying = null;
    try { audioEl.pause(); } catch (e) {}
    if (speechUrl) { URL.revokeObjectURL(speechUrl); speechUrl = null; }
    if (arrivalExample) { arrivalExample.clear(); arrivalExample = null; }
    arrivalIntroInProgress = false;
    processing = false;
  }
  function speak(text, onDone, onStart) {
    var generation = ++speechGeneration;
    speechActive = true;
    speechText = text;
    recentSpeechText = text;
    var controller = new AbortController();
    speechController = controller;
    var finished = false;
    function done() {
      if (generation !== speechGeneration || finished) return;
      finished = true;
      echoGraceUntil = Date.now() + 700;
      speechActive = false;
      speechText = '';
      speechController = null;
      if (speechUrl) { URL.revokeObjectURL(speechUrl); speechUrl = null; }
      if (onDone) onDone();
    }
    // The recognizer stays open while Sheriff speaks so the guest can cut in.
    if (voiceMode) startListening();
    fetch(API + '/tts', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    }).then(function (res) {
      if (!res.ok) throw new Error('tts failed');
      return res.blob();
    }).then(function (blob) {
      if (generation !== speechGeneration) return;
      speechUrl = URL.createObjectURL(blob);
      audioEl.onended = done;
      audioEl.onerror = done;
      audioEl.onplaying = function () {
        if (generation !== speechGeneration) return;
        setStatus('Speaking — you can interrupt');
        if (onStart) { var start = onStart; onStart = null; start(); }
      };
      audioEl.src = speechUrl;
      audioEl.play().catch(done);
    }).catch(done);
  }

  async function send(text) {
    if (!text.trim()) return;
    if (speechActive) interruptSpeech();
    var requestGeneration = ++chatGeneration;
    processing = true;
    // On a product page, the Customily voice wizard exposes its own
    // command handler so Sheriff Rourke's ONE box (typed OR mic) drives
    // the option-picking directly - no separate button, no talking about
    // the change instead of making it. Checked here, in the one place
    // both the Send button/Enter key and the mic's recognized speech
    // funnel through, so neither path can bypass it.
    if (window.__wizHandleVoiceCommand) {
      addMsg(text, 'cw-me');
      inputEl.value = '';
      // The wizard now reports back what it actually did (or, if it just
      // moved to a step without picking anything, what the choices are)
      // so Sheriff Rourke can confirm it instead of silently changing the
      // sign - a guest with no confirmation has no way to know a spoken
      // command landed, which is why repeated "change the edge" attempts
      // showed up in a real test transcript with nothing said back.
      var wizReply = window.__wizHandleVoiceCommand(text);
      // The product itself gets the screen, not the chat panel - as soon
      // as a command (typed OR spoken) reaches the wizard, tuck the panel
      // away and leave just the pulsing dot so the guest can watch the
      // sign actually change.
      tuckPanelAway();
      if (wizReply) { addMsg(wizReply, 'cw-ai'); }
      if (voiceMode && wizReply) {
        setStatus('Speaking...');
        speak(wizReply, function () { processing = false; if (voiceMode) startListening(); });
      } else {
        setStatus('');
        processing = false;
        if (voiceMode) scheduleListening(400);
      }
      return;
    }
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
      if (requestGeneration !== chatGeneration) return;
      addMsg('Sorry, having trouble connecting right now.', 'cw-ai');
      setStatus('');
      processing = false;
      if (voiceMode) startListening();
      return;
    }
    if (requestGeneration !== chatGeneration) return;
    if (data.error) {
      addMsg('Error: ' + data.error, 'cw-ai');
      setStatus('');
      processing = false;
      if (voiceMode) startListening();
      return;
    }
    addMsg(data.reply, 'cw-ai');
    addProducts(data.products);
    if (data.products && data.products.length) { lastProducts = data.products; }
    if (data.action === 'confirmed' && lastProducts.length) {
      setStatus('Opening your sign...');
      var target = lastProducts[0].url + (lastProducts[0].url.indexOf('?') === -1 ? '?' : '&') + 'voice=start';
      var st = loadState();
      st.pendingArrival = true;
      saveState(st);
      setTimeout(function () { window.location.href = target; }, 250);
    }
    history.push({ role: 'assistant', content: JSON.stringify({ reply: data.reply, show: (data.products || []).map(function (p) { return p.name; }), action: data.action }) });
    persist();
    if (voiceMode) {
      setStatus('Speaking...');
      speak(data.reply, function () { processing = false; if (voiceMode) startListening(); });
    } else {
      processing = false;
      setStatus('');
    }
  }

  sendBtn.onclick = function () { send(inputEl.value); };
  inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(inputEl.value); });

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null;
  var recognitionRestartTimer = null;
  var listening = false;
  var voiceMode = false;
  var awaitingArrivalMic = justArrived;
  var arrivalIntroInProgress = false;
  var arrivalExample = null;
  var cancelArrivalWait = null;
  var sheriffRourke = null;
  // True from the moment a heard/typed phrase starts being handled until
  // Sheriff Rourke is fully done with it (chat reply + speech, or the
  // wizard command). Browsers silently end SpeechRecognition after a few
  // seconds of normal mid-sentence silence - onend used to just stop
  // listening for good right there, which is exactly what forced typing
  // instead of talking. Now onend restarts listening itself whenever
  // we're just sitting idle (not mid-response), so a pause doesn't kill
  // hands-free mode.
  var processing = false;

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
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onstart = function () {
      if (rec !== r || !voiceMode) { try { r.abort(); } catch (e) {} return; }
      listening = true;
      // This is the success point: leave the arrival marker in place until
      // the browser has really opened the microphone, not merely until a
      // timer has elapsed.
      if (awaitingArrivalMic) {
        var current = loadState();
        current.pendingArrival = false;
        saveState(current);
        awaitingArrivalMic = false;
      }
    };
    var handledResults = {};
    r.onresult = function (e) {
      if (rec !== r || !voiceMode) return;
      for (var index = e.resultIndex || 0; index < e.results.length; index++) {
        var result = e.results[index];
        var text = result[0].transcript.trim();
        if (!text || handledResults[index]) continue;
        // Also ignore a delayed echo result arriving just after playback ends.
        if (isSheriffEcho(text)) { if (result.isFinal) handledResults[index] = true; continue; }
        if (speechActive) {
          interruptSpeech();
          setStatus('Listening...');
        }
        if (processing) continue;
        if (result.isFinal === false) continue;
        handledResults[index] = true;
        // Stop/wait is an interruption, not wording to put on the sign.
        if (/^(stop|wait|pause|quiet|hush|be quiet|stop talking|hold on)[.!?]*$/i.test(text)) {
          setStatus('Listening...');
          continue;
        }
        send(text);
      }
    };
    var restartDelay = 400;
    r.onerror = function (event) {
      if (rec !== r || !voiceMode) return;
      if (event && ['not-allowed', 'service-not-allowed', 'audio-capture'].indexOf(event.error) !== -1) {
        stopVoiceMode();
        setStatus('Microphone unavailable. Check microphone access, then tap to talk.');
        return;
      }
      restartDelay = 1200;
      setStatus('Reconnecting microphone...');
    };
    r.onend = function () {
      if (rec !== r) return;
      rec = null;
      listening = false;
      if (voiceMode && (!processing || speechActive)) scheduleListening(restartDelay);
    };
    return r;
  }

  function scheduleListening(delay) {
    clearTimeout(recognitionRestartTimer);
    recognitionRestartTimer = null;
    if (!voiceMode || (processing && !speechActive) || rec) return;
    recognitionRestartTimer = setTimeout(function () {
      recognitionRestartTimer = null;
      startListening();
    }, delay);
  }

  function startListening() {
    if (!SR || !voiceMode || (processing && !speechActive) || rec || listening) return;
    clearTimeout(recognitionRestartTimer);
    recognitionRestartTimer = null;
    listening = true;
    setStatus(speechActive ? 'Speaking — you can interrupt' : 'Listening...');
    var next = makeRecognition();
    rec = next;
    try { next.start(); } catch (e) {
      if (rec === next) {
        rec = null;
        listening = false;
        scheduleListening(1200);
      }
    }
  }

  function customilyEditorReady() {
    var editor = document.querySelector('#cl_optionsapp');
    return !!(editor && editor.getBoundingClientRect().height > 10 && editor.querySelector('.customily_option') && window.__wizHandleVoiceCommand);
  }

  function productArrivalGreeting() {
    var names = Array.from(document.querySelectorAll('#cl_optionsapp .customily_option .option_name')).map(function (el) { return el.textContent.toLowerCase(); }).join(' ');
    var choices = [];
    if (/\b(edge|border)\b/.test(names)) choices.push('the edge');
    if (/\b(colou?r)\b/.test(names)) choices.push('the color');
    if (/\b(image|picture|artwork)\b/.test(names)) choices.push('the pictures');
    return choices.length ? 'You can change ' + choices.join(', ').replace(/, ([^,]*)$/, ' and $1') + ' by talking, too.' : 'You can change the words just by talking.';
  }

  function speakProductArrival() {
    if (arrivalIntroInProgress || !voiceMode) return;
    arrivalIntroInProgress = true;
    processing = true;
    arrivalExample = window.__wizCreateSpeechExample ? window.__wizCreateSpeechExample() : null;
    var intro = "Hey, it's super easy. Here's an example.";
    var example = arrivalExample ? 'Make it say ' + arrivalExample.text + '.' : '';
    var after = productArrivalGreeting();
    addMsg(intro + ' ' + example + ' ' + after, 'cw-ai');
    setStatus('Speaking...');
    function finish() {
      if (!arrivalIntroInProgress) return;
      arrivalIntroInProgress = false;
      processing = false;
      if (voiceMode) startListening();
    }
    speak(intro, function () {
      if (!arrivalIntroInProgress || !voiceMode) return;
      if (!example) { speak(after, finish); return; }
      speak(example + ' ' + after, finish, function () {
        if (arrivalIntroInProgress && voiceMode && arrivalExample) arrivalExample.show();
      });
    });
  }

  function resumeSheriffAfterEditorReady() {
    if (!awaitingArrivalMic || !SR) return;
    function begin() {
      if (cancelArrivalWait) cancelArrivalWait();
      voiceMode = true;
      micBtn.textContent = '🔴';
      micBtn.classList.add('cw-mic-active');
      ensureSheriffRourke();
      speakProductArrival();
    }
    if (customilyEditorReady()) { begin(); return; }
    // Customily adds its panel asynchronously. Watch for that exact event
    // for up to one minute; this is not a microphone restart loop.
    var observer = new MutationObserver(function () {
      if (customilyEditorReady()) {
        observer.disconnect();
        clearTimeout(expire);
        begin();
      }
    });
    var expire = setTimeout(function () { cancelArrivalWait(); }, 60000);
    cancelArrivalWait = function () { observer.disconnect(); clearTimeout(expire); cancelArrivalWait = null; };
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  }

  function stopVoiceMode() {
    voiceMode = false;
    interruptSpeech();
    chatGeneration++;
    if (cancelArrivalWait) cancelArrivalWait();
    if (arrivalExample) { arrivalExample.clear(); arrivalExample = null; }
    if (arrivalIntroInProgress) { speechGeneration++; arrivalIntroInProgress = false; processing = false; }
    micBtn.textContent = '🎤';
    micBtn.classList.remove('cw-mic-active');
    bubble.classList.remove('cw-bubble-listening');
    setStatus('');
    try { audioEl.pause(); } catch (e) {}
    clearTimeout(recognitionRestartTimer);
    recognitionRestartTimer = null;
    var stopped = rec;
    rec = null;
    listening = false;
    if (stopped) { try { stopped.abort(); } catch (e) {} }
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
        // First time voice mode kicks in on a fresh visit (no prior chat
        // history, not arriving from a Sheriff-driven navigation), greet
        // out loud before listening - otherwise the guest is left staring
        // at a silent, listening mic with no idea Sheriff Rourke is ready.
        if (!history.length && !justArrived && !window.__wizGreeted) {
          window.__wizGreeted = true;
          openPanel();
          // On a product page the guest already picked their sign - asking
          // "what kind of sign do you have in mind" tells them Sheriff has
          // no idea what they're looking at. Greet in context instead.
          var greeting = window.__wizHandleVoiceCommand
            ? "Howdy! I'm Sheriff Rourke. Let's get this sign fixed up just how you want it - tell me what you'd like to change."
            : "Howdy! I'm Sheriff Rourke. Tell me what kind of sign you have in mind, and I'll get you started.";
          addMsg(greeting, 'cw-ai');
          speak(greeting, function () { if (voiceMode) startListening(); });
        } else {
          startListening();
        }
        // On the product page, Sheriff Rourke's job is to change the sign
        // while the guest WATCHES it change - the chat panel just gets in
        // the way of that. Tuck it away a beat after tapping the mic (so
        // the tap itself still feels responsive) and leave only a small
        // pulsing dot to show he's listening and working. Tapping that
        // dot brings the full panel straight back.
        if (window.__wizHandleVoiceCommand) { tuckPanelAway(); }
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
      // Same rule on arrival as everywhere else on this page: let the
      // guest read the welcome-back message, then get the panel out of
      // the way of the actual sign so there's something to look at.
      if (window.__wizHandleVoiceCommand) { tuckPanelAway(); }
      // Sheriff Rourke was already talking to the guest before this page
      // even loaded - there's no click to make here. Resume listening
      // automatically so "pick a design" flows straight into "start
      // customizing it" with zero taps.
      resumeSheriffAfterEditorReady();
    }
  }
})();
