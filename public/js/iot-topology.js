/**
 * JalDrishti (जलदृष्टि) - IoT Telemetry Node Diagnostics & Gateway Topology
 * Real-time monitoring of LoRaWAN, RS485, and Modbus field sensors across the village.
 */

window.IotTopology = (function() {
  let tickerInterval = null;

  async function fetchAndRender() {
    try {
      const res = await fetch('/api/iot-nodes');
      const json = await res.json();
      if (!json.success) return;

      const summary = json.summary;
      const nodes = json.nodes;

      const totalNodesEl = document.getElementById('iotTotalNodes');
      if (totalNodesEl) totalNodesEl.textContent = summary.totalNodes;

      const onlineNodesEl = document.getElementById('iotOnlineNodes');
      if (onlineNodesEl) onlineNodesEl.textContent = `${summary.onlineNodes} / ${summary.totalNodes} Online`;

      const uptimeEl = document.getElementById('iotGatewayUptime');
      if (uptimeEl) uptimeEl.textContent = summary.gatewayUptime;

      const packetLossEl = document.getElementById('iotPacketLoss');
      if (packetLossEl) packetLossEl.textContent = summary.packetLossRate;

      renderNodesGrid(nodes);
      startPacketTicker();
    } catch (e) {
      console.warn('IoT nodes load error:', e);
    }
  }

  function renderNodesGrid(nodes) {
    const container = document.getElementById('iotNodesContainer');
    if (!container) return;

    container.innerHTML = nodes.map(node => {
      const isOk = node.status === 'Online';
      const statusBadge = isOk 
        ? '<span class="badge badge-success">Online</span>'
        : node.status === 'Warning' 
          ? '<span class="badge badge-warning">Warning</span>'
          : '<span class="badge badge-danger">Critical</span>';

      return `
        <div class="iot-node-card ${!isOk ? 'node-alert' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
            <div>
              <div style="font-weight:700; font-size:0.86rem; color:var(--text-primary);">${node.name}</div>
              <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">${node.id} • ${node.protocol}</div>
            </div>
            ${statusBadge}
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin:8px 0; font-size:0.76rem;">
            <div>
              <span style="color:var(--text-muted);">Signal (RSSI):</span>
              <strong style="color:${node.rssi > -80 ? 'var(--status-functional)' : 'var(--status-warning)'};">${node.rssi} dBm</strong>
            </div>
            <div>
              <span style="color:var(--text-muted);">Battery:</span>
              <strong style="color:${node.battery > 50 ? 'var(--status-functional)' : 'var(--status-warning)'};">${node.battery}%</strong>
            </div>
            <div>
              <span style="color:var(--text-muted);">Last Ping:</span>
              <span>${node.lastPingSec}s ago</span>
            </div>
            <div>
              <span style="color:var(--text-muted);">Calibration:</span>
              <span style="color:var(--text-secondary);">${node.calibrationDaysLeft}d valid</span>
            </div>
          </div>

          <div class="progress-track" style="height:3px;">
            <div class="progress-fill ${node.battery > 50 ? 'fill-green' : 'fill-amber'}" style="width: ${node.battery}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function startPacketTicker() {
    const tickerEl = document.getElementById('iotPacketTicker');
    if (!tickerEl || tickerInterval) return;

    const dummyHexes = [
      '01 03 04 05 CE 01 2A 8B E2 [Modbus: Flow=8.9 LPS, Head=15.1m]',
      '80 02 44 2E 11 00 F4 A3 99 [LoRaWAN: WQ Chlorine=0.38 ppm]',
      '01 03 02 00 E8 B8 44 [Modbus: Base Pressure=1.48 Bar]',
      '42 10 99 AA 08 00 23 11 02 [LoRaWAN: OHT Level=78.4% Depth=4.2m]',
      'F1 04 02 02 11 9B CC [RS485: Turbidity=1.1 NTU, pH=7.35]',
      '99 01 00 46 FF 12 AA 33 01 [Zigbee: Valve 2 Position=70% Throttled]'
    ];

    tickerInterval = setInterval(() => {
      const randomHex = dummyHexes[Math.floor(Math.random() * dummyHexes.length)];
      const timeStr = new Date().toLocaleTimeString();
      const line = document.createElement('div');
      line.className = 'packet-line';
      line.innerHTML = `<span style="color:var(--text-muted);">${timeStr}</span> <span style="color:var(--water-electric); font-family:monospace;">RX &lt;--</span> <span style="font-family:monospace; color:#a5f3fc;">${randomHex}</span>`;
      
      tickerEl.insertBefore(line, tickerEl.firstChild);
      if (tickerEl.childNodes.length > 8) {
        tickerEl.removeChild(tickerEl.lastChild);
      }
    }, 2500);
  }

  return {
    init: fetchAndRender
  };
})();
