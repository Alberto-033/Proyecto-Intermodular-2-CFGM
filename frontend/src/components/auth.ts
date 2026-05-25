import { t } from '../i18n.ts';
import api from '../api.ts';
import { showToast } from './common.ts';

export const renderAuth = (container: HTMLElement, onAuthSuccess: (user: any) => void) => {
  let isLoginMode = true;

  const updateView = () => {
    container.innerHTML = `
      <div class="auth-wrapper card">
        <div class="auth-header">
          <h1 class="logo auth-logo" style="justify-content: center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="var(--accent-color)"/>
            </svg>
            <span>Smart<b>Irrigation</b></span>
          </h1>
          <p class="auth-subtitle">
            ${isLoginMode ? t('login_title') : t('register_title')}
          </p>
        </div>

        <form id="auth-form" class="auth-form">
          ${!isLoginMode ? `
            <div class="form-group">
              <label for="username">${t('username_label')}</label>
              <input type="text" id="username" class="form-input" placeholder="p.ej. alber" required />
            </div>
          ` : ''}
          
          <div class="form-group">
            <label for="email">${t('email_label')}</label>
            <input type="email" id="email" class="form-input" placeholder="correo@ejemplo.com" required />
          </div>

          <div class="form-group">
            <label for="password">${t('password_label')}</label>
            <input type="password" id="password" class="form-input" placeholder="••••••••" required minlength="6" />
          </div>

          <button type="submit" class="btn-primary" style="margin-top: 10px;">
            ${isLoginMode ? t('login_btn') : t('register_btn')}
          </button>
        </form>

        <div class="auth-toggle" id="auth-toggle-btn">
          ${isLoginMode ? t('no_account') : t('has_account')}
        </div>
      </div>
    `;

    // Bind Toggle Action
    const toggleBtn = container.querySelector('#auth-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      isLoginMode = !isLoginMode;
      updateView();
    });

    // Bind Submit Event
    const form = container.querySelector('#auth-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const usernameInput = container.querySelector('#username') as HTMLInputElement;

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        if (isLoginMode) {
          const user = await api.login(email, password);
          showToast(`¡Bienvenido de nuevo, ${user.username}!`, 'success');
          onAuthSuccess(user);
        } else {
          const username = usernameInput.value.trim();
          if (!username) return;
          const user = await api.register(username, email, password);
          showToast('Cuenta creada correctamente. ¡Bienvenido!', 'success');
          onAuthSuccess(user);
        }
      } catch (err: any) {
        console.error('Authentication process failure:', err);
        showToast(err.message || t('auth_error'), 'error');
      }
    });
  };

  updateView();
};
