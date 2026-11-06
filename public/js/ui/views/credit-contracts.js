import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Contratos de crédito',
    description: 'Listagem dos contratos de crédito gerenciados pelo banco.',
    route: '/credit-contracts',
    params: context.params ?? {},
  });
}
