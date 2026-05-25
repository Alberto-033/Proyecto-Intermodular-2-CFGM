export interface User {
  id: string; // UUID
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface IrrigationLog {
  id: string; // UUID
  timestamp: string;
  moistureLevel: number;
  temperature: number;
  valveState: boolean;
  mode: 'manual' | 'automatic';
  waterDuration?: number; // in seconds
}

export interface SystemState {
  valveState: boolean;
  mode: 'manual' | 'automatic';
  moistureThreshold: number; // moisture level below which irrigation starts (e.g. 30%)
  irrigationDuration: number; // duration of automatic irrigation in seconds (e.g. 10s)
  currentMoisture: number | null;
  currentTemperature: number | null;
  lastIrrigation?: string; // timestamp
}

export interface WsMessage {
  type: 'status_update' | 'command' | 'sensor_data' | 'heartbeat';
  payload: any;
}
