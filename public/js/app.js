import { routes } from './routes.js';
import { startRouter } from './router.js';
import { renderLayout } from './ui/layout.js';

/** @type {Promise<{ getSession?: Function, clearSession?: Function }|null>|null} */
let sessionModulePromise = null;

/**
 * @returns {Promise<{ getSession?: Function, clearSession?: Function }|null>}
 */
function loadSessionModule() {
  if (!sessionModulePromise) {
    sessionModulePromise = import('./session.js').catch(() => null);
  }
  return sessionModulePromise;
}

/**
 * @returns {Promise<Record<string, unknown>|null>}
 */
async function readSession() {
  const module = await loadSessionModule();
  if (!module || typeof module.getSession !== 'function') return null;
  return module.getSession() ?? null;
}

/**
 * @returns {Promise<void>}
 */
async function refreshLayout() {
  const container = document.getElementById('layout');
  renderLayout(container, await readSession());
}

async function bootstrap() {
  await refreshLayout();
  startRouter(routes);
  window.addEventListener('hashchange', () => {
    void refreshLayout();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void bootstrap(), { once: true });
} else {
  void bootstrap();
}
