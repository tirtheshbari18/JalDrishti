/**
 * JalDrishti (जलदृष्टि) - Advanced Core Application Controller
 * Jal Jeevan Mission | Ministry of Jal Shakti
 */

// Global Application State
window.AppState = {
  currentLang: 'en',
  currentRole: 'executive',
  currentTab: 'dashboard',
  viewMode: 'simple', // 'simple' (default for everyone) or 'detailed' (for engineers)
  selectedGP: 'GP-RJ-JAI-01',
  schemesData: null,
  fhtcData: null,
  alertsData: [],
  grievancesData: [],
  telemetryTimer: null,
  charts: {}
};

// View Mode Toggle (Simple for Citizens vs Detailed for Engineers)
function setViewMode(mode) {
  window.AppState.viewMode = mode;
  document.body.classList.remove('mode-simple', 'mode-detailed');
  document.body.classList.add(mode === 'detailed' ? 'mode-detailed' : 'mode-simple');

  const btnSimple = document.getElementById('btnModeSimple');
  const btnDetailed = document.getElementById('btnModeDetailed');
  if (btnSimple && btnDetailed) {
    btnSimple.classList.toggle('active', mode === 'simple');
    btnDetailed.classList.toggle('active', mode === 'detailed');
  }

  // If detailed, trigger charts resize
  if (mode === 'detailed') {
    setTimeout(() => {
      if (window.WaterBalance) window.WaterBalance.refresh();
      if (window.WeatherDemand) window.WeatherDemand.init();
      if (window.supplyDiurnalChartInstance) window.supplyDiurnalChartInstance.resize();
    }, 150);
  }
}
window.setViewMode = setViewMode;

// Bilingual Translation Dictionary (Plain Citizen Friendly Language)
const I18N = {
  en: {
    appTitle: 'JalDrishti',
    appSub: 'Jal Jeevan Mission • Rural Drinking Water Service Delivery',
    navDashboard: 'Today\'s Water (आज का पानी)',
    navGis: 'Village Taps & Map (गांव के नल)',
    navCitizen: 'Complaints & Help (शिकायत व सहायता)',
    navWqms: 'Water Quality (पानी की जांच)',
    navAi: 'Engineer Mode (इंजीनियर मोड)',
    navSolar: 'Solar & Green Energy',
    navImis: 'Reports & Certificate',
    totalFhtc: 'Total Monitored Taps',
    functionalRate: 'Functionality Rate',
    sujalGaonCert: 'Sujal Gaon Certified',
    avgLpcd: 'Daily Water (LPCD)',
    activeAlerts: 'Active Warnings',
    inspectTap: 'Inspect Connection',
    resolveAlert: 'Acknowledge & Dispatch',
    syncNow: 'Force IMIS Sync',
    voiceRecord: 'Record Voice Grievance',
    submitReport: 'Submit Grievance'
  },
  hi: {
    appTitle: 'जलदृष्टि',
    appSub: 'जल जीवन मिशन • हर घर नल से जल निगरानी प्रणाली',
    navDashboard: 'आज का पानी (Today\'s Water)',
    navGis: 'गांव के नल व नक्शा (Village Taps)',
    navCitizen: 'शिकायत व सहायता (Complaints & Help)',
    navWqms: 'पानी की जांच (Water Quality)',
    navAi: 'इंजीनियर व अधिकारी (Engineer Mode)',
    navSolar: 'सोलर ग्रिड व ऊर्जा बचत',
    navImis: 'सरकारी रिपोर्ट व प्रमाण पत्र',
    totalFhtc: 'कुल निगरानी नल (FHTCs)',
    functionalRate: 'क्रियाशीलता दर (55 LPCD)',
    sujalGaonCert: 'प्रमाणित सुजल गाँव',
    avgLpcd: 'प्रति व्यक्ति पानी (LPCD)',
    activeAlerts: 'सक्रिय चेतावनियाँ',
    inspectTap: 'नल कनेक्शन जांचें',
    resolveAlert: 'स्वीकार करें व टीम भेजें',
    syncNow: 'आईएमआईएस सिंक करें',
    voiceRecord: 'बोलकर शिकायत दर्ज करें',
    submitReport: 'शिकायत सबमिट करें'
  }
};

