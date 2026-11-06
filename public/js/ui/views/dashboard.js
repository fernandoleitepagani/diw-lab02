import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Painel',
    description: 'Visão inicial com atalhos para as principais ações do sistema.',
    route: '/',
    params: context.params ?? {},
  });
}
