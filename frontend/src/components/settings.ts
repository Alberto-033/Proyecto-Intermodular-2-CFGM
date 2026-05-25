import { t, i18n } from '../i18n.ts';
import api from '../api.ts';
import { showToast } from './common.ts';

export const renderSettings = (container: HTMLElement, onPreferenceChange: () => void) => {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const currentLang = i18n.getLanguage();

  const updateView = () => {
    container.innerHTML = `
      <div class="container" style="max-width: 800px;">
        <h1 style="font-size: 2.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 30px;">
          ⚙️ ${t('nav_settings')}
        </h1>

        <div class="card">
          <div class="settings-list">
            <!-- Theme selection -->
            <div class="settings-item">
              <div class="settings-info">
                <span class="settings-name">${t('theme_label')}</span>
                <span class="settings-desc">Personaliza la apariencia visual del panel de control de riego.</span>
              </div>
              <select class="select-dropdown" id="theme-select">
                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>🌙 ${t('theme_dark')}</option>
                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>☀️ ${t('theme_light')}</option>
              </select>
            </div>

            <!-- Language selection -->
            <div class="settings-item">
              <div class="settings-info">
                <span class="settings-name">${t('lang_label')}</span>
                <span class="settings-desc">Cambia el idioma principal de la interfaz al vuelo.</span>
              </div>
              <select class="select-dropdown" id="lang-select">
                <option value="es" ${currentLang === 'es' ? 'selected' : ''}>🇪🇸 ${t('lang_es')}</option>
                <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇬🇧 ${t('lang_en')}</option>
              </select>
            </div>

            <!-- Profile Info & Security -->
            <div class="settings-item">
              <div class="settings-info">
                <span class="settings-name">Seguridad & UUID</span>
                <span class="settings-desc">Tus datos están protegidos en local con cifrado bcrypt y identificador único UUID.</span>
              </div>
              <div style="font-family: monospace; font-size: 0.85rem; padding: 6px 12px; background: rgba(var(--accent-rgb), 0.1); border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
                🔑 UUID: ${api.getToken()}
              </div>
            </div>
          </div>
        </div>

        <!-- Password change card -->
        <div class="card" style="margin-top: 24px;">
          <h2 class="card-title">🔒 ${t('change_password_title')}</h2>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 24px;">${t('change_password_desc')}</p>
          <form id="change-password-form" style="max-width: 420px; display: flex; flex-direction: column; gap: 16px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="current-pwd">${t('current_password')}</label>
              <input type="password" id="current-pwd" class="form-input" placeholder="••••••••" required minlength="6"/>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="new-pwd">${t('new_password')}</label>
              <input type="password" id="new-pwd" class="form-input" placeholder="••••••••" required minlength="6"/>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="confirm-pwd">${t('confirm_password')}</label>
              <input type="password" id="confirm-pwd" class="form-input" placeholder="••••••••" required minlength="6"/>
            </div>
            <button type="submit" class="btn-primary" style="margin-top: 4px;">
              🔒 ${t('change_password_btn')}
            </button>
          </form>
        </div>
      </div>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    // Password change form
    const pwdForm = container.querySelector('#change-password-form') as HTMLFormElement;
    pwdForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPwd = (container.querySelector('#current-pwd') as HTMLInputElement).value;
      const newPwd     = (container.querySelector('#new-pwd') as HTMLInputElement).value;
      const confirmPwd = (container.querySelector('#confirm-pwd') as HTMLInputElement).value;

      if (newPwd !== confirmPwd) {
        showToast(t('password_mismatch'), 'error');
        return;
      }
      if (newPwd.length < 6) {
        showToast(t('password_too_short'), 'error');
        return;
      }
      try {
        await api.changePassword(currentPwd, newPwd);
        pwdForm.reset();
        showToast(t('password_changed_success'), 'success');
      } catch (err: any) {
        showToast(err.message || t('password_changed_error'), 'error');
      }
    });

    // Theme select dropdown changes
    const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
    themeSelect?.addEventListener('change', () => {
      const nextTheme = themeSelect.value;
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('irrigation_theme', nextTheme);
      showToast(`Tema visual cambiado a ${nextTheme === 'dark' ? 'Oscuro' : 'Claro'}`, 'success');
      onPreferenceChange();
    });

    // Language select dropdown changes
    const langSelect = container.querySelector('#lang-select') as HTMLSelectElement;
    langSelect?.addEventListener('change', () => {
      const nextLang = langSelect.value as 'es' | 'en';
      i18n.setLanguage(nextLang);
      showToast(nextLang === 'es' ? 'Idioma cambiado a Español' : 'Language switched to English', 'success');
      onPreferenceChange();
    });
  };

  updateView();
};
