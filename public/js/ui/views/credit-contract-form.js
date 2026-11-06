import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Contrato de crédito',
    description: 'Formulário para criar ou revisar um contrato de crédito bancário.',
    route: '/credit-contracts/new',
    params: context.params ?? {},
  });
}
