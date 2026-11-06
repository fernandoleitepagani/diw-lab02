import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Pedido de aluguel',
    description: 'Formulário para solicitar um aluguel, com escolha de carro e período.',
    route: '/requests/new',
    params: context.params ?? {},
  });
}
