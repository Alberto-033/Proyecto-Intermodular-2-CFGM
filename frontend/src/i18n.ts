export type Language = 'es' | 'en';

export const translations = {
  es: {
    // Auth
    login_title: 'Iniciar Sesión',
    register_title: 'Crear Cuenta',
    username_label: 'Nombre de Usuario',
    email_label: 'Correo Electrónico',
    password_label: 'Contraseña',
    login_btn: 'Entrar al Sistema',
    register_btn: 'Registrarse',
    no_account: '¿No tienes una cuenta? Regístrate aquí',
    has_account: '¿Ya tienes cuenta? Inicia sesión aquí',
    auth_error: 'Error de autenticación',
    
    // Header & Navigation
    nav_dashboard: 'Panel de Control',
    nav_simulator: 'Simulador Arduino',
    nav_settings: 'Ajustes',
    nav_logout: 'Cerrar Sesión',
    welcome_user: '¡Hola, {name}!',

    // Dashboard
    system_status: 'Estado del Riego',
    valve_active: 'Riego Activo',
    valve_inactive: 'Riego Inactivo',
    valve_status: 'Estado de la Válvula',
    valve_open: 'ABIERTA',
    valve_closed: 'CERRADA',
    mode_label: 'Modo de Operación',
    mode_auto: 'Automático',
    mode_manual: 'Manual',
    
    moisture_sensor: 'Humedad del Suelo',
    temp_sensor: 'Temperatura del Aire',
    moisture_threshold: 'Umbral de Humedad',
    irrigation_duration: 'Duración del Riego',
    seconds: 'segundos',
    save_config_btn: 'Guardar Configuración',
    manual_irrigate_on: 'Activar Riego',
    manual_irrigate_off: 'Detener Riego',
    
    config_saved_success: 'Configuración guardada correctamente.',
    config_saved_error: 'Error al guardar la configuración.',

    // History
    history_title: 'Historial de Riego Reciente',
    col_time: 'Fecha y Hora',
    col_moisture: 'Humedad',
    col_temp: 'Temp.',
    col_state: 'Válvula',
    col_mode: 'Modo',
    col_duration: 'Duración',
    no_logs: 'No hay registros de riego guardados.',
    clear_history_btn: 'Borrar Historial',
    clear_history_confirm: '¿Seguro que quieres borrar todo el historial de riego? Esta acción no se puede deshacer.',
    clear_history_success: 'Historial borrado correctamente.',
    clear_history_error: 'Error al borrar el historial.',
    export_csv_btn: 'Exportar CSV',

    // Chart
    chart_title: 'Tendencia de Humedad',
    chart_collecting: 'Recopilando datos del sensor...',

    // Last irrigation
    last_irrigation_label: 'Último riego',
    never: 'Nunca',
    just_now: 'ahora mismo',
    minutes_ago: 'hace {n} min',
    hours_ago: 'hace {n}h',
    days_ago: 'hace {n}d',

    // Waiting signal
    waiting_signal: 'Esperando señal...',

    // Password change
    change_password_title: 'Cambiar Contraseña',
    change_password_desc: 'Actualiza tu contraseña de acceso al sistema.',
    current_password: 'Contraseña Actual',
    new_password: 'Nueva Contraseña',
    confirm_password: 'Confirmar Nueva Contraseña',
    change_password_btn: 'Actualizar Contraseña',
    password_changed_success: 'Contraseña actualizada correctamente.',
    password_changed_error: 'Error al cambiar la contraseña.',
    password_mismatch: 'Las contraseñas nuevas no coinciden.',
    password_too_short: 'La contraseña debe tener al menos 6 caracteres.',

    // Arduino Simulator Panel
    sim_title: 'Panel del Simulador Arduino',
    sim_description: 'Este panel simula el comportamiento de una placa física real interactuando con el backend por WebSockets en tiempo real.',
    sim_soil_slider: 'Simular Humedad del Suelo',
    sim_temp_slider: 'Simular Temperatura del Aire',
    sim_relay_state: 'Estado del Relé Físico (Pin 13)',
    sim_relay_active: 'ENCENDIDO — Electroválvula Abierta 💧',
    sim_relay_inactive: 'APAGADO — Electroválvula Cerrada ❌',
    sim_arduino_status: 'Conexión de la Placa',
    sim_status_online: 'En Línea (Simulado)',
    sim_reconnecting: 'Reconectando...',
    sim_panel_title: 'Simulador de Sensores',
    sim_auto_update_desc: 'Los valores se actualizan automáticamente simulando el comportamiento físico del sensor. Mueve los deslizadores para forzar una lectura específica.',
    sim_sends_interval: '📡 Enviando datos al backend cada <strong>10 segundos</strong> — igual que el firmware real.',
    send_now_btn: 'Enviar lectura ahora',
    not_logged_in: 'No autenticado',

    // Physical Arduino Details
    phys_title: 'Placa Arduino Física',
    phys_desc: 'Instrucciones para conectar una placa real (ESP32/ESP8266) a este panel de control a través de tu red local.',
    phys_token: 'Token de Seguridad de la Placa',

    // Settings & Theme
    theme_label: 'Tema Visual',
    theme_dark: 'Oscuro',
    theme_light: 'Claro',
    lang_label: 'Idioma principal',
    lang_es: 'Español',
    lang_en: 'Inglés'
  },
  en: {
    // Auth
    login_title: 'Sign In',
    register_title: 'Create Account',
    username_label: 'Username',
    email_label: 'Email Address',
    password_label: 'Password',
    login_btn: 'Enter System',
    register_btn: 'Register',
    no_account: "Don't have an account? Register here",
    has_account: 'Already have an account? Sign in here',
    auth_error: 'Authentication error',
    
    // Header & Navigation
    nav_dashboard: 'Dashboard',
    nav_simulator: 'Arduino Simulator',
    nav_settings: 'Settings',
    nav_logout: 'Logout',
    welcome_user: 'Hello, {name}!',

    // Dashboard
    system_status: 'Irrigation Status',
    valve_active: 'Irrigation Active',
    valve_inactive: 'Irrigation Inactive',
    valve_status: 'Valve Status',
    valve_open: 'OPEN',
    valve_closed: 'CLOSED',
    mode_label: 'Operation Mode',
    mode_auto: 'Automatic',
    mode_manual: 'Manual',
    
    moisture_sensor: 'Soil Moisture',
    temp_sensor: 'Air Temperature',
    moisture_threshold: 'Moisture Threshold',
    irrigation_duration: 'Irrigation Duration',
    seconds: 'seconds',
    save_config_btn: 'Save Configuration',
    manual_irrigate_on: 'Start Irrigation',
    manual_irrigate_off: 'Stop Irrigation',
    
    config_saved_success: 'Configuration saved successfully.',
    config_saved_error: 'Error saving configuration.',

    // History
    history_title: 'Recent Irrigation History',
    col_time: 'Date & Time',
    col_moisture: 'Moisture',
    col_temp: 'Temp.',
    col_state: 'Valve',
    col_mode: 'Mode',
    col_duration: 'Duration',
    no_logs: 'No irrigation logs saved yet.',
    clear_history_btn: 'Clear History',
    clear_history_confirm: 'Are you sure you want to delete all irrigation history? This action cannot be undone.',
    clear_history_success: 'History cleared successfully.',
    clear_history_error: 'Error clearing history.',
    export_csv_btn: 'Export CSV',

    // Chart
    chart_title: 'Moisture Trend',
    chart_collecting: 'Collecting sensor data...',

    // Last irrigation
    last_irrigation_label: 'Last irrigation',
    never: 'Never',
    just_now: 'just now',
    minutes_ago: '{n} min ago',
    hours_ago: '{n}h ago',
    days_ago: '{n}d ago',

    // Waiting signal
    waiting_signal: 'Waiting for signal...',

    // Password change
    change_password_title: 'Change Password',
    change_password_desc: 'Update your system access password.',
    current_password: 'Current Password',
    new_password: 'New Password',
    confirm_password: 'Confirm New Password',
    change_password_btn: 'Update Password',
    password_changed_success: 'Password updated successfully.',
    password_changed_error: 'Error changing password.',
    password_mismatch: 'New passwords do not match.',
    password_too_short: 'Password must be at least 6 characters.',

    // Arduino Simulator Panel
    sim_title: 'Arduino Simulator Panel',
    sim_description: 'This panel simulates the behavior of a physical hardware board interacting with the backend via WebSockets in real time.',
    sim_soil_slider: 'Simulate Soil Moisture',
    sim_temp_slider: 'Simulate Air Temperature',
    sim_relay_state: 'Physical Relay State (Pin 13)',
    sim_relay_active: 'ON — Solenoid Valve Open 💧',
    sim_relay_inactive: 'OFF — Solenoid Valve Closed ❌',
    sim_arduino_status: 'Board Connection',
    sim_status_online: 'Online (Simulated)',
    sim_reconnecting: 'Reconnecting...',
    sim_panel_title: 'Sensor Simulator',
    sim_auto_update_desc: 'Values update automatically simulating real sensor behavior. Move the sliders to force a specific reading.',
    sim_sends_interval: '📡 Sending data to the backend every <strong>10 seconds</strong> — just like the real firmware.',
    send_now_btn: 'Send reading now',
    not_logged_in: 'Not logged in',

    // Physical Arduino Details
    phys_title: 'Physical Arduino Board',
    phys_desc: 'Instructions on how to connect a real board (ESP32/ESP8266) to this dashboard via your local network.',
    phys_token: 'Board Security Token',

    // Settings & Theme
    theme_label: 'Visual Theme',
    theme_dark: 'Dark',
    theme_light: 'Light',
    lang_label: 'System Language',
    lang_es: 'Spanish',
    lang_en: 'English'
  }
};

export class I18nManager {
  private currentLang: Language = 'es';
  private onChangeCallbacks: (() => void)[] = [];

  constructor() {
    // Load preference from localStorage if available
    const saved = localStorage.getItem('irrigation_lang');
    if (saved === 'es' || saved === 'en') {
      this.currentLang = saved;
    }
  }

  public getLanguage(): Language {
    return this.currentLang;
  }

  public setLanguage(lang: Language) {
    if (this.currentLang !== lang) {
      this.currentLang = lang;
      localStorage.setItem('irrigation_lang', lang);
      this.notifyListeners();
    }
  }

  public t(key: keyof typeof translations['es'], replacements?: Record<string, string>): string {
    let text = translations[this.currentLang][key] || translations['es'][key] || (key as string);
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }

  public onChange(callback: () => void) {
    this.onChangeCallbacks.push(callback);
  }

  private notifyListeners() {
    this.onChangeCallbacks.forEach(cb => cb());
  }
}

export const i18n = new I18nManager();
export const t = (key: keyof typeof translations['es'], replacements?: Record<string, string>) => i18n.t(key, replacements);
