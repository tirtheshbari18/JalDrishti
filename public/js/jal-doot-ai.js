/**
 * JalDrishti (जलदृष्टि) - Jal-Doot AI Bilingual Voice & Chat Assistant
 * Provides voice/text query capabilities for Gram Panchayat citizens, Sarpanch, and engineers.
 */

window.JalDootAI = (function() {
  let isListening = false;
  let recognition = null;
  let synth = window.speechSynthesis || null;

  // Initialize Speech Recognition if supported
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN'; // Default to Hindi, can toggle to en-IN

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('jalDootInput');
      if (input) {
        input.value = transcript;
        sendMessage();
      }
      stopListening();
    };

    recognition.onerror = function() {
      stopListening();
      if (window.showToast) window.showToast('Voice input timeout. You can type your query.', 'info');
    };

    recognition.onend = function() {
      stopListening();
    };
  }

  function toggleDrawer() {
    const drawer = document.getElementById('jalDootDrawer');
    const backdrop = document.getElementById('jalDootBackdrop');
    if (!drawer) return;

    if (drawer.classList.contains('active')) {
      drawer.classList.remove('active');
      if (backdrop) backdrop.classList.remove('active');
    } else {
      drawer.classList.add('active');
      if (backdrop) backdrop.classList.add('active');
      const input = document.getElementById('jalDootInput');
      if (input) setTimeout(() => input.focus(), 200);
    }
  }

  function startListening() {
    if (!recognition) {
      if (window.showToast) window.showToast('Speech recognition not supported in this browser.', 'warning');
      return;
    }
    try {
      const micBtn = document.getElementById('jalDootMicBtn');
      if (micBtn) micBtn.classList.add('recording');
      isListening = true;
      recognition.lang = (window.currentLang === 'hi') ? 'hi-IN' : 'en-IN';
      recognition.start();
      if (window.showToast) window.showToast('Listening... Speak now (कृपया बोलें)...', 'info');
    } catch (e) {
      console.error(e);
      stopListening();
    }
  }

  function stopListening() {
    isListening = false;
    const micBtn = document.getElementById('jalDootMicBtn');
    if (micBtn) micBtn.classList.remove('recording');
  }

  function toggleSpeech() {
    if (isListening) {
      if (recognition) recognition.stop();
      stopListening();
    } else {
      startListening();
    }
  }

  function speakText(text) {
    if (!synth) return;
    try {
      synth.cancel(); // Stop any ongoing speech
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = (window.currentLang === 'hi') ? 'hi-IN' : 'en-IN';
      utter.rate = 1.0;
      synth.speak(utter);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  async function sendMessage(presetText) {
    const input = document.getElementById('jalDootInput');
    const text = (presetText || (input ? input.value : '')).trim();
    if (!text) return;

    if (input && !presetText) input.value = '';

    appendMessage('user', text);

    // Show typing placeholder
    const typingId = 'typing-' + Date.now();
    appendTypingIndicator(typingId);

    try {
      const res = await fetch('/api/ai/jal-doot-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          language: window.currentLang || 'hi'
        })
      });
      const result = await res.json();
      removeTypingIndicator(typingId);

      if (result.success) {
        appendMessage('bot', result.reply, result.suggestedAction);
        speakText(result.reply);
      } else {
        appendMessage('bot', 'क्षमा करें, प्रतिक्रिया प्राप्त नहीं हो सकी। (Could not generate response)');
      }
    } catch (err) {
      removeTypingIndicator(typingId);
      appendMessage('bot', 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें। (Network error. Please try again.)');
    }
  }

  function appendMessage(sender, text, action) {
    const container = document.getElementById('jalDootChatMessages');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `jal-doot-msg ${sender === 'user' ? 'msg-user' : 'msg-bot'}`;

    let actionBtnHtml = '';
    if (action) {
      actionBtnHtml = `
        <div style="margin-top: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="JalDootAI.executeAction('${action.type}', '${action.tab || ''}')" style="font-size:0.75rem; padding:4px 10px;">
            ${action.label}
          </button>
        </div>
      `;
    }

    const soundBtnHtml = sender === 'bot' ? `
      <button class="btn-icon-sound" onclick="JalDootAI.speak('${encodeURIComponent(text)}')" title="Listen to response">
        🔊
      </button>
    ` : '';

    msgDiv.innerHTML = `
      <div class="msg-bubble">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>${text}</div>
          ${soundBtnHtml}
        </div>
        ${actionBtnHtml}
      </div>
      <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  function appendTypingIndicator(id) {
    const container = document.getElementById('jalDootChatMessages');
    if (!container) return;
    const typingDiv = document.createElement('div');
    typingDiv.id = id;
    typingDiv.className = 'jal-doot-msg msg-bot';
    typingDiv.innerHTML = `
      <div class="msg-bubble typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    container.appendChild(typingDiv);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function executeAction(type, target) {
    if (type === 'switchTab' && window.switchTab) {
      window.switchTab(target);
      toggleDrawer();
    } else if (type === 'openCertificate' && window.CertificateModal) {
      window.CertificateModal.open();
      toggleDrawer();
    }
  }

  return {
    toggle: toggleDrawer,
    send: sendMessage,
    toggleSpeech: toggleSpeech,
    speak: function(encoded) {
      speakText(decodeURIComponent(encoded));
    },
    executeAction: executeAction
  };
})();
