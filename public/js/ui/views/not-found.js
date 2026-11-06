import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Página não encontrada',
    description: 'O endereço informado não corresponde a nenhuma tela do sistema.',
    route: '404',
    params: context.params ?? {},
  });
}
