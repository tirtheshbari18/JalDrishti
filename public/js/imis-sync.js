/**
 * JalDrishti JJM-IMIS & Sujal Gaon Integration Hub
 * Ministry of Jal Shakti National Gateway Bridge
 */

window.ImisSync = {
  imisData: null,

  async init() {
    await this.fetchStatus();
    this.setupListeners();
  },

  async fetchStatus() {
    try {
      const res = await fetch('/api/imis/status');
      const json = await res.json();
      if (json.success && json.data) {
        this.imisData = json.data;
        this.renderOverview(json.data.imisConfig);
        this.renderSujalGaonTable(json.data.sujalGaonRegistry);
        this.renderSyncLogs(json.data.recentSyncLogs);
        this.renderSamplePayload();
      }
    } catch (e) {
      console.warn('IMIS status fetch error:', e);
    }
  },

  renderOverview(config) {
    const epEl = document.getElementById('imisEndpointText');
    if (epEl) epEl.textContent = config.endpoint;

    const gwEl = document.getElementById('imisGatewayId');
    if (gwEl) gwEl.textContent = config.gatewayId;

    const syncEl = document.getElementById('imisLastSyncText');
    if (syncEl) syncEl.textContent = new Date(config.lastSuccessfulSync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const totalEl = document.getElementById('imisTotalBatches');
    if (totalEl) totalEl.textContent = Number(config.totalBatchesProcessed).toLocaleString('en-IN');
  },

  renderSujalGaonTable(registry) {
    const tbody = document.getElementById('sujalGaonTableBody');
    if (!tbody || !registry) return;

    tbody.innerHTML = registry.map(v => {
      const isCertified = v.harGharJalStatus.includes('Certified');
      return `
        <tr>
          <td style="font-weight:700; color:var(--water-electric); font-family:monospace;">${v.sujalGaonId}</td>
          <td>
            <div style="font-weight:600;">${v.village}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${v.gramPanchayat}, ${v.district} (${v.state})</div>
          </td>
          <td>
            <div style="font-weight:700;">${v.functionalFHTCs} / ${v.targetHouseholds}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${v.functionalityRate}% Verified</div>
          </td>
          <td>
            <span class="badge ${isCertified ? 'badge-success' : 'badge-warning'}">
              ${v.harGharJalStatus}
            </span>
          </td>
          <td style="font-size:0.8rem; color:var(--text-secondary);">${v.thirdPartyAuditAgency}</td>
          <td>
            <span style="font-size:0.78rem; font-weight:600; color:${v.syncState === 'Synchronized' ? 'var(--status-functional)' : 'var(--status-critical)'};">
              ● ${v.syncState}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderSyncLogs(logs) {
    const container = document.getElementById('imisRecentLogsContainer');
    if (!container || !logs) return;

    container.innerHTML = logs.map(l => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:var(--radius-sm); margin-bottom:8px; font-size:0.82rem;">
        <div>
          <div style="font-weight:700; color:var(--water-electric); font-family:monospace;">${l.batchId}</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${l.payloadSummary}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:var(--status-functional); font-weight:700;">${l.status}</div>
          <div style="font-size:0.72rem; color:var(--text-muted);">${l.latencyMs}ms latency</div>
        </div>
      </div>
    `).join('');
  },

  renderSamplePayload() {
    const codeEl = document.getElementById('imisJsonPayloadViewer');
    if (!codeEl) return;

    const samplePayload = {
      gatewayProtocolVersion: "2.4.1",
      syncTimestamp: new Date().toISOString(),
      stateCode: "RJ",
      districtCode: "JAI",
      gramPanchayatCode: "GP-RJ-JAI-01",
      sujalGaonId: "SG-RJ-JAI-1042",
      certificationAudit: {
        harGharJalCertified: true,
        auditAgency: "Quality Council of India (QCI)",
        gramSabhaResolutionPassed: true
      },
      schemeTelemetry: {
        schemeId: "JJM-RJ-0492-RAMPUR",
        dailyLitersSupplied: 125000,
        averageLPCDDelivered: 57.2,
        benchmarkStandardLPCD: 55.0,
        complianceRatePercent: 96.5,
        terminalPressureCompliancePercent: 94.2,
        waterQualityIndex: {
          freeResidualChlorinePpm: 0.38,
          turbidityNTU: 1.1,
          ph: 7.35,
          biologicalContaminationDetected: false
        }
      },
      aiPredictiveHealth: {
        gridAnomalyScore: 0.08,
        activeWorkOrders: 1,
        resolvedGrievancesLast24h: 3
      }
    };

    codeEl.textContent = JSON.stringify(samplePayload, null, 2);
  },

  setupListeners() {
    const syncBtn = document.getElementById('forceImisSyncBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '⏳ Syncing with JJM IMIS...';

        try {
          const res = await fetch('/api/imis/sync-now', { method: 'POST' });
          const json = await res.json();
          if (json.success) {
            showToast(`Batch ${json.syncResult.batchId} pushed successfully (${json.syncResult.latencyMs}ms).`, 'success', 'JJM-IMIS Synchronized');
            SoundFX.playSuccess();
            await this.fetchStatus();
          }
        } catch (e) {
          showToast('Failed to reach JJM IMIS gateway.', 'danger');
        } finally {
          syncBtn.disabled = false;
          syncBtn.innerHTML = '🔄 Force Immediate IMIS Sync';
        }
      });
    }

    const exportBtn = document.getElementById('exportAuditReportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.open('/api/export/compliance-report', '_blank');
        showToast('Official JJM Compliance Audit Report generated.', 'info');
      });
    }
  }
};
