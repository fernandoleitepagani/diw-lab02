import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Detalhe do pedido',
    description: 'Informações completas do pedido, parecer do agente e ações disponíveis.',
    route: '/requests/:id',
    params: context.params ?? {},
  });
}
