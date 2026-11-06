import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Carros',
    description: 'Catálogo de veículos e gestão da frota.',
    route: '/cars',
    params: context.params ?? {},
  });
}
