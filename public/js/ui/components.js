import { escapeHtml } from '../format.js';

/**
 * Renders a placeholder card for a view that is not implemented yet.
 * @param {HTMLElement|null} container
 * @param {{ title: string, description: string, route?: string, params?: Record<string, string> }} options
 * @returns {void}
 */
export function renderPlaceholder(container, options) {
  if (!container) return;
  const { title, description, route = '', params = {} } = options;
  const paramEntries = Object.entries(params).filter(([, value]) => value !== undefined);
  const paramList = paramEntries.length
    ? `<p class="text-body-secondary small mb-0">Parâmetros: ${paramEntries
        .map(([key, value]) => `${escapeHtml(key)}=${escapeHtml(value)}`)
        .join(', ')}</p>`
    : '';

  container.innerHTML = `
    <section class="card shadow-sm placeholder-view">
      <div class="card-body p-4">
        <p class="text-uppercase text-body-secondary small fw-semibold mb-2">${escapeHtml(route)}</p>
        <h1 class="h3 card-title">${escapeHtml(title)}</h1>
        <p class="card-text">${escapeHtml(description)}</p>
        <p class="text-body-secondary small mb-0">Esta tela será implementada nas próximas etapas.</p>
        ${paramList}
      </div>
    </section>
  `;
}

/**
 * Shows a Bootstrap toast in the global toast container.
 * @param {string} message
 * @param {'primary'|'success'|'danger'|'warning'|'info'} [variant]
 * @returns {void}
 */
export function showToast(message, variant = 'primary') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const element = document.createElement('div');
  element.className = `toast align-items-center text-bg-${variant} border-0`;
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  element.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(message)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button>
    </div>
  `;
  container.append(element);

  const BootstrapToast = globalThis.bootstrap?.Toast;
  if (BootstrapToast) {
    const toast = new BootstrapToast(element);
    element.addEventListener('hidden.bs.toast', () => element.remove());
    toast.show();
  } else {
    element.classList.add('show');
    element.addEventListener('click', () => element.remove());
  }
}
