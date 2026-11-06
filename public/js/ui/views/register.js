import { renderPlaceholder } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  renderPlaceholder(container, {
    title: 'Criar conta',
    description: 'Cadastro de novos clientes. O formulário será implementado na etapa de autenticação.',
    route: '/register',
    params: context.params ?? {},
  });
}
