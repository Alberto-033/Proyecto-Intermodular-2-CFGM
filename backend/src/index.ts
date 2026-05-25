import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import bcrypt from 'bcryptjs';
import {
  initDatabase,
  createUser,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  getConfigValue,
  setConfigValue,
  addIrrigationLog,
  getIrrigationLogs,
  clearIrrigationLogs
} from './db.js';
import { SystemState, WsMessage } from './types.js';

// Setup Express
const app = express();
app.use(cors());
app.use(express.json());

// Server ports
const PORT = process.env.PORT || 3001;

// Global System State (In-Memory Cache synced with DB)
// currentMoisture and currentTemperature are null until real sensor data arrives
let systemState: SystemState = {
  valveState: false,
  mode: 'automatic',
  moistureThreshold: 35,
  irrigationDuration: 15,
  currentMoisture: null,
  currentTemperature: null,
  lastIrrigation: undefined
};

// Automatic Irrigation Control Logic
let irrigationTimer: NodeJS.Timeout | null = null;
let lastLogTime = 0;
const LOG_INTERVAL = 30000; // Log to database every 30 seconds or when state changes

// Active WebSocket Connections (clients = frontend, arduino = real or simulated)
const activeSockets = new Set<WebSocket>();

const broadcast = (message: WsMessage) => {
  const payloadStr = JSON.stringify(message);
  activeSockets.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payloadStr);
    }
  });
};

// Update and sync the state
const updateSystemState = async (updates: Partial<SystemState>, forceLog = false) => {
  const previousState = { ...systemState };
  systemState = { ...systemState, ...updates };

  // Sync to database if settings changed
  if (updates.mode !== undefined) {
    await setConfigValue('mode', systemState.mode);
  }
  if (updates.moistureThreshold !== undefined) {
    await setConfigValue('moistureThreshold', systemState.moistureThreshold.toString());
  }
  if (updates.irrigationDuration !== undefined) {
    await setConfigValue('irrigationDuration', systemState.irrigationDuration.toString());
  }
  if (updates.valveState !== undefined) {
    await setConfigValue('valveState', systemState.valveState ? '1' : '0');
  }

  // Track whether automatic mode already wrote a log to avoid double-logging
  let autoModeLogged = false;

  // Handle Automatic Mode Logic
  if (systemState.mode === 'automatic' && systemState.currentMoisture !== null) {
    if (systemState.currentMoisture < systemState.moistureThreshold) {
      // Trigger automatic irrigation if valve is off
      if (!systemState.valveState && !irrigationTimer) {
        console.log(`[Auto Mode] Moisture (${systemState.currentMoisture}%) is below threshold (${systemState.moistureThreshold}%). Starting irrigation!`);
        systemState.valveState = true;
        systemState.lastIrrigation = new Date().toISOString();
        await setConfigValue('valveState', '1');

        await addIrrigationLog(
          systemState.currentMoisture,
          systemState.currentTemperature!,
          true,
          'automatic',
          systemState.irrigationDuration
        );
        autoModeLogged = true;

        // Turn off automatically after the duration
        irrigationTimer = setTimeout(async () => {
          console.log(`[Auto Mode] Irrigation finished after ${systemState.irrigationDuration}s.`);
          systemState.valveState = false;
          await setConfigValue('valveState', '0');
          irrigationTimer = null;

          if (systemState.currentMoisture !== null) {
            await addIrrigationLog(
              systemState.currentMoisture,
              systemState.currentTemperature!,
              false,
              'automatic'
            );
          }

          broadcast({ type: 'status_update', payload: systemState });
        }, systemState.irrigationDuration * 1000);
      }
    } else {
      // Moisture restored — turn off valve if it was auto-opened without a timer
      if (systemState.valveState && !irrigationTimer) {
        console.log(`[Auto Mode] Soil moisture restored to ${systemState.currentMoisture}%. Shutting off valve.`);
        systemState.valveState = false;
        await setConfigValue('valveState', '0');
        await addIrrigationLog(
          systemState.currentMoisture,
          systemState.currentTemperature!,
          false,
          'automatic'
        );
        autoModeLogged = true;
      }
    }
  }

  // Periodic / event-driven log — skip if automatic mode already logged this cycle,
  // and skip entirely when no sensor data is available yet.
  const now = Date.now();
  const valveChanged = previousState.valveState !== systemState.valveState;
  const modeChanged = previousState.mode !== systemState.mode;
  const hasSensorData = systemState.currentMoisture !== null && systemState.currentTemperature !== null;

  if (!autoModeLogged && hasSensorData && (valveChanged || modeChanged || forceLog || (now - lastLogTime > LOG_INTERVAL))) {
    lastLogTime = now;
    await addIrrigationLog(
      systemState.currentMoisture!,
      systemState.currentTemperature!,
      systemState.valveState,
      systemState.mode
    );
  } else if (autoModeLogged) {
    lastLogTime = now;
  }

  // Notify all connected UIs and Arduinos
  broadcast({ type: 'status_update', payload: systemState });
};

