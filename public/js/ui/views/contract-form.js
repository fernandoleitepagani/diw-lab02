import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Novo contrato',
    description: 'Execução de um pedido aprovado e geração do contrato de aluguel.',
    route: '/contracts/new',
    params: context.params ?? {},
  });
}
