import { listClients } from '../../data/clients.js';
import {
  listCreditContracts,
  listCreditContractsForClient,
} from '../../data/credit-contracts.js';
import { listUsers } from '../../data/users.js';
import {
  canManageCreditContracts,
  canViewCreditContracts,
  isClient,
} from '../../domain/permissions.js';
import { escapeHtml, formatBRL, statusLabel } from '../../format.js';
import { getSession } from '../../session.js';

const CREDIT_STATUS_BADGES = Object.freeze({
  PENDING: 'text-bg-warning',
  APPROVED: 'text-bg-success',
  REJECTED: 'text-bg-danger',
});

/**
 * @param {string|null|undefined} status
 * @returns {string}
 */
function statusBadge(status) {
  const variant = CREDIT_STATUS_BADGES[status] ?? 'text-bg-secondary';
  return `<span class="badge ${variant}">${escapeHtml(statusLabel(status))}</span>`;
}

/**
 * @param {Record<string, unknown>|null|undefined} client
 * @param {unknown} clientId
 * @returns {string}
 */
function clientLabel(client, clientId) {
  if (client?.name) return String(client.name);
  if (clientId === undefined || clientId === null || clientId === '') {
    return 'Cliente não informado';
  }
  return `Cliente ${String(clientId)} (não encontrado)`;
}

/**
 * @param {Record<string, unknown>|null|undefined} bank
 * @param {unknown} bankId
 * @returns {string}
 */
function bankLabel(bank, bankId) {
  if (bank?.name) return String(bank.name);
  if (bankId === undefined || bankId === null || bankId === '') {
    return 'Banco não informado';
  }
  return `Banco ${String(bankId)} (não encontrado)`;
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {T} fallback
 * @returns {Promise<T>}
 */
async function orFallback(promise, fallback) {
  try {
    return await promise;
  } catch (error) {
    console.error(error);
    return fallback;
  }
}

/**
 * @param {HTMLElement} container
 * @param {string} message
 * @returns {void}
 */
function renderBlocked(container, message) {
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Contratos de crédito</h1>
        <div class="alert alert-warning" role="alert">${escapeHtml(message)}</div>
        <a class="btn btn-outline-secondary" href="#/">Voltar ao painel</a>
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement} container
 * @returns {void}
 */
function renderLoadFailure(container) {
  container.innerHTML = `
    <div class="alert alert-danger" role="alert">
      Não foi possível carregar os contratos de crédito. Tente novamente.
    </div>
  `;
}

/**
 * @param {Array<Record<string, unknown>>} creditContracts
 * @returns {Array<Record<string, unknown>>}
 */
function newestFirst(creditContracts) {
  return [...creditContracts].sort((left, right) => {
    const leftTime = new Date(String(left.createdAt ?? '')).getTime();
    const rightTime = new Date(String(right.createdAt ?? '')).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  });
}

/**
 * @param {HTMLElement} container
 * @param {Record<string, unknown>} session
 * @returns {Promise<void>}
 */
async function renderList(container, session) {
  if (!canViewCreditContracts(session)) {
    renderBlocked(container, 'Você não tem permissão para acessar contratos de crédito.');
    return;
  }

  const clientView = isClient(session);
  const canManage = canManageCreditContracts(session);

  let creditContracts;
  try {
    creditContracts = clientView
      ? await listCreditContractsForClient(session.clientId)
      : await listCreditContracts();
  } catch (error) {
    console.error(error);
    renderLoadFailure(container);
    return;
  }

  const [clients, users] = await Promise.all([
    orFallback(listClients(), []),
    orFallback(listUsers(), []),
  ]);

  const visibleContracts = clientView
    ? creditContracts.filter(
        (creditContract) => String(creditContract.clientId) === String(session.clientId),
      )
    : creditContracts;
  const sorted = newestFirst(visibleContracts);

  /** @type {Map<string, Record<string, unknown>>} */
  const clientsById = new Map(clients.map((client) => [String(client.id), client]));
  /** @type {Map<string, Record<string, unknown>>} */
  const usersById = new Map(users.map((user) => [String(user.id), user]));

  const rows = sorted
    .map((creditContract) => {
      const client = clientsById.get(String(creditContract.clientId));
      const bank = usersById.get(String(creditContract.bankId));
      const actions = canManage
        ? `<a class="btn btn-sm btn-outline-secondary" href="#/credit-contracts/${encodeURIComponent(
            String(creditContract.id),
          )}/edit">${
            creditContract.status === 'PENDING' ? 'Analisar' : 'Editar'
          }</a>`
        : '';

      return `
        <tr>
          <td class="text-nowrap">#${escapeHtml(creditContract.id)}</td>
          <td>${escapeHtml(clientLabel(client, creditContract.clientId))}</td>
          <td>${escapeHtml(bankLabel(bank, creditContract.bankId))}</td>
          <td class="text-nowrap">${escapeHtml(formatBRL(creditContract.amount))}</td>
          <td>${escapeHtml(creditContract.installments)}</td>
          <td>${escapeHtml(creditContract.interestRate)}%</td>
          <td>${statusBadge(String(creditContract.status ?? ''))}</td>
          ${
            canManage
              ? `<td class="text-end text-nowrap">${actions}</td>`
              : ''
          }
        </tr>`;
    })
    .join('');

  const columnCount = canManage ? 8 : 7;
  const emptyMessage = clientView
    ? 'Você ainda não possui contratos de crédito.'
    : 'Nenhum contrato de crédito cadastrado.';

  const description = clientView
    ? 'Acompanhe os contratos de crédito vinculados ao seu cadastro.'
    : canManage
      ? 'Crie, aprove ou rejeite as solicitações de crédito dos clientes.'
      : 'Consulta somente leitura dos contratos de crédito.';

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">${
          clientView ? 'Meus contratos de crédito' : 'Contratos de crédito'
        }</h1>
        <p class="text-body-secondary mb-0">${escapeHtml(description)}</p>
      </div>
      ${
        canManage
          ? '<a class="btn btn-primary" href="#/credit-contracts/new">Novo contrato de crédito</a>'
          : ''
      }
    </section>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Contrato</th>
              <th scope="col">Cliente</th>
              <th scope="col">Banco</th>
              <th scope="col">Valor</th>
              <th scope="col">Parcelas</th>
              <th scope="col">Juros</th>
              <th scope="col">Status</th>
              ${canManage ? '<th scope="col" class="text-end">Ações</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${
              sorted.length > 0
                ? rows
                : `<tr>
                     <td colspan="${columnCount}" class="text-center text-body-secondary py-4">
                       ${escapeHtml(emptyMessage)}
                     </td>
                   </tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session) {
    renderBlocked(container, 'Entre na sua conta para acessar os contratos de crédito.');
    return;
  }

  await renderList(container, session);
}
