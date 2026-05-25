import { t } from '../i18n.ts';
import api from '../api.ts';
import { showToast } from './common.ts';

interface LogRow {
  id: string;
  timestamp: string;
  moistureLevel: number;
  temperature: number;
  valveState: boolean;
  mode: 'manual' | 'automatic';
  waterDuration?: number;
}

export const renderDashboard = (container: HTMLElement) => {
  let state = {
    valveState: false,
    mode: 'automatic',
    moistureThreshold: 35,
    irrigationDuration: 15,
    currentMoisture: null as number | null,
    currentTemperature: null as number | null,
    lastIrrigation: ''
  };

  let logs: LogRow[] = [];
  // Stores last 30 moisture readings for the sparkline chart
  const moistureHistory: number[] = [];
  const MAX_HISTORY = 30;

  // --- Helpers ---

  const timeAgo = (isoString: string | undefined): string => {
    if (!isoString) return t('never');
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return t('just_now');
    if (diff < 3600) return t('minutes_ago', { n: String(Math.floor(diff / 60)) });
    if (diff < 86400) return t('hours_ago', { n: String(Math.floor(diff / 3600)) });
    return t('days_ago', { n: String(Math.floor(diff / 86400)) });
  };

  const renderChart = (): string => {
    if (moistureHistory.length < 2) {
      return `<div style="height:90px;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:0.88rem;gap:8px;">
        <span class="waiting-signal-badge">⏳ ${t('chart_collecting')}</span>
      </div>`;
    }
    const W = 600, H = 80;
    const pts = moistureHistory.map((v, i) => {
      const x = (i / (moistureHistory.length - 1)) * W;
      const y = H - (v / 100) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = moistureHistory[moistureHistory.length - 1];
    const lastX = W;
    const lastY = (H - (last / 100) * H).toFixed(1);
    const areaPath = `M ${pts[0]} L ${pts.join(' L ')} L ${W},${H} L 0,${H} Z`;

    return `
      <div class="chart-y-labels">
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div class="chart-svg-wrapper">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:90px;display:block;">
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0.02"/>
            </linearGradient>
            <!-- Horizontal grid lines -->
          </defs>
          <line x1="0" y1="${H * 0.5}" x2="${W}" y2="${H * 0.5}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4,4"/>
          <path d="${areaPath}" fill="url(#chart-grad)"/>
          <polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="${lastX}" cy="${lastY}" r="5" fill="var(--accent-color)" stroke="var(--bg-base)" stroke-width="2"/>
        </svg>
      </div>
    `;
  };

  const updateChart = () => {
    const el = container.querySelector('#moisture-chart') as HTMLElement;
    if (el) el.innerHTML = renderChart();
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const sep = ',';
    const headers = [
      t('col_time'), t('col_moisture'), t('col_temp'),
      t('col_state'), t('col_mode'), t('col_duration')
    ];
    const rows = logs.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      l.moistureLevel,
      l.temperature,
      l.valveState ? 'ON' : 'OFF',
      l.mode,
      l.waterDuration != null ? `${l.waterDuration}s` : ''
    ]);
    const csv = [headers.join(sep), ...rows.map(r => r.join(sep))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-riego-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Render helpers ---

  const moistureDisplay = (): string => {
    if (state.currentMoisture !== null) return `${state.currentMoisture}%`;
    return `<span class="waiting-signal-badge">⏳ ${t('waiting_signal')}</span>`;
  };

  const tempDisplay = (): string => {
    if (state.currentTemperature !== null) return `${state.currentTemperature}°C`;
    return `<span class="waiting-signal-badge">⏳ ${t('waiting_signal')}</span>`;
  };

  const renderLogRows = (): string => {
    if (logs.length === 0) {
      return `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary);padding:30px;">${t('no_logs')}</td></tr>`;
    }
    return logs.map(l => {
      const date = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const day  = new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `
        <tr>
          <td>
            <div style="font-weight:500;">${date}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);">${day}</div>
          </td>
          <td>💧 ${l.moistureLevel}%</td>
          <td>🌡️ ${l.temperature != null ? l.temperature + '°C' : '—'}</td>
          <td><span class="valve-tag ${l.valveState ? 'on' : 'off'}">${l.valveState ? 'ON' : 'OFF'}</span></td>
          <td style="font-size:0.85rem;color:var(--text-secondary);font-weight:500;">${l.mode === 'automatic' ? 'Auto' : 'Manual'}</td>
          <td style="font-size:0.85rem;color:var(--text-secondary);">${l.waterDuration != null ? l.waterDuration + 's' : '—'}</td>
        </tr>`;
    }).join('');
  };

  // --- Main render ---
  const updateView = () => {
    const historyBtnsDisabled = logs.length === 0 ? 'opacity:0.4;cursor:not-allowed;' : '';
    container.innerHTML = `
      <div class="container">
        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:15px;">
          <div>
            <h1 style="font-size:2.2rem;font-weight:700;color:var(--text-primary);">${t('nav_dashboard')}</h1>
            <p style="color:var(--text-secondary);">${t('system_status')}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
            <div class="status-badge ${state.valveState ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              ${state.valveState ? t('valve_active') : t('valve_inactive')}
            </div>
            <div class="last-irrigation-info">
              🕐 ${t('last_irrigation_label')}: <strong>${timeAgo(state.lastIrrigation)}</strong>
            </div>
          </div>
        </div>

        <!-- Metrics row -->
        <div class="metrics-row">
          <div class="card metric-card">
            <div class="metric-icon">💧</div>
            <div class="metric-info">
              <span class="metric-label">${t('moisture_sensor')}</span>
              <span class="metric-value" id="live-moisture" style="font-size:${state.currentMoisture !== null ? '1.8rem' : '1rem'};">${moistureDisplay()}</span>
            </div>
          </div>
          <div class="card metric-card">
            <div class="metric-icon">🌡️</div>
            <div class="metric-info">
              <span class="metric-label">${t('temp_sensor')}</span>
              <span class="metric-value" id="live-temperature" style="font-size:${state.currentTemperature !== null ? '1.8rem' : '1rem'};">${tempDisplay()}</span>
            </div>
          </div>
          <div class="card metric-card">
            <div class="metric-icon">🚰</div>
            <div class="metric-info">
              <span class="metric-label">${t('valve_status')}</span>
              <span class="metric-value" id="live-valve" style="color:${state.valveState ? 'var(--success-color)' : 'var(--text-secondary)'};">
                ${state.valveState ? t('valve_open') : t('valve_closed')}
              </span>
            </div>
          </div>
        </div>

        <!-- Humidity sparkline chart -->
        <div class="card chart-card">
          <h2 class="card-title" style="margin-bottom:8px;">📈 ${t('chart_title')}</h2>
          <div class="chart-container" id="moisture-chart">
            ${renderChart()}
          </div>
        </div>

        <!-- Main grid -->
        <div class="dashboard-grid">
          <!-- Left: Controls -->
          <div style="display:flex;flex-direction:column;gap:30px;">
            <div class="card">
              <h2 class="card-title">⚙️ ${t('system_status')}</h2>
              <div class="mode-switch-group">
                <button class="mode-btn ${state.mode === 'automatic' ? 'active' : ''}" id="mode-auto-btn">🔄 ${t('mode_auto')}</button>
                <button class="mode-btn ${state.mode === 'manual' ? 'active' : ''}" id="mode-manual-btn">🎮 ${t('mode_manual')}</button>
              </div>
              <form id="config-form">
                <div class="slider-group">
                  <div class="slider-header">
                    <label for="threshold-slider">${t('moisture_threshold')}</label>
                    <span class="slider-val" id="threshold-val">${state.moistureThreshold}%</span>
                  </div>
                  <input type="range" id="threshold-slider" class="slider-input" min="0" max="100" value="${state.moistureThreshold}"/>
                </div>
                <div class="slider-group">
                  <div class="slider-header">
                    <label for="duration-slider">${t('irrigation_duration')}</label>
                    <span class="slider-val" id="duration-val">${state.irrigationDuration}s</span>
                  </div>
                  <input type="range" id="duration-slider" class="slider-input" min="5" max="120" value="${state.irrigationDuration}"/>
                </div>
                <button type="submit" class="btn-primary" style="margin-top:10px;">💾 ${t('save_config_btn')}</button>
              </form>
            </div>

            <div class="card" id="manual-controls-card" style="display:${state.mode === 'manual' ? 'block' : 'none'}">
              <h2 class="card-title">🕹️ Control Manual</h2>
              <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.95rem;">
                Activa o desactiva la electroválvula del agua con un solo clic.
              </p>
              <div style="display:flex;gap:15px;">
                <button id="valve-on-btn" class="btn-primary" style="background:linear-gradient(135deg,var(--success-color),#059669);box-shadow:0 4px 12px rgba(16,185,129,0.3);flex:1;">
                  💧 ${t('manual_irrigate_on')}
                </button>
                <button id="valve-off-btn" class="btn-secondary" style="border-color:var(--danger-color);color:var(--danger-color);flex:1;">
                  ❌ ${t('manual_irrigate_off')}
                </button>
              </div>
            </div>
          </div>

          <!-- Right: History -->
          <div class="card" style="display:flex;flex-direction:column;height:100%;">
            <h2 class="card-title" style="margin-bottom:10px;">📜 ${t('history_title')}</h2>
            <div class="table-wrapper" style="flex:1;max-height:480px;overflow-y:auto;">
              <table>
                <thead>
                  <tr>
                    <th>${t('col_time')}</th>
                    <th>${t('col_moisture')}</th>
                    <th>${t('col_temp')}</th>
                    <th>${t('col_state')}</th>
                    <th>${t('col_mode')}</th>
                    <th>${t('col_duration')}</th>
                  </tr>
                </thead>
                <tbody id="logs-tbody">${renderLogRows()}</tbody>
              </table>
            </div>
            <div style="display:flex;gap:10px;margin-top:14px;">
              <button id="export-csv-btn" class="btn-secondary" style="font-size:0.88rem;${historyBtnsDisabled}">
                📥 ${t('export_csv_btn')}
              </button>
              <button id="clear-logs-btn" class="btn-secondary" style="border-color:var(--danger-color);color:var(--danger-color);font-size:0.88rem;${historyBtnsDisabled}">
                🗑️ ${t('clear_history_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    bindEvents();
  };

  // --- Events ---
  const bindEvents = () => {
    container.querySelector('#mode-auto-btn')?.addEventListener('click', async () => {
      if (state.mode === 'automatic') return;
      try {
        state = { ...state, ...await api.saveConfig({ mode: 'automatic' }) };
        updateView();
        showToast('Modo de riego automático activado.', 'success');
      } catch (err: any) { showToast(err.message || 'Error al cambiar de modo', 'error'); }
    });

    container.querySelector('#mode-manual-btn')?.addEventListener('click', async () => {
      if (state.mode === 'manual') return;
      try {
        state = { ...state, ...await api.saveConfig({ mode: 'manual' }) };
        updateView();
        showToast('Modo manual habilitado.', 'info');
      } catch (err: any) { showToast(err.message || 'Error al cambiar de modo', 'error'); }
    });

    const thresholdSlider = container.querySelector('#threshold-slider') as HTMLInputElement;
    const thresholdVal    = container.querySelector('#threshold-val') as HTMLElement;
    thresholdSlider?.addEventListener('input', () => { thresholdVal.innerText = `${thresholdSlider.value}%`; });

    const durationSlider = container.querySelector('#duration-slider') as HTMLInputElement;
    const durationVal    = container.querySelector('#duration-val') as HTMLElement;
    durationSlider?.addEventListener('input', () => { durationVal.innerText = `${durationSlider.value}s`; });

    container.querySelector('#config-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        state = { ...state, ...await api.saveConfig({
          moistureThreshold: parseInt(thresholdSlider.value, 10),
          irrigationDuration: parseInt(durationSlider.value, 10)
        }) };
        showToast(t('config_saved_success'), 'success');
      } catch { showToast(t('config_saved_error'), 'error'); }
    });

    container.querySelector('#valve-on-btn')?.addEventListener('click', async () => {
      try {
        state = { ...state, ...await api.controlValve('ON') };
        updateView();
        showToast('Válvula de agua activada.', 'success');
      } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    });

    container.querySelector('#valve-off-btn')?.addEventListener('click', async () => {
      try {
        state = { ...state, ...await api.controlValve('OFF') };
        updateView();
        showToast('Válvula de agua cerrada.', 'info');
      } catch (err: any) { showToast(err.message || 'Error', 'error'); }
    });

    const exportBtn = container.querySelector('#export-csv-btn') as HTMLButtonElement;
    exportBtn?.addEventListener('click', () => { if (logs.length > 0) exportCSV(); });

    const clearBtn = container.querySelector('#clear-logs-btn') as HTMLButtonElement;
    clearBtn?.addEventListener('click', async () => {
      if (logs.length === 0) return;
      if (!confirm(t('clear_history_confirm'))) return;
      try {
        await api.clearLogs();
        logs = [];
        const tbody = container.querySelector('#logs-tbody') as HTMLElement;
        if (tbody) tbody.innerHTML = renderLogRows();
        clearBtn.style.opacity = '0.4';
        clearBtn.style.cursor = 'not-allowed';
        exportBtn.style.opacity = '0.4';
        exportBtn.style.cursor = 'not-allowed';
        showToast(t('clear_history_success'), 'success');
      } catch { showToast(t('clear_history_error'), 'error'); }
    });
  };

  // --- WebSocket handler ---
  const handleWsMessage = (msg: any) => {
    if (msg.type !== 'status_update') return;

    const prevValveState = state.valveState;
    state = { ...state, ...msg.payload };

    // Push moisture to history for sparkline
    if (state.currentMoisture !== null) {
      moistureHistory.push(state.currentMoisture);
      if (moistureHistory.length > MAX_HISTORY) moistureHistory.shift();
      updateChart();
    }

    // Live metric updates
    const moistureEl = container.querySelector('#live-moisture') as HTMLElement;
    if (moistureEl) {
      moistureEl.style.fontSize = state.currentMoisture !== null ? '1.8rem' : '1rem';
      moistureEl.innerHTML = moistureDisplay();
    }

    const tempEl = container.querySelector('#live-temperature') as HTMLElement;
    if (tempEl) {
      tempEl.style.fontSize = state.currentTemperature !== null ? '1.8rem' : '1rem';
      tempEl.innerHTML = tempDisplay();
    }

    const valveEl = container.querySelector('#live-valve') as HTMLElement;
    if (valveEl) {
      valveEl.innerText = state.valveState ? t('valve_open') : t('valve_closed');
      valveEl.style.color = state.valveState ? 'var(--success-color)' : 'var(--text-secondary)';
    }

    const badge = container.querySelector('.status-badge') as HTMLElement;
    if (badge) {
      badge.className = `status-badge ${state.valveState ? 'active' : 'inactive'}`;
      badge.innerHTML = `<span class="status-dot"></span>${state.valveState ? t('valve_active') : t('valve_inactive')}`;
    }

    const lastIrrigEl = container.querySelector('.last-irrigation-info strong') as HTMLElement;
    if (lastIrrigEl) lastIrrigEl.innerText = timeAgo(state.lastIrrigation);

    if (state.mode === 'automatic') {
      (container.querySelector('#manual-controls-card') as HTMLElement)?.style.setProperty('display', 'none');
      container.querySelector('#mode-auto-btn')?.classList.add('active');
      container.querySelector('#mode-manual-btn')?.classList.remove('active');
    } else {
      (container.querySelector('#manual-controls-card') as HTMLElement)?.style.setProperty('display', 'block');
      container.querySelector('#mode-auto-btn')?.classList.remove('active');
      container.querySelector('#mode-manual-btn')?.classList.add('active');
    }

    // Reload logs only when valve state changes (new DB entry was written)
    if (prevValveState !== state.valveState) loadLogs();
  };

  const loadLogs = async () => {
    try {
      logs = await api.getLogs();
      const tbody = container.querySelector('#logs-tbody') as HTMLElement;
      if (tbody) tbody.innerHTML = renderLogRows();
      // Sync button states
      const disabled = logs.length === 0 ? '0.4' : '1';
      (container.querySelector('#clear-logs-btn') as HTMLElement)?.style.setProperty('opacity', disabled);
      (container.querySelector('#export-csv-btn') as HTMLElement)?.style.setProperty('opacity', disabled);
    } catch (e) { console.error('Error loading logs:', e); }
  };

  const init = async () => {
    try {
      const data = await api.getSystemState();
      state = { ...state, ...data };
      logs = await api.getLogs();
      updateView();
      api.connectWebSocket(handleWsMessage);
    } catch (e) { console.error('Dashboard init error:', e); }
  };

  init();
  return () => { api.unsubscribeWebSocket(handleWsMessage); };
};