// Initialize State Cache from Database
const syncStateFromDB = async () => {
  const mode = await getConfigValue('mode', 'automatic') as 'manual' | 'automatic';
  const moistureThreshold = parseInt(await getConfigValue('moistureThreshold', '35'), 10);
  const irrigationDuration = parseInt(await getConfigValue('irrigationDuration', '15'), 10);
  const valveState = (await getConfigValue('valveState', '0')) === '1';

  systemState = {
    ...systemState,
    mode,
    moistureThreshold,
    irrigationDuration,
    valveState: false  // Always start with valve closed — timer is lost on restart
  };
  await setConfigValue('valveState', '0');
  console.log('System state loaded from database:', systemState);
};

// Simple Authentication Middleware (Checks standard Bearer token -> uuid)
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const user = await findUserById(token); // The token is directly the user's UUID for simple local session
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }
    // Attach user metadata
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Auth server error' });
  }
};

// --- HTTP API ROUTES ---

// Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const newUser = await createUser(username, email, password);
    res.status(201).json({
      token: newUser.id, // Using user's UUID as token directly
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Could not create user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: user.id, // Using user's UUID as token directly
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal login error' });
  }
});

// Change password
app.put('/api/auth/password', authenticate, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  try {
    const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    await updateUserPassword(req.user.id, newPassword);
    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Could not update password' });
  }
});

// Get logged-in user profile
app.get('/api/auth/me', authenticate, (req: any, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    createdAt: req.user.createdAt
  });
});

// Get current system state
app.get('/api/system/state', authenticate, (req, res) => {
  res.json(systemState);
});

// Update system configuration (Automatic threshold, mode, etc.)
app.post('/api/system/config', authenticate, async (req, res) => {
  const { mode, moistureThreshold, irrigationDuration } = req.body;

  try {
    const updates: Partial<SystemState> = {};
    if (mode !== undefined) {
      if (mode !== 'manual' && mode !== 'automatic') {
        return res.status(400).json({ error: 'Invalid mode' });
      }
      updates.mode = mode;
      
      // If switching to manual, turn off any running auto timer
      if (mode === 'manual' && irrigationTimer) {
        clearTimeout(irrigationTimer);
        irrigationTimer = null;
      }
    }

    if (moistureThreshold !== undefined) {
      const thresholdNum = parseInt(moistureThreshold, 10);
      if (isNaN(thresholdNum) || thresholdNum < 0 || thresholdNum > 100) {
        return res.status(400).json({ error: 'Threshold must be a percentage between 0 and 100' });
      }
      updates.moistureThreshold = thresholdNum;
    }

    if (irrigationDuration !== undefined) {
      const durationNum = parseInt(irrigationDuration, 10);
      if (isNaN(durationNum) || durationNum < 5 || durationNum > 3600) {
        return res.status(400).json({ error: 'Duration must be between 5 seconds and 1 hour' });
      }
      updates.irrigationDuration = durationNum;
    }

    await updateSystemState(updates, true);
    res.json(systemState);
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ error: 'Could not update system configuration' });
  }
});

