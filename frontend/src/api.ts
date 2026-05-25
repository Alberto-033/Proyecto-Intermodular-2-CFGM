const API_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:3001';

export class ApiClient {
  private token: string | null = null;
  private ws: WebSocket | null = null;
  private wsCallbacks: ((event: any) => void)[] = [];

  constructor() {
    this.token = localStorage.getItem('irrigation_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('irrigation_token', token);
    } else {
      localStorage.removeItem('irrigation_token');
      this.closeWebSocket();
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Authentication API
  public async login(email: string, password: string): Promise<any> {
    const data = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    return data.user;
  }

  public async register(username: string, email: string, password: string): Promise<any> {
    const data = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
    this.setToken(data.token);
    return data.user;
  }

  public async getMe(): Promise<any> {
    return this.request<any>('/auth/me');
  }

  // System Configuration API
  public async getSystemState(): Promise<any> {
    return this.request<any>('/system/state');
  }

  public async saveConfig(config: { mode?: string; moistureThreshold?: number; irrigationDuration?: number }): Promise<any> {
    return this.request<any>('/system/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  public async controlValve(action: 'ON' | 'OFF'): Promise<any> {
    return this.request<any>('/system/control', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  // System Logs
  public async getLogs(): Promise<any[]> {
    return this.request<any[]>('/system/logs');
  }

  public async clearLogs(): Promise<void> {
    await this.request<any>('/system/logs', { method: 'DELETE' });
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.request<any>('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  // --- WEBSOCKET SERVICES ---

  // Subscribe a callback and ensure the socket is open. Idempotent: calling twice
  // with the same callback only registers it once.
  public connectWebSocket(onMessage: (data: any) => void) {
    if (!this.wsCallbacks.includes(onMessage)) {
      this.wsCallbacks.push(onMessage);
    }
    this.ensureWebSocketConnected();
  }

  // Opens (or re-opens after drop) the WebSocket without touching wsCallbacks.
  private ensureWebSocketConnected() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('Frontend connected to WebSocket Server.');
        this.wsCallbacks.forEach(cb => cb({ type: 'ws_connected' }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.wsCallbacks.forEach(cb => cb(data));
        } catch (e) {
          console.error('Error parsing WebSocket data:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed. Retrying in 3 seconds...');
        this.wsCallbacks.forEach(cb => cb({ type: 'ws_disconnected' }));
        setTimeout(() => this.ensureWebSocketConnected(), 3000);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket client error:', err);
      };
    } catch (e) {
      console.error('Could not create WebSocket client:', e);
    }
  }

  public sendSensorData(moisture: number, temperature: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'sensor_data',
        payload: { moisture, temperature }
      }));
    }
  }

  public unsubscribeWebSocket(onMessage: (data: any) => void) {
    this.wsCallbacks = this.wsCallbacks.filter(cb => cb !== onMessage);
  }

  private closeWebSocket() {
    if (this.ws) {
      this.ws.onclose = null; // Prevent auto-reconnection
      this.ws.close();
      this.ws = null;
    }
    this.wsCallbacks = [];
  }
}

export const api = new ApiClient();
export default api;
