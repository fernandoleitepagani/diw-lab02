import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Contratos',
    description: 'Listagem de contratos de aluguel e detalhe do contrato selecionado.',
    route: '/contracts',
    params: context.params ?? {},
  });
}