// Direct control (Turn irrigation valve ON/OFF - allowed in manual mode)
app.post('/api/system/control', authenticate, async (req, res) => {
  const { action } = req.body; // 'ON' or 'OFF'

  if (systemState.mode === 'automatic') {
    return res.status(400).json({ error: 'Manual overrides are disabled while system is in automatic mode' });
  }

  if (action !== 'ON' && action !== 'OFF') {
    return res.status(400).json({ error: 'Invalid control action. Use ON or OFF' });
  }

  try {
    if (action === 'ON') {
      // Clear any existing timer before starting a new one
      if (irrigationTimer) {
        clearTimeout(irrigationTimer);
        irrigationTimer = null;
      }
      await updateSystemState({ valveState: true }, true);

      // Auto-close after configured duration
      irrigationTimer = setTimeout(async () => {
        console.log(`[Manual Mode] Irrigation finished after ${systemState.irrigationDuration}s.`);
        systemState.valveState = false;
        await setConfigValue('valveState', '0');
        irrigationTimer = null;

        if (systemState.currentMoisture !== null && systemState.currentTemperature !== null) {
          await addIrrigationLog(
            systemState.currentMoisture,
            systemState.currentTemperature,
            false,
            'manual'
          );
        }

        broadcast({ type: 'status_update', payload: systemState });
      }, systemState.irrigationDuration * 1000);
    } else {
      // Manual OFF — cancel any pending timer
      if (irrigationTimer) {
        clearTimeout(irrigationTimer);
        irrigationTimer = null;
      }
      await updateSystemState({ valveState: false }, true);
    }

    res.json(systemState);
  } catch (error) {
    console.error('Manual valve control error:', error);
    res.status(500).json({ error: 'Could not control valve' });
  }
});

// Fetch system historical logs
app.get('/api/system/logs', authenticate, async (req, res) => {
  try {
    const logs = await getIrrigationLogs(50);
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Could not retrieve historical database logs' });
  }
});

// Clear all irrigation logs
app.delete('/api/system/logs', authenticate, async (req, res) => {
  try {
    await clearIrrigationLogs();
    res.json({ success: true });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ error: 'Could not clear irrigation logs' });
  }
});

// --- HTTP SERVER & WEBSOCKET SETUP ---
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected.');
  activeSockets.add(ws);

  // Send current state to newly connected client immediately
  ws.send(JSON.stringify({ type: 'status_update', payload: systemState }));

  ws.on('message', async (message) => {
    try {
      const data: WsMessage = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'sensor_data':
          // Sent by Arduino (Simulated or Real)
          // payload: { moisture: number, temperature: number }
          const { moisture, temperature } = data.payload;
          if (moisture !== undefined && temperature !== undefined) {
            await updateSystemState({
              currentMoisture: moisture,
              currentTemperature: temperature
            });
          }
          break;
        case 'command':
          // Command relay (from authorized clients over WebSocket if preferred)
          console.log('Received WebSocket command request:', data.payload);
          break;
        case 'heartbeat':
          // Arduino keeping connection alive
          break;
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected.');
    activeSockets.delete(ws);
  });
});

// Spin up server
const startServer = async () => {
  await initDatabase();
  await syncStateFromDB();

  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  IRRIGATION SYSTEM RUNNING ON PORT ${PORT}`);
    console.log(`  REST API: http://localhost:${PORT}`);
    console.log(`  WEBSOCKETS: ws://localhost:${PORT}`);
    console.log(`===============================================`);
  });
};

startServer().catch(err => {
  console.error('Server failed to start:', err);
});