// Web Audio Synthesizer for alerts
const SoundFX = {
  ctx: null,
  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playBeep(freq = 440, type = 'sine', duration = 0.2) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play restricted:', e);
    }
  },
  playAlertCritical() {
    this.playBeep(880, 'sawtooth', 0.25);
    setTimeout(() => this.playBeep(660, 'sawtooth', 0.35), 200);
  },
  playSuccess() {
    this.playBeep(523.25, 'sine', 0.15);
    setTimeout(() => this.playBeep(659.25, 'sine', 0.2), 120);
  }
};

// Toast Notifications
function showToast(message, type = 'info', title = 'JalDrishti Notice') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div style="font-size: 1.2rem;">
      ${type === 'danger' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
    </div>
    <div style="flex:1;">
      <div style="font-weight: 700; font-size: 0.82rem; margin-bottom: 2px;">${title}</div>
      <div>${message}</div>
    </div>
    <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1rem;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Tab Switching with URL Hash Sync
function switchTab(tabId) {
  window.AppState.currentTab = tabId;
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  if (history.replaceState) {
    history.replaceState(null, null, `#${tabId}`);
  }

  // Trigger sub-components
  if (tabId === 'dashboard') {
    if (window.WaterBalance) setTimeout(() => window.WaterBalance.refresh(), 200);
    if (window.WeatherDemand) setTimeout(() => window.WeatherDemand.init(), 200);
  }
  if (tabId === 'gis') {
    if (window.GisMap) setTimeout(() => window.GisMap.invalidate(), 200);
    if (window.ValveMatrix) setTimeout(() => window.ValveMatrix.init(), 200);
  }
  if (tabId === 'ai') {
    if (window.AiEngine) setTimeout(() => window.AiEngine.renderChainageChart(), 200);
    if (window.WaveOscilloscope) setTimeout(() => window.WaveOscilloscope.init(), 200);
    if (window.IotTopology) setTimeout(() => window.IotTopology.init(), 200);
  }
  if (tabId === 'solar') {
    if (window.SolarGrid) setTimeout(() => window.SolarGrid.init(), 200);
  }
  if (tabId === 'citizen') {
    if (window.CommunityBroadcast) setTimeout(() => window.CommunityBroadcast.init(), 200);
  }
  if (tabId === 'wqms') {
    if (window.CommunityStewardship) setTimeout(() => window.CommunityStewardship.init(), 200);
  }
}

// Language Switching
function setLanguage(lang) {
  window.AppState.currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (I18N[lang] && I18N[lang][key]) {
      el.textContent = I18N[lang][key];
    }
  });

  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.textContent = lang === 'en' ? 'हिन्दी' : 'English';
  }

  if (window.TelemetryStream) {
    window.TelemetryStream.updateLanguage();
  }
}

// Role Switcher
function setRole(role) {
  window.AppState.currentRole = role;
  const roleBadge = document.getElementById('currentRoleLabel');
  if (roleBadge) {
    const names = {
      executive: 'Executive View',
      engineer: 'Engineer View',
      vwsc: 'Panchayat & Jal Sahiya',
      citizen: 'Citizen View'
    };
    roleBadge.textContent = names[role] || role;
  }

  if (role === 'citizen') {
    switchTab('citizen');
  }
  showToast(`View updated for: ${role.toUpperCase()}`, 'info');
}

// Location Modal & Selection
function openLocationModal() {
  document.getElementById('locationModalOverlay')?.classList.add('active');
}

function closeLocationModal() {
  document.getElementById('locationModalOverlay')?.classList.remove('active');
}

