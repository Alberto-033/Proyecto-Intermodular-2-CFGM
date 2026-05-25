import { t } from '../i18n.ts';
import api from '../api.ts';

export const renderArduinoSimulator = (container: HTMLElement) => {
  // --- Simulated sensor state (mirrors what a real ESP32 would read) ---
  let simulatedMoisture = 50.0;
  let simulatedTemperature = 22.0;
  let valveState = false;
  let packetsSent = 0;
  let uptimeSeconds = 0;

  // Interval handles for cleanup on tab switch
  let sendInterval: ReturnType<typeof setInterval> | null = null;
  let driftInterval: ReturnType<typeof setInterval> | null = null;
  let uptimeInterval: ReturnType<typeof setInterval> | null = null;

  // --- Natural sensor drift (simulates real soil physics) ---
  // Called every 3s — mirrors how a real sensor reading changes between Arduino loop ticks
  const applyDrift = () => {
    if (valveState) {
      // Valve open: soil absorbs water, moisture rises 0.8–2.0% per tick
      simulatedMoisture = Math.min(100, simulatedMoisture + Math.random() * 1.2 + 0.8);
    } else {
      // Valve closed: evaporation + plant uptake, moisture falls 0.1–0.4% per tick
      simulatedMoisture = Math.max(0, simulatedMoisture - Math.random() * 0.3 + 0.1);
    }
    // Temperature: ±0.2 °C random walk (realistic ambient fluctuation)
    simulatedTemperature = parseFloat(
      Math.max(5, Math.min(50, simulatedTemperature + (Math.random() - 0.5) * 0.4)).toFixed(1)
    );

    // Update slider positions and labels live (like reading a live sensor)
    const ms = container.querySelector('#sim-moisture-slider') as HTMLInputElement;
    const mv = container.querySelector('#sim-moisture-val') as HTMLElement;
    const ts = container.querySelector('#sim-temp-slider') as HTMLInputElement;
    const tv = container.querySelector('#sim-temp-val') as HTMLElement;

    const rounded = Math.round(simulatedMoisture);
    if (ms) ms.value = String(rounded);
    if (mv) mv.innerText = `${rounded}%`;
    if (ts) ts.value = String(simulatedTemperature);
    if (tv) tv.innerText = `${simulatedTemperature}°C`;
  };

  // Blink TX/RX indicator for 300ms on every packet send
  const flashTx = () => {
    const txEl = container.querySelector('#sim-tx-rx') as HTMLElement;
    if (!txEl) return;
    txEl.style.color = '#10b981';
    txEl.style.fontWeight = '700';
    setTimeout(() => {
      txEl.style.color = '#88c9a1';
      txEl.style.fontWeight = '400';
    }, 300);
  };

  // Send current sensor readings to backend (like Arduino's WebSocket.sendTXT)
  const sendCurrentData = () => {
    const moisture = Math.round(simulatedMoisture);
    api.sendSensorData(moisture, simulatedTemperature);
    packetsSent++;
    flashTx();

    const pktEl = container.querySelector('#sim-packets-sent') as HTMLElement;
    if (pktEl) pktEl.innerText = String(packetsSent);
  };

  // Update connection status badge in the board UI
  const updateConnectionStatus = (connected: boolean) => {
    const statusEl = container.querySelector('#sim-connection-status') as HTMLElement;
    if (!statusEl) return;
    if (connected) {
      statusEl.innerHTML = `<span style="color:#10b981">●</span> ${t('sim_status_online')}`;
    } else {
      statusEl.innerHTML = `<span style="color:#ef4444">●</span> ${t('sim_reconnecting')}`;
    }
  };

  const updateUptime = () => {
    uptimeSeconds++;
    const el = container.querySelector('#sim-uptime') as HTMLElement;
    if (!el) return;
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    const s = uptimeSeconds % 60;
    el.innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Start all simulation loops (mirrors the Arduino setup() + loop())
  const startSimulation = () => {
    // Drift every 3 seconds (between Arduino loop ticks)
    driftInterval = setInterval(applyDrift, 3000);
    // Send to backend every 10 seconds — matches real Arduino delay(10000) in loop()
    sendInterval = setInterval(sendCurrentData, 10000);
    // Uptime counter
    uptimeInterval = setInterval(updateUptime, 1000);
    // Send immediately on boot (like Arduino's first loop iteration)
    sendCurrentData();
  };

  const stopSimulation = () => {
    if (driftInterval) { clearInterval(driftInterval); driftInterval = null; }
    if (sendInterval) { clearInterval(sendInterval); sendInterval = null; }
    if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; }
  };

  // --- Render ---
  const updateView = () => {
    const rounded = Math.round(simulatedMoisture);
    container.innerHTML = `
      <div class="container">
        <div style="margin-bottom: 30px;">
          <h1 style="font-size: 2.2rem; font-weight: 700; color: var(--text-primary);">${t('sim_title')}</h1>
          <p style="color: var(--text-secondary);">${t('sim_description')}</p>
        </div>

        <div class="sim-grid">
          <!-- Arduino PCB visual -->
          <div class="sim-board">
            <div id="sim-connection-status" class="sim-connection-status">
              <span style="color:#10b981">●</span> ${t('sim_status_online')}
            </div>

            <h3 style="font-weight: 700; font-size: 1.1rem; color: #10b981; letter-spacing: 1px; margin-bottom: 4px;">
              ARDUINO UNO R4 / ESP32
            </h3>
            <p style="font-size: 0.8rem; color: #88c9a1; margin-bottom: 20px;">MODEL: SMART-IRR-01</p>

            <div class="board-chip">MCU: ESP32-WROOM-32E</div>

            <!-- Relay LED indicator -->
            <div style="text-align: center; margin: 24px 0;">
              <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: #88c9a1; margin-bottom: 8px;">
                ${t('sim_relay_state')}
              </div>
              <div class="board-led ${valveState ? 'active' : ''}" id="sim-relay-led"></div>
              <div id="sim-relay-status-text" style="margin-top: 12px; font-weight: 600; font-size: 0.95rem; color: ${valveState ? 'var(--accent-color)' : '#999'}">
                ${valveState ? t('sim_relay_active') : t('sim_relay_inactive')}
              </div>
            </div>

            <!-- Serial monitor stats -->
            <div style="border-top: 1px solid rgba(25,120,70,0.3); padding-top: 14px; margin-top: 8px; font-family: monospace; font-size: 0.72rem; color: #88c9a1; display: flex; flex-direction: column; gap: 5px;">
              <div style="display: flex; justify-content: space-between;">
                <span>UPTIME</span>
                <span id="sim-uptime">00:00:00</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>PACKETS</span>
                <span id="sim-packets-sent">${packetsSent}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span id="sim-tx-rx">TX/RX</span>
                <span>PORT :3001</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 6px; border-top: 1px solid rgba(25,120,70,0.2);">
                <span>MOISTURE</span>
                <span style="color:#10b981">${rounded}%</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>TEMP</span>
                <span style="color:#f59e0b">${simulatedTemperature}°C</span>
              </div>
            </div>
          </div>

          <!-- Controls panel -->
          <div style="display: flex; flex-direction: column; gap: 30px;">
            <div class="card">
              <h2 class="card-title">🎮 ${t('sim_panel_title')}</h2>
              <p style="color: var(--text-secondary); font-size: 0.92rem; margin-bottom: 8px;">
                ${t('sim_auto_update_desc')}
              </p>
              <p style="color: var(--text-secondary); font-size: 0.82rem; margin-bottom: 24px; opacity: 0.7;">
                ${t('sim_sends_interval')}
              </p>

              <div class="slider-group">
                <div class="slider-header">
                  <label for="sim-moisture-slider">${t('sim_soil_slider')}</label>
                  <span class="slider-val" id="sim-moisture-val" style="color: #10b981;">${rounded}%</span>
                </div>
                <input type="range" id="sim-moisture-slider" class="slider-input" min="0" max="100" value="${rounded}" style="background: rgba(16,185,129,0.15);"/>
              </div>

              <div class="slider-group">
                <div class="slider-header">
                  <label for="sim-temp-slider">${t('sim_temp_slider')}</label>
                  <span class="slider-val" id="sim-temp-val" style="color: #f59e0b;">${simulatedTemperature}°C</span>
                </div>
                <input type="range" id="sim-temp-slider" class="slider-input" min="5" max="50" value="${simulatedTemperature}" style="background: rgba(245,158,11,0.15);"/>
              </div>

              <button id="send-now-btn" class="btn-secondary" style="margin-top: 8px; font-size: 0.88rem;">
                📤 ${t('send_now_btn')}
              </button>
            </div>

            <!-- Physical board connection card -->
            <div class="card">
              <h2 class="card-title">🔌 ${t('phys_title')}</h2>
              <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 16px;">
                ${t('phys_desc')}
              </p>

              <div class="form-group" style="margin-bottom: 0;">
                <label>${t('phys_token')}</label>
                <div style="display: flex; gap: 10px; margin-top: 6px;">
                  <input type="text" class="form-input" style="font-family: monospace; font-size: 0.85rem;" readonly value="${api.getToken() || t('not_logged_in')}" />
                  <button id="copy-token-btn" class="btn-secondary" style="width: auto; padding: 0 16px;">
                    📋
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    // Moisture slider — override drift, send immediately
    const moistureSlider = container.querySelector('#sim-moisture-slider') as HTMLInputElement;
    const moistureVal = container.querySelector('#sim-moisture-val') as HTMLElement;
    moistureSlider?.addEventListener('input', () => {
      simulatedMoisture = parseInt(moistureSlider.value, 10);
      moistureVal.innerText = `${simulatedMoisture}%`;
      sendCurrentData();
    });

    // Temperature slider — override drift, send immediately
    const tempSlider = container.querySelector('#sim-temp-slider') as HTMLInputElement;
    const tempVal = container.querySelector('#sim-temp-val') as HTMLElement;
    tempSlider?.addEventListener('input', () => {
      simulatedTemperature = parseFloat(tempSlider.value);
      tempVal.innerText = `${simulatedTemperature}°C`;
      sendCurrentData();
    });

    // Manual "send now" button
    container.querySelector('#send-now-btn')?.addEventListener('click', () => {
      sendCurrentData();
    });

    // Copy token to clipboard
    container.querySelector('#copy-token-btn')?.addEventListener('click', () => {
      const token = api.getToken() || '';
      navigator.clipboard.writeText(token).then(() => {
        const btn = container.querySelector('#copy-token-btn') as HTMLButtonElement;
        if (btn) { btn.innerText = '✅'; setTimeout(() => { btn.innerText = '📋'; }, 1500); }
      });
    });
  };

  // WebSocket message handler (valve state + connection events)
  const handleWsMessage = (msg: any) => {
    if (msg.type === 'ws_connected') {
      updateConnectionStatus(true);
      return;
    }
    if (msg.type === 'ws_disconnected') {
      updateConnectionStatus(false);
      return;
    }
    if (msg.type === 'status_update') {
      valveState = msg.payload.valveState;

      const led = container.querySelector('#sim-relay-led') as HTMLElement;
      if (led) led.classList.toggle('active', valveState);

      const statusText = container.querySelector('#sim-relay-status-text') as HTMLElement;
      if (statusText) {
        statusText.innerText = valveState ? t('sim_relay_active') : t('sim_relay_inactive');
        statusText.style.color = valveState ? 'var(--accent-color)' : '#999';
      }
    }
  };

  const init = async () => {
    try {
      const data = await api.getSystemState();
      valveState = data.valveState;
      // Seed sliders with last known real sensor values (if any)
      if (data.currentMoisture !== null) simulatedMoisture = data.currentMoisture;
      if (data.currentTemperature !== null) simulatedTemperature = data.currentTemperature;

      updateView();
      api.connectWebSocket(handleWsMessage);
      startSimulation();
    } catch (e) {
      console.error('Simulator init error:', e);
    }
  };

  init();

  // Cleanup: called automatically when the user switches tabs
  return () => {
    stopSimulation();
    api.unsubscribeWebSocket(handleWsMessage);
  };
};
