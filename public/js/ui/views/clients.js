import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Clientes',
    description: 'Listagem de clientes gerenciada pelos agentes da locadora.',
    route: '/clients',
    params: context.params ?? {},
  });
}
