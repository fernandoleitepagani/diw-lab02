import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Pedidos de aluguel',
    description: 'Lista de pedidos de aluguel, com filtros e ações conforme o perfil do usuário.',
    route: '/requests',
    params: context.params ?? {},
  });
}
