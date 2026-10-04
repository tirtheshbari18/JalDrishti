/**
 * JalDrishti (जलदृष्टि) - Global Spotlight Command Palette (Ctrl+K / Cmd+K)
 * Fast fuzzy search across taps, navigation, simulations, and JJM features.
 */

window.CommandPalette = (function() {
  let isOpen = false;
  let selectedIndex = 0;
  let filteredItems = [];

  const defaultCommands = [
    { type: 'nav', title: 'Overview Dashboard (डैशबोर्ड)', icon: '📊', category: 'Navigation', action: () => window.switchTab('dashboard') },
    { type: 'nav', title: 'Village Tap Map & Valve Matrix (मानचित्र व वाल्व)', icon: '🗺️', category: 'Navigation', action: () => window.switchTab('gis') },
    { type: 'nav', title: 'AI Wavelet & Failure Predictor (एआई विफलता भविष्यवक्ता)', icon: '🧠', category: 'Navigation', action: () => window.switchTab('ai') },
    { type: 'nav', title: 'Solar Micro-Grid & Green Energy (सोलर व हरित ग्रिड)', icon: '☀️', category: 'Navigation', action: () => window.switchTab('solar') },
    { type: 'nav', title: 'Citizen Grievance & WhatsApp Broadcast (नागरिक संवाद)', icon: '🗣️', category: 'Navigation', action: () => window.switchTab('citizen') },
    { type: 'nav', title: 'Water Purity & WQMS Surveillance (जल गुणवत्ता)', icon: '🧪', category: 'Navigation', action: () => window.switchTab('wqms') },
    { type: 'nav', title: 'JJM Government Reports & Certificate (रिपोर्ट व प्रमाण पत्र)', icon: '🌐', category: 'Navigation', action: () => window.switchTab('imis') },
    
    // Simulations
    { type: 'sim', title: 'Simulate Pipeline Burst (Sector 4 Rupture)', icon: '💥', category: 'Simulation', action: () => triggerChaos('burst') },
    { type: 'sim', title: 'Simulate Residual Chlorine Drop (< 0.10 ppm)', icon: '⚠️', category: 'Simulation', action: () => triggerChaos('chlorine_drop') },
    { type: 'sim', title: 'Reset Water Grid to Normal Healthy State', icon: '🟢', category: 'Simulation', action: () => triggerChaos('reset') },

    // Features & Modals
    { type: 'action', title: 'Open Har Ghar Jal Official Certificate', icon: '🏅', category: 'Action', action: () => window.CertificateModal && window.CertificateModal.open() },
    { type: 'action', title: 'Ask Jal-Doot AI Assistant (बोलकर पूछें)', icon: '🤖', category: 'Action', action: () => window.JalDootAI && window.JalDootAI.toggle() },
    { type: 'action', title: 'Download JJM Compliance Audit Report (JSON)', icon: '📄', category: 'Action', action: () => window.exportAuditReport && window.exportAuditReport() },
    { type: 'action', title: 'Sync with National IMIS Gateway Now', icon: '🔄', category: 'Action', action: () => window.ImisSync && window.ImisSync.syncNow() },
    { type: 'action', title: 'Toggle Light / Dark Mode Theme', icon: '🌓', category: 'Preference', action: () => window.toggleTheme && window.toggleTheme() },
    { type: 'action', title: 'Switch Language (हिन्दी / English)', icon: '🌐', category: 'Preference', action: () => window.toggleLanguage && window.toggleLanguage() }
  ];

  function init() {
    window.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && isOpen) {
        close();
      }
    });
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  function open() {
    isOpen = true;
    const modal = document.getElementById('commandPaletteModal');
    if (!modal) return;
    modal.classList.add('active');
    const input = document.getElementById('commandPaletteInput');
    if (input) {
      input.value = '';
      input.focus();
    }
    renderResults('');
  }

  function close() {
    isOpen = false;
    const modal = document.getElementById('commandPaletteModal');
    if (modal) modal.classList.remove('active');
  }

  function triggerChaos(type) {
    fetch('/api/simulate/chaos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: type })
    }).then(r => r.json()).then(res => {
      if (window.showToast) window.showToast(res.message, res.state && res.state.isBurstActive ? 'error' : 'success');
      if (window.TelemetryStream) window.TelemetryStream.fetchLiveData();
    });
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    const listContainer = document.getElementById('commandPaletteList');
    if (!listContainer) return;

    let items = [...defaultCommands];

    // Also include FHTC search if typed query
    if (q.length >= 2 && window.allFhtcs && window.allFhtcs.length) {
      const matchedFhtcs = window.allFhtcs.filter(f => 
        f.fhtcId.toLowerCase().includes(q) || 
        f.consumerName.toLowerCase().includes(q) ||
        f.wardNumber.toLowerCase().includes(q)
      ).slice(0, 5);

      matchedFhtcs.forEach(f => {
        items.unshift({
          type: 'fhtc',
          title: `${f.consumerName} (${f.fhtcId}) - ${f.wardNumber.startsWith('Ward') ? f.wardNumber : 'Ward ' + f.wardNumber}`,
          sub: `${f.lpcd} LPCD • ${f.terminalPressureBar} Bar • ${f.status.toUpperCase()}`,
          icon: f.status === 'functional' ? '🟢' : f.status === 'low_pressure' ? '🟡' : '🔴',
          category: 'Household Tap (FHTC)',
          action: () => {
            window.switchTab('gis');
            setTimeout(() => {
              if (window.inspectFhtc) window.inspectFhtc(f.fhtcId);
            }, 300);
          }
        });
      });
    }

    if (q) {
      items = items.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.category.toLowerCase().includes(q) ||
        (item.sub && item.sub.toLowerCase().includes(q))
      );
    }

    filteredItems = items;
    selectedIndex = 0;

    if (filteredItems.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
          🔍 No commands or taps found for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filteredItems.map((item, idx) => `
      <div class="cmd-item ${idx === selectedIndex ? 'selected' : ''}" data-idx="${idx}" onclick="CommandPalette.select(${idx})">
        <div class="cmd-item-icon">${item.icon}</div>
        <div class="cmd-item-content">
          <div class="cmd-item-title">${item.title}</div>
          ${item.sub ? `<div class="cmd-item-sub">${item.sub}</div>` : ''}
        </div>
        <span class="cmd-item-badge">${item.category}</span>
      </div>
    `).join('');
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredItems.length;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        select(selectedIndex);
      }
    }
  }

  function updateSelection() {
    const items = document.querySelectorAll('.cmd-item');
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function select(idx) {
    const item = filteredItems[idx];
    if (item && item.action) {
      close();
      item.action();
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    init,
    open,
    close,
    toggle,
    renderResults,
    handleKeydown,
    select
  };
})();
