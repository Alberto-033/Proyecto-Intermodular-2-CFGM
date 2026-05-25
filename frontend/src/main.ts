import './styles.css';
import api from './api.ts';
import { setupAppPreferences, renderHeader } from './components/common.ts';
import { renderAuth } from './components/auth.ts';
import { renderDashboard } from './components/dashboard.ts';
import { renderArduinoSimulator } from './components/arduino.ts';
import { renderSettings } from './components/settings.ts';

class App {
  private activeTab: string = 'dashboard';
  private user: any = null;
  private cleanupTabFn: (() => void) | null = null;

  constructor() {
    this.initAppPreferences();
    this.renderSkeleton();
    this.checkAuthentication();
  }

  // Restore saved theme and language configurations
  private initAppPreferences() {
    const savedTheme = localStorage.getItem('irrigation_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Synchronize app header icons and settings when preferences are changed
    setupAppPreferences(
      () => this.render(),
      () => this.render()
    );
  }

  // Create the essential base layout skeleton in the clean DOM
  private renderSkeleton() {
    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.innerHTML = `
        <div id="header-root"></div>
        <main id="content-root"></main>
      `;
    }
  }

  // Check login validation
  private async checkAuthentication() {
    if (api.isAuthenticated()) {
      try {
        this.user = await api.getMe();
        this.render();
      } catch (e) {
        console.error('Session validation failed. Clearing local token.', e);
        api.setToken(null);
        this.render();
      }
    } else {
      this.render();
    }
  }

  // Render current view state
  public render() {
    const headerRoot = document.getElementById('header-root');
    const contentRoot = document.getElementById('content-root');

    if (!headerRoot || !contentRoot) return;

    // Cleanup previous tab event listeners or websocket subscriptions to save memory
    if (this.cleanupTabFn) {
      this.cleanupTabFn();
      this.cleanupTabFn = null;
    }

    if (!api.isAuthenticated()) {
      // 1. Render Login/Register
      headerRoot.innerHTML = '';
      renderAuth(contentRoot, (user) => {
        this.user = user;
        this.activeTab = 'dashboard';
        this.renderSkeleton(); // Re-build basic skeleton
        this.render();
      });
    } else {
      // 2. Render authenticated Header
      renderHeader(
        headerRoot, 
        this.activeTab, 
        (tab) => this.switchTab(tab),
        this.user,
        () => this.logout()
      );

      // 3. Render active navigation content tab
      switch (this.activeTab) {
        case 'dashboard':
          this.cleanupTabFn = renderDashboard(contentRoot);
          break;
        case 'simulator':
          this.cleanupTabFn = renderArduinoSimulator(contentRoot);
          break;
        case 'settings':
          renderSettings(contentRoot, () => this.render());
          break;
        default:
          contentRoot.innerHTML = `<div>Tab not found</div>`;
      }
    }
  }

  private switchTab(tab: string) {
    this.activeTab = tab;
    this.render();
  }

  private logout() {
    api.setToken(null);
    this.user = null;
    this.activeTab = 'dashboard';
    this.renderSkeleton();
    this.render();
  }
}

// Instantiate the application once DOMContentLoaded fires
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
