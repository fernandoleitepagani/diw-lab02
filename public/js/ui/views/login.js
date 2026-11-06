import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Entrar',
    description: 'Formulário de acesso ao sistema. A autenticação será implementada na etapa de login.',
    route: '/login',
    params: context.params ?? {},
  });
}
