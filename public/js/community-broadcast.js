/**
 * JalDrishti - Community WhatsApp & SMS Broadcast Dispatcher
 * Allows Sarpanches, VWSCs, and Jal Sahiyas to broadcast water alerts to villagers
 */

window.CommunityBroadcast = {
  channel: 'whatsapp',
  targetWard: 'All Wards',

  init() {
    this.setupListeners();
    this.updatePreview();
  },

  setupListeners() {
    const input = document.getElementById('broadcastMessageInput');
    if (input) {
      input.addEventListener('input', () => this.updatePreview());
    }

    const channelBtns = document.querySelectorAll('.channel-select-btn');
    channelBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        channelBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.channel = btn.dataset.channel;
        this.updatePreview();
      });
    });
  },

  setTemplate(type) {
    const input = document.getElementById('broadcastMessageInput');
    if (!input) return;

    if (type === 'normal_supply') {
      input.value = 'जल जीवन मिशन सूचना: आज शाम की जल आपूर्ति 17:30 से 19:30 बजे तक पूर्ण दबाव के साथ सुचारू रूप से की जाएगी। कृपया पानी का सदुपयोग करें। - ग्राम पंचायत रामपुर';
    } else if (type === 'maintenance') {
      input.value = 'आवश्यक सूचना: सेक्टर 4 में मुख्य पाइपलाइन मरम्मत कार्य के कारण वार्ड 2 और 4 में दोपहर 14:00 से 16:00 बजे तक आपूर्ति अस्थायी रूप से बाधित रहेगी। - जल एवं स्वच्छता समिति';
    } else if (type === 'quality_safe') {
      input.value = 'जल गुणवत्ता सूचना: जल सहिया द्वारा आज की गई एफटीके व क्लोरीन जांच में जल पूर्णतः शुद्ध एवं पीने योग्य पाया गया (क्लोरीन 0.38 ppm)। - रामपुरा ग्राम जल समिति';
    }
    this.updatePreview();
  },

  updatePreview() {
    const input = document.getElementById('broadcastMessageInput');
    const msg = input ? input.value : 'जल जीवन मिशन सूचना';
    const previewBody = document.getElementById('phoneMockupBody');
    const previewTitle = document.getElementById('phoneMockupTitle');
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    if (previewTitle) {
      previewTitle.textContent = this.channel === 'whatsapp' ? '💬 JJM Jal Samvad (WhatsApp)' : '📱 Government SMS Alert';
    }

    if (previewBody) {
      previewBody.innerHTML = `
        <div style="background:${this.channel === 'whatsapp' ? '#005c4b' : '#1e293b'}; color:white; padding:10px 12px; border-radius:12px; max-width:85%; font-size:0.8rem; line-height:1.4; box-shadow:0 2px 6px rgba(0,0,0,0.3); word-break:break-word;">
          <div style="font-weight:700; font-size:0.74rem; color:${this.channel === 'whatsapp' ? '#53bdeb' : '#38bdf8'}; margin-bottom:3px;">
            💧 JJM Rampur Water Grid
          </div>
          <div>${msg}</div>
          <div style="text-align:right; font-size:0.65rem; color:rgba(255,255,255,0.6); margin-top:4px;">
            ${nowTime} ${this.channel === 'whatsapp' ? '✓✓' : ''}
          </div>
        </div>
      `;
    }
  },

  async sendBroadcast() {
    const input = document.getElementById('broadcastMessageInput');
    const msg = input ? input.value.trim() : '';
    if (!msg) {
      showToast('Please type a message before broadcasting.', 'warning');
      return;
    }

    const sendBtn = document.getElementById('sendBroadcastBtn');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = '⏳ Broadcasting to Villagers...';
    }

    try {
      const res = await fetch('/api/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: this.channel,
          targetWard: this.targetWard,
          message: msg
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success', 'Broadcast Successful');
        SoundFX.playSuccess();
        this.renderBroadcastLog(json.data);
      }
    } catch (e) {
      showToast('Failed to dispatch broadcast.', 'danger');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = '📲 Send Broadcast to Villagers';
      }
    }
  },

  renderBroadcastLog(log) {
    const container = document.getElementById('recentBroadcastsList');
    if (!container) return;

    const item = document.createElement('div');
    item.style.cssText = 'background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:10px 14px; border-radius:var(--radius-md); font-size:0.8rem; margin-bottom:8px;';
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="font-weight:700; color:var(--water-electric);">${log.broadcastId} (${log.channel.toUpperCase()})</span>
        <span class="badge badge-success">Delivered: ${log.deliveredCount} / ${log.recipientCount} (98.8%)</span>
      </div>
      <div style="color:var(--text-secondary); margin-bottom:4px; font-style:italic;">"${log.message}"</div>
      <div style="font-size:0.72rem; color:var(--text-muted);">${log.sarpanchApproval} • Just now</div>
    `;
    container.prepend(item);
  }
};
