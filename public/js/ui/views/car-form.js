import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Cadastro de carro',
    description: 'Formulário para criar ou editar um veículo da frota.',
    route: '/cars/new',
    params: context.params ?? {},
  });
}
