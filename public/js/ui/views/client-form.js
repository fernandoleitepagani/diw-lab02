import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Cadastro de cliente',
    description: 'Formulário para criar ou editar os dados de um cliente.',
    route: '/clients/new',
    params: context.params ?? {},
  });
}
