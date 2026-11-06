import { isAgent, isBankAgent, isClient } from '../../domain/permissions.js';
import { agentTypeLabel, escapeHtml, roleLabel } from '../../format.js';
import { getSession } from '../../session.js';

/**
 * @typedef {{ title: string, description: string, href: string, cta: string }} DashboardAction
 */

/**
 * @param {{ role?: string, agentType?: string|null }|null} session
 * @returns {DashboardAction[]}
 */
function actionsFor(session) {
  if (!session) return [];

  if (isClient(session)) {
    return [
      {
        title: 'Novo pedido',
        description: 'Escolha um carro disponível e informe o período do aluguel.',
        href: '#/requests/new',
        cta: 'Solicitar aluguel',
      },
      {
        title: 'Meus pedidos',
        description: 'Acompanhe o andamento das suas solicitações de aluguel.',
        href: '#/requests',
        cta: 'Ver pedidos',
      },
      {
        title: 'Carros disponíveis',
        description: 'Conheça a frota disponível para locação.',
        href: '#/cars',
        cta: 'Ver carros',
      },
      {
        title: 'Meu perfil',
        description: 'Mantenha seus dados cadastrais e vínculos atualizados.',
        href: '#/profile',
        cta: 'Editar perfil',
      },
    ];
  }

  if (isBankAgent(session)) {
    return [
      {
        title: 'Clientes',
        description: 'Consulte e mantenha os dados dos clientes.',
        href: '#/clients',
        cta: 'Gerenciar clientes',
      },
      {
        title: 'Pedidos',
        description: 'Analise as solicitações de aluguel dos clientes.',
        href: '#/requests',
        cta: 'Ver pedidos',
      },
      {
        title: 'Contratos',
        description: 'Acompanhe os contratos de aluguel em andamento.',
        href: '#/contracts',
        cta: 'Ver contratos',
      },
      {
        title: 'Créditos',
        description: 'Crie, aprove ou rejeite contratos de crédito.',
        href: '#/credit-contracts',
        cta: 'Gerenciar créditos',
      },
    ];
  }

  if (isAgent(session)) {
    return [
      {
        title: 'Clientes',
        description: 'Consulte e mantenha os dados dos clientes.',
        href: '#/clients',
        cta: 'Gerenciar clientes',
      },
      {
        title: 'Carros',
        description: 'Cadastre e atualize a frota da locadora.',
        href: '#/cars',
        cta: 'Gerenciar carros',
      },
      {
        title: 'Pedidos',
        description: 'Analise as solicitações de aluguel dos clientes.',
        href: '#/requests',
        cta: 'Ver pedidos',
      },
      {
        title: 'Contratos',
        description: 'Acompanhe os contratos de aluguel em andamento.',
        href: '#/contracts',
        cta: 'Ver contratos',
      },
    ];
  }

  return [];
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session) {
    container.innerHTML = `
      <section class="card shadow-sm">
        <div class="card-body p-4">
          <h1 class="h3 card-title">Painel</h1>
          <p class="mb-0">Entre na sua conta para acessar o painel.</p>
        </div>
      </section>
    `;
    return;
  }

  const roleText =
    isAgent(session) && session.agentType
      ? `Agente · ${agentTypeLabel(session.agentType)}`
      : roleLabel(session.role);

  const cards = actionsFor(session)
    .map(
      (action) => `
        <div class="col-12 col-sm-6 col-lg-3">
          <article class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h2 class="h5 card-title">${escapeHtml(action.title)}</h2>
              <p class="card-text text-body-secondary small flex-grow-1">${escapeHtml(action.description)}</p>
              <a class="btn btn-outline-primary btn-sm mt-2" href="${escapeHtml(action.href)}">${escapeHtml(action.cta)}</a>
            </div>
          </article>
        </div>`,
    )
    .join('');

  container.innerHTML = `
    <section class="mb-4">
      <h1 class="h3 mb-1">Olá, ${escapeHtml(session.name)}!</h1>
      <p class="text-body-secondary mb-0">
        Você está conectado como <span class="badge text-bg-primary">${escapeHtml(roleText)}</span>.
      </p>
    </section>
    <section class="row g-3" aria-label="Ações principais">${cards}</section>
  `;
}
