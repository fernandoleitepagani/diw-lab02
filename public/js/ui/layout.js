import { isAgent, isBankAgent, isClient } from '../domain/permissions.js';
import { escapeHtml, agentTypeLabel, roleLabel } from '../format.js';
import { clearSession } from '../session.js';

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'client'|'agent'} role
 * @property {'COMPANY'|'BANK'|null} [agentType]
 * @property {string|null} [clientId]
 */

/**
 * @param {Session|null} session
 * @returns {Array<{ href: string, label: string }>}
 */
function linksFor(session) {
  if (!session) {
    return [
      { href: '#/login', label: 'Entrar' },
      { href: '#/register', label: 'Cadastrar' },
    ];
  }

  if (isClient(session)) {
    return [
      { href: '#/', label: 'Dashboard' },
      { href: '#/requests', label: 'Meus pedidos' },
      { href: '#/cars', label: 'Carros' },
      { href: '#/profile', label: 'Meu perfil' },
    ];
  }

  if (isBankAgent(session)) {
    return [
      { href: '#/', label: 'Dashboard' },
      { href: '#/clients', label: 'Clientes' },
      { href: '#/requests', label: 'Pedidos' },
      { href: '#/contracts', label: 'Contratos' },
      { href: '#/credit-contracts', label: 'Créditos' },
    ];
  }

  if (isAgent(session)) {
    return [
      { href: '#/', label: 'Dashboard' },
      { href: '#/clients', label: 'Clientes' },
      { href: '#/cars', label: 'Carros' },
      { href: '#/requests', label: 'Pedidos' },
      { href: '#/contracts', label: 'Contratos' },
    ];
  }

  return [{ href: '#/', label: 'Dashboard' }];
}

/**
 * Renders the application shell (navbar) into the given container.
 * @param {HTMLElement|null} container
 * @param {Session|null} [session]
 * @returns {void}
 */
export function renderLayout(container, session = null) {
  if (!container) return;

  const links = linksFor(session)
    .map(
      (link) => `
        <li class="nav-item">
          <a class="nav-link" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>
        </li>`,
    )
    .join('');

  const userArea = session
    ? `
      <span class="navbar-text small me-3">
        ${escapeHtml(session.name)}
        <span class="text-body-secondary">(${escapeHtml(roleLabel(session.role))}${
          isAgent(session) && session.agentType
            ? ` · ${escapeHtml(agentTypeLabel(session.agentType))}`
            : ''
        })</span>
      </span>
      <button type="button" class="btn btn-outline-light btn-sm" id="logout-button">Sair</button>`
    : '';

  container.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
      <div class="container">
        <a class="navbar-brand fw-semibold" href="#/">DIW Aluguel de Carros</a>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#main-navbar"
          aria-controls="main-navbar"
          aria-expanded="false"
          aria-label="Alternar navegação"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="main-navbar">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">${links}</ul>
          <div class="d-flex align-items-center flex-wrap gap-2">${userArea}</div>
        </div>
      </div>
    </nav>
  `;

  container.querySelector('#logout-button')?.addEventListener('click', () => {
    clearSession();

    if (window.location.hash === '#/login') {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = '#/login';
    }
  });
}
