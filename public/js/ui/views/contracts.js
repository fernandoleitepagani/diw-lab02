import { getCar, listCars } from '../../data/cars.js';
import { getClient, listClients } from '../../data/clients.js';
import {
  cancelRental,
  completeRental,
  getContract,
  listContracts,
  listContractsForClient,
  startRental,
} from '../../data/contracts.js';
import { getCreditContract } from '../../data/credit-contracts.js';
import { listRequests, listRequestsForClient } from '../../data/requests.js';
import { listUsers } from '../../data/users.js';
import { canReviewRequests, canViewRequest, isClient } from '../../domain/permissions.js';
import { REQUEST_STATUS } from '../../domain/request-state.js';
import {
  escapeHtml,
  formatBRL,
  formatDate,
  formatDateTime,
  statusLabel,
} from '../../format.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

const CONTRACT_STATUS_BADGES = Object.freeze({
  PENDING: 'text-bg-warning',
  UNDER_REVIEW: 'text-bg-info',
  APPROVED: 'text-bg-success',
  REJECTED: 'text-bg-danger',
  CONTRACTED: 'text-bg-primary',
  ACTIVE: 'text-bg-primary',
  COMPLETED: 'text-bg-secondary',
  CANCELLED: 'text-bg-dark',
});

const OWNERSHIP_LABELS = Object.freeze({
  CLIENT: 'Cliente',
  COMPANY: 'Locadora',
  BANK: 'Banco',
});

/**
 * @param {string|null|undefined} status
 * @returns {string}
 */
function statusBadge(status) {
  const variant = CONTRACT_STATUS_BADGES[status] ?? 'text-bg-secondary';
  return `<span class="badge ${variant}">${escapeHtml(statusLabel(status))}</span>`;
}

/**
 * @param {string|null|undefined} ownershipType
 * @returns {string}
 */