function updateLocationSelection() {
  const gpSelect = document.getElementById('hierarchyGP');
  const label = document.getElementById('currentLocationLabel');
  if (gpSelect && label) {
    const opt = gpSelect.options[gpSelect.selectedIndex];
    label.textContent = opt ? opt.text : 'Rampur GP, Jaipur (Rajasthan)';
  }
}

// Live Search Filter for FHTC Connections
function filterFhtcTable(query) {
  if (!window.AppState.fhtcData) return;
  const q = (query || '').toLowerCase().trim();
  const fhtcs = window.AppState.fhtcData.fhtcs || [];

  if (!q) {
    renderFhtcTable(fhtcs);
    return;
  }

  const filtered = fhtcs.filter(f => 
    (f.consumerName && f.consumerName.toLowerCase().includes(q)) ||
    (f.fhtcId && f.fhtcId.toLowerCase().includes(q)) ||
    (f.wardNumber && f.wardNumber.toLowerCase().includes(q)) ||
    (f.status && f.status.toLowerCase().includes(q))
  );
  renderFhtcTable(filtered);
}

// Initial Data Fetching
async function initApp() {
  setViewMode('simple');
  try {
    // 1. Fetch schemes metadata
    const schemesRes = await fetch('/api/schemes');
    const schemesJson = await schemesRes.json();
    if (schemesJson.success) {
      window.AppState.schemesData = schemesJson.data;
      renderSchemesSummary(schemesJson.data);
    }

    // 2. Fetch FHTC database
    const fhtcRes = await fetch(`/api/fhtcs?gp=${window.AppState.selectedGP}`);
    const fhtcJson = await fhtcRes.json();
    if (fhtcJson.success) {
      window.AppState.fhtcData = fhtcJson.data;
      window.allFhtcs = fhtcJson.data.fhtcs;
      renderFhtcTable(fhtcJson.data.fhtcs);
    }

    // 3. Fetch alerts
    const alertsRes = await fetch('/api/alerts');
    const alertsJson = await alertsRes.json();
    if (alertsJson.success) {
      window.AppState.alertsData = alertsJson.data;
      renderAlertsList(alertsJson.data);
    }

    // 4. Fetch grievances
    const grvRes = await fetch('/api/grievances');
    const grvJson = await grvRes.json();
    if (grvJson.success) {
      window.AppState.grievancesData = grvJson.data;
      if (window.CitizenPortal) {
        window.CitizenPortal.renderGrievanceList(grvJson.data);
      }
    }

    // 5. Initialize Sub-Systems
    if (window.GisMap) window.GisMap.init();
    if (window.TelemetryStream) window.TelemetryStream.init();
    if (window.AiEngine) window.AiEngine.init();
    if (window.ImisSync) window.ImisSync.init();
    if (window.CitizenPortal) window.CitizenPortal.init();
    if (window.WaveOscilloscope) window.WaveOscilloscope.init();
    if (window.SolarGrid) window.SolarGrid.init();
    if (window.ValveMatrix) window.ValveMatrix.init();
    if (window.CommunityBroadcast) window.CommunityBroadcast.init();
    if (window.WaterBalance) window.WaterBalance.init();
    if (window.WeatherDemand) window.WeatherDemand.init();
    if (window.IotTopology) window.IotTopology.init();
    if (window.CommunityStewardship) window.CommunityStewardship.init();

    // 6. Initialize Charts
    initDashboardCharts();

    // Direct hash routing
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'gis', 'ai', 'solar', 'citizen', 'wqms', 'imis'].includes(hash)) {
      switchTab(hash);
    }

  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Connecting to village telemetry server...', 'info');
  }
}

