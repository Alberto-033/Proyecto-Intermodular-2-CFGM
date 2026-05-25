import { t, i18n } from '../i18n.ts';
import api from '../api.ts';

// Dynamic floating notification toast
export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  // Remove existing toast if present
  const existing = document.querySelector('.toast');
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}</span>
    <div>${message}</div>
  `;

  document.body.appendChild(toast);

  // Trigger animation after append
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto-remove toast after 4 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

// Global App state listener references
let themeToggleCallback: () => void = () => {};
let langToggleCallback: () => void = () => {};

export const setupAppPreferences = (onThemeChange: () => void, onLangChange: () => void) => {
  themeToggleCallback = onThemeChange;
  langToggleCallback = onLangChange;
};

// Render Header/Navbar
export const renderHeader = (
  container: HTMLElement, 
  activeTab: string, 
  onTabChange: (tab: string) => void,
  user: any,
  onLogout: () => void
) => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const currentLang = i18n.getLanguage();

  container.innerHTML = `
    <header>
      <div class="container header-container">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="var(--accent-color)"/>
          </svg>
          <span>Smart<b>Irrigation</b></span>
        </div>

        ${api.isAuthenticated() ? `
          <nav>
            <ul class="nav-links">
              <li>
                <button class="nav-btn ${activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
                  📊 ${t('nav_dashboard')}
                </button>
              </li>
              <li>
                <button class="nav-btn ${activeTab === 'simulator' ? 'active' : ''}" data-tab="simulator">
                  🔌 ${t('nav_simulator')}
                </button>
              </li>
              <li>
                <button class="nav-btn ${activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
                  ⚙ ${t('nav_settings')}
                </button>
              </li>
            </ul>
          </nav>
        ` : ''}

        <div class="controls-group">
          <!-- Theme Toggler -->
          <button class="icon-btn" id="theme-toggle-btn" title="Alternar Tema">
            ${currentTheme === 'dark' ? '☀️' : '🌙'}
          </button>
          
          <!-- Language Toggler -->
          <button class="icon-btn" id="lang-toggle-btn" title="Change Language">
            ${currentLang === 'es' ? '🇬🇧' : '🇪🇸'}
          </button>

          ${api.isAuthenticated() ? `
            <span style="font-weight: 500; font-size: 0.95rem; color: var(--text-secondary); margin-left: 8px;">
              ${t('welcome_user', { name: user.username })}
            </span>
            <button class="nav-btn" id="logout-btn" style="color: var(--danger-color); padding: 8px 12px; background: rgba(239, 68, 68, 0.08);">
              🚪 ${t('nav_logout')}
            </button>
          ` : ''}
        </div>
      </div>
    </header>
  `;

  // Bind Navbar events
  const tabButtons = container.querySelectorAll('.nav-btn[data-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (targetTab) {
        onTabChange(targetTab);
      }
    });
  });

  // Bind preference changes
  const themeBtn = container.querySelector('#theme-toggle-btn');
  themeBtn?.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('irrigation_theme', nextTheme);
    themeToggleCallback();
  });

  const langBtn = container.querySelector('#lang-toggle-btn');
  langBtn?.addEventListener('click', () => {
    const nextLang = i18n.getLanguage() === 'es' ? 'en' : 'es';
    i18n.setLanguage(nextLang);
    langToggleCallback();
  });

  // Bind Logout
  const logoutBtn = container.querySelector('#logout-btn');
  logoutBtn?.addEventListener('click', () => {
    onLogout();
  });
};