function ownershipLabel(ownershipType) {
  return OWNERSHIP_LABELS[ownershipType] ?? 'Não informado';
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
 * @param {Record<string, unknown>|null|undefined} car
 * @param {unknown} carId
 * @returns {string}
 */
function carLabel(car, carId) {
  const name = `${String(car?.brand ?? '')} ${String(car?.model ?? '')}`.trim();
  if (name) return name;
  if (carId === undefined || carId === null || carId === '') {
    return 'Carro não informado';
  }
  return `Carro ${String(carId)} (não encontrado)`;
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
 * @param {HTMLElement} container
 * @param {string} message
 * @param {string} [backHref]
 * @param {string} [backLabel]
 * @returns {void}
 */
function renderBlocked(
  container,
  message,
  backHref = '#/contracts',
  backLabel = 'Voltar para contratos',
) {
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Contratos</h1>
        <div class="alert alert-warning" role="alert">${escapeHtml(message)}</div>
        <a class="btn btn-outline-secondary" href="${escapeHtml(backHref)}">${escapeHtml(backLabel)}</a>
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {number} status
 * @returns {void}
 */
function renderLoadFailure(container, status) {
  const notFound = status === 404;
  container.innerHTML = `
    <div class="alert alert-${notFound ? 'warning' : 'danger'}" role="alert">
      ${
        notFound
          ? 'Contrato não encontrado.'
          : 'Não foi possível carregar os contratos. Tente novamente.'
      }
    </div>
    <a class="btn btn-outline-secondary" href="#/contracts">Voltar para contratos</a>
  `;
}

/**
 * @param {Array<Record<string, unknown>>} contracts
 * @returns {Array<Record<string, unknown>>}
 */
function newestFirst(contracts) {
  return [...contracts].sort((left, right) => {
    const leftTime = new Date(String(left.createdAt ?? '')).getTime();
    const rightTime = new Date(String(right.createdAt ?? '')).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  });
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
 * @param {Record<string, unknown>} session
 * @returns {Promise<void>}
 */
async function renderList(container, session) {
  const clientView = isClient(session);
  const reviewView = canReviewRequests(session);

  if (!clientView && !reviewView) {
    renderBlocked(container, 'Você não tem permissão para acessar contratos.');
    return;
  }

  let contracts;
  try {
    contracts = clientView
      ? await listContractsForClient(session.clientId)
      : await listContracts();
  } catch (error) {
    console.error(error);
    renderLoadFailure(container, 0);
    return;
  }

  const [requests, clients, cars] = await Promise.all([
    orFallback(
      clientView ? listRequestsForClient(session.clientId) : listRequests(),
      [],
    ),
    clientView ? Promise.resolve([]) : orFallback(listClients(), []),
    orFallback(listCars(), []),
  ]);

  const visibleContracts = clientView
    ? contracts.filter((contract) => String(contract.clientId) === String(session.clientId))
    : contracts;
  const sorted = newestFirst(visibleContracts);

  /** @type {Map<string, Record<string, unknown>>} */
  const requestsById = new Map(requests.map((request) => [String(request.id), request]));
  /** @type {Map<string, Record<string, unknown>>} */
  const clientsById = new Map(clients.map((client) => [String(client.id), client]));
  /** @type {Map<string, Record<string, unknown>>} */
  const carsById = new Map(cars.map((car) => [String(car.id), car]));

  const rows = sorted
    .map((contract) => {
      const request = requestsById.get(String(contract.rentalRequestId));
      const client = clientsById.get(String(contract.clientId));
      const car = carsById.get(String(contract.carId));
      const detailHref = `#/contracts/${encodeURIComponent(String(contract.id))}`;
      const requestCell = request
        ? `<a href="#/requests/${encodeURIComponent(String(request.id))}">Pedido #${escapeHtml(
            request.id,
          )}</a>`
        : '<span class="text-body-secondary">Pedido arquivado</span>';

      return `
        <tr>
          <td class="text-nowrap">#${escapeHtml(contract.id)}</td>
          <td>${requestCell}</td>
          ${clientView ? '' : `<td>${escapeHtml(clientLabel(client, contract.clientId))}</td>`}
          <td>
            <span class="fw-semibold">${escapeHtml(carLabel(car, contract.carId))}</span>
            ${
              car?.plate
                ? `<span class="d-block text-body-secondary small font-monospace">${escapeHtml(
                    car.plate,
                  )}</span>`
                : ''
            }
          </td>
          <td class="text-nowrap">
            ${escapeHtml(formatDate(contract.startDate))} a ${escapeHtml(
              formatDate(contract.endDate),
            )}
          </td>
          <td class="text-nowrap">${escapeHtml(formatBRL(contract.total))}</td>
          <td>${escapeHtml(ownershipLabel(String(contract.ownershipType ?? '')))}</td>
          <td>${statusBadge(String(contract.status ?? ''))}</td>
          <td class="text-end text-nowrap">
            <a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(detailHref)}">Ver</a>
          </td>
        </tr>`;
    })
    .join('');

  const columnCount = clientView ? 8 : 9;
  const emptyRow = `
    <tr>
      <td colspan="${columnCount}" class="text-center text-body-secondary py-4">
        ${
          clientView
            ? 'Você ainda não possui contratos de aluguel.'
            : 'Nenhum contrato de aluguel cadastrado.'
        }
      </td>
    </tr>`;

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">${clientView ? 'Meus contratos' : 'Contratos de aluguel'}</h1>
        <p class="text-body-secondary mb-0">
          ${
            clientView
              ? 'Acompanhe os contratos gerados a partir dos seus pedidos.'
              : 'Acompanhe os contratos de aluguel dos clientes.'
          }
        </p>
      </div>
    </section>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Contrato</th>
              <th scope="col">Pedido</th>
              ${clientView ? '' : '<th scope="col">Cliente</th>'}
              <th scope="col">Carro</th>
              <th scope="col">Período</th>
              <th scope="col">Total</th>
              <th scope="col">Propriedade</th>
              <th scope="col">Status</th>
              <th scope="col" class="text-end">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.length > 0 ? rows : emptyRow}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * @param {Record<string, unknown>|null} request
 * @param {Record<string, unknown>} contract
 * @returns {string}
 */
function requestCell(request, contract) {
  if (request) {
    return `
      <a href="#/requests/${encodeURIComponent(String(request.id))}">Pedido #${escapeHtml(
        request.id,
      )}</a>
      ${statusBadge(String(request.status ?? ''))}
    `;
  }
  if (
    contract.rentalRequestId === undefined ||
    contract.rentalRequestId === null ||
    contract.rentalRequestId === ''
  ) {
    return '<span class="text-body-secondary">Pedido arquivado</span>';
  }
  return `<span class="text-body-secondary">Pedido arquivado (${escapeHtml(
    contract.rentalRequestId,
  )})</span>`;
}

/**
 * @param {Record<string, unknown>|null} creditContract
 * @param {Record<string, unknown>|null} bank
 * @param {unknown} creditContractId
 * @returns {string}
 */
function creditContractCell(creditContract, bank, creditContractId) {
  if (
    creditContractId === undefined ||
    creditContractId === null ||
    creditContractId === ''
  ) {
    return '<span class="text-body-secondary">Nenhum contrato de crédito vinculado</span>';
  }
  if (!creditContract) {
    return `<span class="text-body-secondary">Contrato de crédito ${escapeHtml(
      creditContractId,
    )} (não encontrado)</span>`;
  }

  return `
    <span class="fw-semibold">Contrato de crédito #${escapeHtml(creditContract.id)}</span>
    ${statusBadge(String(creditContract.status ?? ''))}
    <span class="d-block text-body-secondary small">
      ${escapeHtml(bankLabel(bank, creditContract.bankId))} ·
      ${escapeHtml(formatBRL(creditContract.amount))} em
      ${escapeHtml(creditContract.installments)} parcelas
    </span>
  `;
}

/**
 * @param {Record<string, unknown>} contract
 * @param {Record<string, unknown>|null} request
 * @param {Record<string, unknown>} session
 * @returns {string}
 */
function agentActionsMarkup(contract, request, session) {
  if (!canReviewRequests(session)) {
    return '<p class="text-body-secondary mb-0">Nenhuma ação disponível para este contrato.</p>';
  }
  if (!request) {
    return '<p class="text-body-secondary mb-0">Pedido arquivado: não há ações disponíveis.</p>';
  }
  if (contract.status !== 'ACTIVE') {
    return '<p class="text-body-secondary mb-0">Este contrato não está mais ativo.</p>';
  }

  if (request.status === REQUEST_STATUS.CONTRACTED) {
    return `
      <button class="btn btn-primary" type="button" data-contract-action="start">
        Iniciar locação
      </button>
      <button class="btn btn-outline-danger" type="button" data-contract-action="cancel">
        Cancelar locação
      </button>
    `;
  }

  if (request.status === REQUEST_STATUS.ACTIVE) {
    return `
      <button class="btn btn-success" type="button" data-contract-action="complete">
        Concluir locação
      </button>
      <button class="btn btn-outline-danger" type="button" data-contract-action="cancel">
        Cancelar locação
      </button>
    `;
  }

  return '<p class="text-body-secondary mb-0">Nenhuma ação disponível para este contrato.</p>';
}

/**
 * @param {Record<string, unknown>} contract
 * @param {Record<string, unknown>|null} request
 * @param {Record<string, unknown>} session
 * @returns {string}
 */
function clientActionsMarkup(contract, request, session) {
  if (request && canViewRequest(session, request)) {
    return `
      <a class="btn btn-outline-secondary" href="#/requests/${encodeURIComponent(
        String(request.id),
      )}">Ver pedido</a>
      <p class="text-body-secondary small mb-0 mt-2">
        O acompanhamento da locação é feito pelo agente responsável.
      </p>
    `;
  }
  return `
    <p class="text-body-secondary mb-0">
      ${
        request
          ? 'Você não tem permissão para ver o pedido deste contrato.'
          : 'Pedido arquivado: não há ações disponíveis.'
      }
    </p>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {Record<string, unknown>} context
 * @param {Record<string, unknown>} session
 * @param {string} contractId
 * @returns {Promise<void>}
 */
async function renderDetail(container, context, session, contractId) {
  let contract;
  try {
    contract = await getContract(contractId);
  } catch (error) {
    console.error(error);
    renderLoadFailure(container, Number(error?.status) || 0);
    return;
  }

  /** @type {Record<string, unknown>|null} */
  let request = null;
  if (contract.rentalRequestId) {
    try {
      const requests = isClient(session)
        ? await listRequestsForClient(session.clientId)
        : await listRequests();
      request =
        requests.find(
          (candidate) => String(candidate.id) === String(contract.rentalRequestId),
        ) ?? null;
    } catch {
      request = null;
    }
  }

  const clientView = isClient(session);
  if (clientView) {
    const owns = String(contract.clientId) === String(session.clientId);
    const canView = request ? canViewRequest(session, request) : owns;
    if (!owns || !canView) {
      renderBlocked(container, 'Você não tem permissão para ver este contrato.');
      return;
    }
  } else if (!canReviewRequests(session)) {
    renderBlocked(container, 'Você não tem permissão para ver este contrato.');
    return;
  }

  const [client, car, creditContract] = await Promise.all([
    contract.clientId
      ? orFallback(getClient(contract.clientId), null)
      : Promise.resolve(null),
    contract.carId ? orFallback(getCar(contract.carId), null) : Promise.resolve(null),
    contract.creditContractId
      ? orFallback(getCreditContract(contract.creditContractId), null)
      : Promise.resolve(null),
  ]);

  let bank = null;
  if (creditContract) {
    const users = await orFallback(listUsers(), []);
    bank =
      users.find((user) => String(user.id) === String(creditContract.bankId)) ?? null;
  }

  const actionsMarkup = clientView
    ? clientActionsMarkup(contract, request, session)
    : agentActionsMarkup(contract, request, session);

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">
          Contrato #${escapeHtml(contract.id)} ${statusBadge(String(contract.status ?? ''))}
        </h1>
        <p class="text-body-secondary mb-0">Contrato de aluguel e seus vínculos.</p>
      </div>
      <a class="btn btn-outline-secondary" href="#/contracts">Voltar para contratos</a>
    </section>

    <div class="row g-3">
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm h-100">
          <div class="card-body p-4">
            <h2 class="h5 card-title mb-3">Detalhes do contrato</h2>
            <dl class="row mb-0">
              <dt class="col-sm-4 col-lg-3 text-body-secondary">Pedido</dt>
              <dd class="col-sm-8 col-lg-9">${requestCell(request, contract)}</dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Cliente</dt>
              <dd class="col-sm-8 col-lg-9">
                ${escapeHtml(clientLabel(client, contract.clientId))}
              </dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Carro</dt>
              <dd class="col-sm-8 col-lg-9">
                <span class="fw-semibold">${escapeHtml(carLabel(car, contract.carId))}</span>
                ${
                  car?.plate
                    ? `<span class="d-block text-body-secondary small font-monospace">Placa ${escapeHtml(
                        car.plate,
                      )}</span>`
                    : ''
                }
              </dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Período</dt>
              <dd class="col-sm-8 col-lg-9">
                ${escapeHtml(formatDate(contract.startDate))} a ${escapeHtml(
                  formatDate(contract.endDate),
                )}
              </dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Total</dt>
              <dd class="col-sm-8 col-lg-9 fw-semibold">
                ${escapeHtml(formatBRL(contract.total))}
              </dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Propriedade</dt>
              <dd class="col-sm-8 col-lg-9">
                ${escapeHtml(ownershipLabel(String(contract.ownershipType ?? '')))}
                ${
                  contract.ownerId !== undefined && contract.ownerId !== null
                    ? `<span class="d-block text-body-secondary small">Identificador do proprietário: ${escapeHtml(
                        contract.ownerId,
                      )}</span>`
                    : ''
                }
              </dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Contrato de crédito</dt>
              <dd class="col-sm-8 col-lg-9">
                ${creditContractCell(creditContract, bank, contract.creditContractId)}
              </dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Status</dt>
              <dd class="col-sm-8 col-lg-9">${statusBadge(String(contract.status ?? ''))}</dd>

              <dt class="col-sm-4 col-lg-3 text-body-secondary">Criado em</dt>
              <dd class="col-sm-8 col-lg-9 mb-0">
                ${escapeHtml(formatDateTime(contract.createdAt))}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-4">
        <div class="card shadow-sm h-100">
          <div class="card-body p-4">
            <h2 class="h5 card-title mb-3">Ações</h2>
            <div class="alert alert-danger d-none" role="alert" data-action-error></div>
            <div class="d-flex flex-column gap-2" data-actions>
              ${actionsMarkup}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const actionError = container.querySelector('[data-action-error]');

  /**
   * @param {string} message
   * @returns {void}
   */
  function showActionError(message) {
    if (!actionError) return;
    actionError.textContent = message;
    actionError.classList.remove('d-none');
  }

  /**
   * @param {boolean} busy
   * @returns {void}
   */
  function setBusy(busy) {
    for (const button of container.querySelectorAll('[data-contract-action]')) {
      if (button instanceof HTMLButtonElement) button.disabled = busy;
    }
  }

  for (const button of container.querySelectorAll('[data-contract-action]')) {
    button.addEventListener('click', async () => {
      if (!canReviewRequests(session) || !request) return;
      const action = button.getAttribute('data-contract-action') ?? '';
      if (actionError) {
        actionError.textContent = '';
        actionError.classList.add('d-none');
      }

      if (
        (action === 'complete' || action === 'cancel') &&
        !window.confirm(
          action === 'complete'
            ? `Concluir a locação do contrato #${String(contract.id)}?`
            : `Cancelar a locação do contrato #${String(contract.id)}?`,
        )
      ) {
        return;
      }

      setBusy(true);
      try {
        if (action === 'start') {
          await startRental({ request });
          showToast('Locação iniciada com sucesso.', 'success');
        } else if (action === 'complete') {
          await completeRental({ contract, request });
          showToast('Locação concluída com sucesso.', 'success');
        } else if (action === 'cancel') {
          await cancelRental({ contract, request });
          showToast('Locação cancelada com sucesso.', 'success');
        } else {
          setBusy(false);
          return;
        }
        await renderDetail(container, context, session, contractId);
      } catch (error) {
        console.error(error);
        setBusy(false);
        showActionError('Não foi possível atualizar a locação. Tente novamente.');
        showToast('Não foi possível atualizar a locação. Tente novamente.', 'danger');
      }
    });
  }
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session) {
    renderBlocked(container, 'Entre na sua conta para acessar os contratos.');
    return;
  }

  const contractId = context.params?.id;
  if (contractId !== undefined && contractId !== null && contractId !== '') {
    await renderDetail(container, context, session, String(contractId));
    return;
  }

  await renderList(container, session);
}