// Summary Rendering
function renderSchemesSummary(data) {
  const sum = data.summary;
  if (!sum) return;

  const fhtcEl = document.getElementById('kpiTotalFhtcs');
  if (fhtcEl) fhtcEl.textContent = Number(sum.totalFHTCs).toLocaleString('en-IN');

  const rateEl = document.getElementById('kpiFunctionalityRate');
  if (rateEl) rateEl.textContent = `${sum.overallFunctionalityRate}%`;

  const sujalEl = document.getElementById('kpiSujalGaon');
  if (sujalEl) sujalEl.textContent = `${sum.sujalGaonCertified} / ${sum.totalVillages}`;

  const lpcdEl = document.getElementById('kpiAvgLpcd');
  if (lpcdEl) lpcdEl.textContent = `${sum.averageLPCD}`;

  const alertsBadge = document.getElementById('headerAlertsBadge');
  if (alertsBadge) alertsBadge.textContent = sum.activeAlertsCount;

  // Render States Leaderboard
  const tableBody = document.getElementById('statesLeaderboardBody');
  if (tableBody && data.states) {
    tableBody.innerHTML = data.states.map((st, i) => `
      <tr>
        <td style="font-weight:700; color:var(--text-muted);">${i + 1}</td>
        <td>
          <div style="font-weight:600;">${st.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-hindi);">${st.hindiName}</div>
        </td>
        <td>${Number(st.totalFHTCs).toLocaleString('en-IN')}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="progress-track" style="width:70px;">
              <div class="progress-fill fill-green" style="width:${st.functionalRate}%;"></div>
            </div>
            <span style="font-weight:700; font-size:0.8rem; color:${st.functionalRate >= 95 ? 'var(--status-functional)' : 'var(--status-warning)'};">
              ${st.functionalRate}%
            </span>
          </div>
        </td>
        <td style="font-weight:600;">${st.avgLPCD} LPCD</td>
        <td>
          <span class="badge ${st.sujalGaonRate >= 90 ? 'badge-success' : 'badge-warning'}">
            ${st.sujalGaonRate}% Certified
          </span>
        </td>
      </tr>
    `).join('');
  }
}

// Render FHTC Table
function renderFhtcTable(fhtcs) {
  const tbody = document.getElementById('fhtcTableBody');
  if (!tbody || !fhtcs) return;

  if (fhtcs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No matching tap connections found.</td></tr>`;
    return;
  }

  tbody.innerHTML = fhtcs.map(f => {
    let statusBadge = 'badge-success';
    if (f.status === 'Low Pressure') statusBadge = 'badge-warning';
    if (f.status === 'Intermittent') statusBadge = 'badge-purple';
    if (f.status === 'Defunct') statusBadge = 'badge-danger';

    return `
      <tr onclick="inspectFhtc('${f.fhtcId}')" style="cursor:pointer;">
        <td style="font-family:monospace; font-weight:700; color:var(--water-electric);">${f.fhtcId}</td>
        <td>
          <div style="font-weight:600;">${f.consumerName}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${f.wardNumber} • ${f.houseNumber}</div>
        </td>
        <td>
          <span style="font-weight:700; color:${f.lpcd >= 55 ? 'var(--status-functional)' : 'var(--status-warning)'};">
            ${f.lpcd} LPCD
          </span>
          <div style="font-size:0.72rem; color:var(--text-muted);">${f.dailyDeliveredLiters} Liters</div>
        </td>
        <td>
          <span style="font-weight:600; color:${f.terminalHeadMeters >= 7 ? 'var(--text-primary)' : 'var(--status-critical)'};">
            ${f.terminalHeadMeters} m (${f.terminalPressureBar} bar)
          </span>
        </td>
        <td>
          <div style="font-size:0.78rem;">Cl: <strong>${f.chlorineMgL} ppm</strong> | Turb: <strong>${f.turbidityNTU} NTU</strong></div>
        </td>
        <td>
          <span class="badge ${statusBadge}">${f.status}</span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="progress-track" style="width:50px;">
              <div class="progress-fill ${f.aiHealthScore >= 80 ? 'fill-green' : f.aiHealthScore >= 50 ? 'fill-amber' : 'fill-red'}" style="width:${f.aiHealthScore}%;"></div>
            </div>
            <span style="font-size:0.78rem; font-weight:700;">${f.aiHealthScore}%</span>
          </div>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); inspectFhtc('${f.fhtcId}')">
            🔍 Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Alerts List
function renderAlertsList(alerts) {
  const container = document.getElementById('activeAlertsList');
  if (!container) return;

  const activeAlerts = alerts.filter(a => !a.isResolved);
  if (activeAlerts.length === 0) {
    container.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--text-muted); background:rgba(16,185,129,0.05); border-radius:var(--radius-md);">
        <span style="font-size:1.4rem;">✅</span><br/>
        <strong>All Systems Normal</strong>
        <div style="font-size:0.8rem; margin-top:4px;">Village water grid is operating within healthy hydraulic parameters.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = activeAlerts.map(a => {
    const isCrit = a.severity === 'CRITICAL';
    return `
      <div class="glass-card" style="margin-bottom:12px; border-left: 4px solid ${isCrit ? 'var(--status-critical)' : 'var(--status-warning)'};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${isCrit ? 'badge-danger' : 'badge-warning'}">${a.severity}</span>
              <span style="font-weight:700; font-size:0.95rem;">${a.type}</span>
            </div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:3px;">
              📍 ${a.location} (${a.village}) • AI Model: <strong>${a.aiModel}</strong> (${a.confidence}% confidence)
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="resolveAlert('${a.id}')">
            ⚡ Dispatch & Resolve
          </button>
        </div>
        <div style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:6px;">
          <strong>Diagnosis:</strong> ${a.diagnosis}
        </div>
        <div style="font-size:0.8rem; color:var(--text-highlight); background:rgba(56, 189, 248, 0.08); padding:6px 10px; border-radius:var(--radius-sm);">
          <strong>Recommended Action:</strong> ${a.action}
        </div>
      </div>
    `;
  }).join('');
}

// Resolve Alert
async function resolveAlert(alertId) {
  try {
    const res = await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      showToast(`Work order WO-${alertId.slice(-4)} closed and technician verified.`, 'success', 'Alert Resolved');
      SoundFX.playSuccess();
      const updated = await (await fetch('/api/alerts')).json();
      window.AppState.alertsData = updated.data;
      renderAlertsList(updated.data);
      const badge = document.getElementById('headerAlertsBadge');
      if (badge) badge.textContent = updated.data.filter(a => !a.isResolved).length;
    }
  } catch (e) {
    showToast('Failed to resolve alert.', 'danger');
  }
}

// Inspect Individual FHTC Modal Drawer with Backdrop
function inspectFhtc(fhtcId) {
  const fhtc = (window.AppState.fhtcData?.fhtcs || []).find(f => f.fhtcId === fhtcId);
  if (!fhtc) return;

  const drawer = document.getElementById('inspectorDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const content = document.getElementById('inspectorDrawerContent');
  if (!drawer || !content) return;

  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <h3 style="font-size:1.2rem; font-weight:800; color:var(--water-electric);">${fhtc.fhtcId}</h3>
        <div style="font-size:0.8rem; color:var(--text-muted);">Sujal Gaon ID: <strong>${fhtc.sujalGaonId}</strong></div>
      </div>
      <span class="badge ${fhtc.status === 'Functional' ? 'badge-success' : fhtc.status === 'Low Pressure' ? 'badge-warning' : 'badge-danger'}">
        ${fhtc.status}
      </span>
    </div>

    <!-- Consumer Identity Card -->
    <div class="glass-card" style="padding:14px; margin-bottom:12px;">
      <div style="font-weight:700; font-size:1rem; margin-bottom:3px;">${fhtc.consumerName}</div>
      <div style="font-family:var(--font-hindi); font-size:0.88rem; color:var(--text-secondary); margin-bottom:8px;">${fhtc.hindiName}</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.8rem;">
        <div>House No: <strong>${fhtc.houseNumber}</strong></div>
        <div>Family Members: <strong>${fhtc.familyMembers}</strong></div>
        <div>Ward: <strong>${fhtc.wardNumber}</strong></div>
        <div>Meter: <strong>${fhtc.meterType}</strong></div>
      </div>
    </div>

    <!-- Real-time Tap Metrics -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
      <div class="glass-card" style="padding:12px; text-align:center;">
        <div style="font-size:0.74rem; color:var(--text-muted); text-transform:uppercase;">Daily Water (LPCD)</div>
        <div style="font-size:1.6rem; font-weight:800; color:${fhtc.lpcd >= 55 ? 'var(--status-functional)' : 'var(--status-warning)'};">
          ${fhtc.lpcd} <span style="font-size:0.75rem;">LPCD</span>
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted);">${fhtc.dailyDeliveredLiters} L Delivered (Norm: 55)</div>
      </div>
      <div class="glass-card" style="padding:12px; text-align:center;">
        <div style="font-size:0.74rem; color:var(--text-muted); text-transform:uppercase;">Terminal Head</div>
        <div style="font-size:1.6rem; font-weight:800; color:${fhtc.terminalHeadMeters >= 7 ? 'var(--water-electric)' : 'var(--status-critical)'};">
          ${fhtc.terminalHeadMeters} <span style="font-size:0.75rem;">m</span>
        </div>
        <div style="font-size:0.72rem; color:var(--text-muted);">Standard: >= 7.0 m head</div>
      </div>
    </div>

    <!-- Water Quality Parameters -->
    <div class="glass-card" style="padding:14px; margin-bottom:12px;">
      <div style="font-weight:700; font-size:0.86rem; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span>BIS 10500 Tap Quality</span>
        <span class="badge badge-success">Potable</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; font-size:0.78rem; text-align:center;">
        <div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:var(--radius-sm);">
          <div style="color:var(--text-muted);">Chlorine</div>
          <div style="font-weight:700; font-size:0.95rem; color:var(--water-cyan);">${fhtc.chlorineMgL} ppm</div>
          <div style="font-size:0.65rem;">(0.2 - 0.5)</div>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:var(--radius-sm);">
          <div style="color:var(--text-muted);">Turbidity</div>
          <div style="font-weight:700; font-size:0.95rem; color:var(--status-functional);">${fhtc.turbidityNTU} NTU</div>
          <div style="font-size:0.65rem;">(< 1.0 Desirable)</div>
        </div>
        <div style="background:rgba(255,255,255,0.04); padding:8px; border-radius:var(--radius-sm);">
          <div style="color:var(--text-muted);">pH Level</div>
          <div style="font-weight:700; font-size:0.95rem;">${fhtc.ph}</div>
          <div style="font-size:0.65rem;">(6.5 - 8.5)</div>
        </div>
      </div>
    </div>

    <!-- AI Tap Health & Telemetry Note -->
    <div class="glass-card" style="padding:14px; margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-weight:700; font-size:0.85rem;">AI Tap Health Score</span>
        <span style="font-weight:800; font-size:1.05rem; color:${fhtc.aiHealthScore >= 80 ? 'var(--status-functional)' : 'var(--status-warning)'};">
          ${fhtc.aiHealthScore} / 100
        </span>
      </div>
      <div class="progress-track" style="margin-bottom:8px;">
        <div class="progress-fill ${fhtc.aiHealthScore >= 80 ? 'fill-green' : fhtc.aiHealthScore >= 50 ? 'fill-amber' : 'fill-red'}" style="width:${fhtc.aiHealthScore}%;"></div>
      </div>
      <div style="font-size:0.8rem; color:var(--text-secondary);">
        ${fhtc.aiNote || 'Connection operating at optimal hydraulic parameters with consistent daily LPCD service.'}
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex; gap:10px;">
      <button class="btn btn-primary" style="flex:1;" onclick="openCitizenGrievanceForTap('${fhtc.fhtcId}')">
        📝 Report Grievance
      </button>
      <button class="btn btn-secondary" onclick="closeInspectorDrawer()">
        ✕ Close
      </button>
    </div>
  `;

  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
}

function closeInspectorDrawer() {
  const drawer = document.getElementById('inspectorDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

function openCitizenGrievanceForTap(fhtcId) {
  closeInspectorDrawer();
  switchTab('citizen');
  const input = document.getElementById('grvFhtcInput');
  if (input) input.value = fhtcId;
  showToast(`Pre-filled Tap Connection: ${fhtcId}`, 'info');
}

// Dashboard Charts
function initDashboardCharts() {
  const ctxSupply = document.getElementById('supplyDiurnalChart')?.getContext('2d');
  if (ctxSupply) {
    const hours = ['00:00','02:00','04:00','06:00','07:00','08:00','09:00','11:00','13:00','15:00','17:00','18:00','19:00','21:00','23:00'];
    window.AppState.charts.supply = new Chart(ctxSupply, {
      type: 'line',
      data: {
        labels: hours,
        datasets: [
          {
            label: 'Actual Supply Flow (LPS)',
            data: [0.5, 0.4, 1.2, 8.8, 9.4, 8.9, 4.2, 1.0, 0.8, 1.1, 7.8, 8.5, 7.2, 1.8, 0.6],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.12)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#38bdf8',
            pointRadius: 3
          },
          {
            label: 'Household Demand Profile (LPS)',
            data: [0.3, 0.2, 0.8, 8.2, 9.1, 8.6, 3.8, 0.9, 0.7, 0.9, 7.4, 8.1, 6.8, 1.4, 0.5],
            borderColor: 'rgba(148, 163, 184, 0.5)',
            borderWidth: 2,
            borderDash: [4, 4],
            fill: false,
            tension: 0.35,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } } },
          tooltip: { backgroundColor: 'rgba(13, 26, 45, 0.9)', titleColor: '#38bdf8' }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } }
        }
      }
    });
  }
}

// Global Event Listeners & Power Keyboard Shortcuts
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // Tab buttons
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Language toggle button
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      setLanguage(window.AppState.currentLang === 'en' ? 'hi' : 'en');
    });
  }

  // Theme toggle (Default is clean light, toggle adds dark-theme)
  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      themeBtn.textContent = isDark ? '☀️' : '🌙';
      showToast(isDark ? 'Dark mode enabled' : 'Clean Light mode enabled', 'info');
    });
  }

  // Power Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // If typing in input or textarea, don't intercept keys
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') document.activeElement.blur();
      return;
    }

    if (e.key === 'Escape') {
      closeInspectorDrawer();
      if (typeof closeChaosModal === 'function') closeChaosModal();
      if (typeof closeRoleModal === 'function') closeRoleModal();
      if (typeof closeLocationModal === 'function') closeLocationModal();
      if (window.CertificateModal) window.CertificateModal.close();
    } else if (e.key === '1') switchTab('dashboard');
    else if (e.key === '2') switchTab('gis');
    else if (e.key === '3') switchTab('ai');
    else if (e.key === '4') switchTab('solar');
    else if (e.key === '5') switchTab('citizen');
    else if (e.key === '6') switchTab('wqms');
    else if (e.key === '7') switchTab('imis');
    else if (e.key.toLowerCase() === 'l') openChaosModal();
    else if (e.key.toLowerCase() === 't') themeBtn?.click();
    else if (e.key.toLowerCase() === 'h') langBtn?.click();
    else if (e.key.toLowerCase() === 'c') window.CertificateModal?.open();
  });

  // Listen for hashchange
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'gis', 'ai', 'solar', 'citizen', 'wqms', 'imis'].includes(hash)) {
      switchTab(hash);
    }
  });
});
