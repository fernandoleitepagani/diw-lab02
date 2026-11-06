import { listCars } from '../../data/cars.js';
import { listClients } from '../../data/clients.js';
import {
  listRequests,
  listRequestsForClient,
  updateRequest,
} from '../../data/requests.js';
import {
  canCancelRequest,
  canEditRequest,
  canReviewRequests,
  isClient,
} from '../../domain/permissions.js';
import { assertTransition, REQUEST_STATUS } from '../../domain/request-state.js';
import { escapeHtml, formatBRL, formatDate, statusLabel } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

const STATUS_BADGES = Object.freeze({
  PENDING: 'text-bg-warning',
  UNDER_REVIEW: 'text-bg-info',
  APPROVED: 'text-bg-success',
  REJECTED: 'text-bg-danger',
  CONTRACTED: 'text-bg-primary',
  ACTIVE: 'text-bg-primary',
  COMPLETED: 'text-bg-secondary',
  CANCELLED: 'text-bg-dark',
});

/**
 * @param {string|null|undefined} status
 * @returns {string}
 */
function statusBadge(status) {
  const variant = STATUS_BADGES[status] ?? 'text-bg-secondary';
  return `<span class="badge ${variant}">${escapeHtml(statusLabel(status))}</span>`;
}

/**
 * @param {Record<string, unknown>|undefined} car
 * @param {unknown} carId
 * @returns {string}
 */
function carName(car, carId) {
  if (!car) return `Carro ${String(carId ?? '—')}`;
  return `${String(car.brand ?? '')} ${String(car.model ?? '')}`.trim();
}

/**
 * @param {Array<Record<string, unknown>>} requests
 * @returns {Array<Record<string, unknown>>}
 */
function newestFirst(requests) {
  return [...requests].sort((left, right) => {
    const leftTime = new Date(String(left.createdAt ?? '')).getTime();
    const rightTime = new Date(String(right.createdAt ?? '')).getTime();
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  });
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
        <h1 class="h3 card-title">Pedidos de aluguel</h1>
        <div class="alert alert-warning mb-3" role="alert">${escapeHtml(message)}</div>
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
      Não foi possível carregar os pedidos. Tente novamente.
    </div>
  `;
}

/**
 * @param {string} selected
 * @returns {string}
 */
function statusFilterOptions(selected) {
  const options = [`<option value="">Todos os status</option>`];
  for (const status of Object.values(REQUEST_STATUS)) {
    options.push(
      `<option value="${escapeHtml(status)}"${status === selected ? ' selected' : ''}>${escapeHtml(
        statusLabel(status),
      )}</option>`,
    );
  }
  return options.join('');
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} context
 * @param {Record<string, unknown>} session
 * @returns {Promise<void>}
 */
async function renderList(container, context, session) {
  const clientView = isClient(session);
  const reviewView = canReviewRequests(session);

  if (!clientView && !reviewView) {
    renderBlocked(container, 'Você não tem permissão para acessar pedidos.');
    return;
  }

  const requestedStatus = String(context.query?.get('status') ?? '');
  const statusFilter = Object.values(REQUEST_STATUS).includes(requestedStatus)
    ? requestedStatus
    : '';

  let requests;
  let cars;
  let clients;
  try {
    [requests, cars, clients] = await Promise.all([
      clientView
        ? listRequestsForClient(session.clientId)
        : listRequests(statusFilter ? { status: statusFilter } : {}),
      listCars(),
      clientView ? Promise.resolve([]) : listClients(),
    ]);
  } catch (error) {
    console.error(error);
    renderLoadFailure(container);
    return;
  }

  const visibleRequests = clientView
    ? requests.filter((request) => String(request.clientId) === String(session.clientId))
    : requests;
  const sorted = newestFirst(visibleRequests);

  /** @type {Map<string, Record<string, unknown>>} */
  const carsById = new Map(cars.map((car) => [String(car.id), car]));
  /** @type {Map<string, Record<string, unknown>>} */
  const clientsById = new Map(clients.map((client) => [String(client.id), client]));

  const rows = sorted
    .map((request) => {
      const car = carsById.get(String(request.carId));
      const client = clientsById.get(String(request.clientId));
      const detailHref = `#/requests/${encodeURIComponent(String(request.id))}`;
      const actions = [
        `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(detailHref)}">${
          reviewView ? 'Analisar' : 'Ver'
        }</a>`,
      ];

      if (clientView && canEditRequest(session, request)) {
        actions.push(
          `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(
            `${detailHref}/edit`,
          )}">Editar</a>`,
        );
      }
      if (clientView && canCancelRequest(session, request)) {
        actions.push(
          `<button class="btn btn-sm btn-outline-danger" type="button" data-cancel="${escapeHtml(
            request.id,
          )}" data-label="${escapeHtml(`#${request.id}`)}">Cancelar</button>`,
        );
      }

      const clientCell = clientView
        ? ''
        : `<td>${escapeHtml(client?.name ?? `Cliente ${String(request.clientId ?? '—')}`)}</td>`;

      return `
        <tr>
          <td class="text-nowrap">#${escapeHtml(request.id)}</td>
          ${clientCell}
          <td>
            <span class="fw-semibold">${escapeHtml(carName(car, request.carId))}</span>
            ${
              car?.plate
                ? `<span class="d-block text-body-secondary small font-monospace">${escapeHtml(
                    car.plate,
                  )}</span>`
                : ''
            }
          </td>
          <td class="text-nowrap">
            ${escapeHtml(formatDate(request.startDate))} a ${escapeHtml(formatDate(request.endDate))}
          </td>
          <td class="text-nowrap">${escapeHtml(formatBRL(request.estimatedTotal))}</td>
          <td>${statusBadge(String(request.status ?? ''))}</td>
          <td class="text-end text-nowrap">
            <div class="d-inline-flex flex-wrap gap-1 justify-content-end">${actions.join('')}</div>
          </td>
        </tr>`;
    })
    .join('');

  const columnCount = clientView ? 6 : 7;
  const emptyMessage = statusFilter
    ? `Nenhum pedido com o status "${statusLabel(statusFilter)}".`
    : clientView
      ? 'Você ainda não fez nenhum pedido de aluguel.'
      : 'Nenhum pedido de aluguel cadastrado.';
  const emptyRow = `
    <tr>
      <td colspan="${columnCount}" class="text-center text-body-secondary py-4">
        ${escapeHtml(emptyMessage)}
      </td>
    </tr>`;

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">${clientView ? 'Meus pedidos' : 'Pedidos de aluguel'}</h1>
        <p class="text-body-secondary mb-0">
          ${
            clientView
              ? 'Acompanhe suas solicitações de aluguel.'
              : 'Analise e acompanhe os pedidos dos clientes.'
          }
        </p>
      </div>
      ${
        clientView
          ? '<a class="btn btn-primary" href="#/requests/new">Novo pedido</a>'
          : `<label class="d-flex align-items-center gap-2 mb-0">
               <span class="text-nowrap small text-body-secondary">Filtrar por status</span>
               <select class="form-select form-select-sm" data-status-filter aria-label="Filtrar por status">
                 ${statusFilterOptions(statusFilter)}
               </select>
             </label>`
      }
    </section>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Pedido</th>
              ${clientView ? '' : '<th scope="col">Cliente</th>'}
              <th scope="col">Carro</th>
              <th scope="col">Período</th>
              <th scope="col">Total</th>
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

  const statusSelect = container.querySelector('[data-status-filter]');
  if (statusSelect instanceof HTMLSelectElement) {
    statusSelect.addEventListener('change', () => {
      const value = statusSelect.value;
      navigate(value ? `/requests?status=${encodeURIComponent(value)}` : '/requests');
    });
  }

  for (const button of container.querySelectorAll('[data-cancel]')) {
    button.addEventListener('click', async () => {
      const id = button.getAttribute('data-cancel') ?? '';
      const request = sorted.find((item) => String(item.id) === String(id));
      if (!request || !canCancelRequest(session, request)) {
        showToast('Este pedido não pode ser cancelado.', 'danger');
        return;
      }
      if (!window.confirm(`Cancelar o pedido ${button.getAttribute('data-label') ?? ''}?`)) {
        return;
      }

      button.disabled = true;
      try {
        assertTransition(String(request.status), REQUEST_STATUS.CANCELLED, 'client');
        await updateRequest(request.id, {
          ...request,
          status: REQUEST_STATUS.CANCELLED,
          updatedAt: new Date().toISOString(),
        });
        showToast('Pedido cancelado com sucesso.', 'success');
        await render(container, context);
      } catch (error) {
        console.error(error);
        button.disabled = false;
        showToast('Não foi possível cancelar o pedido. Tente novamente.', 'danger');
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
    renderBlocked(container, 'Entre na sua conta para acessar os pedidos.');
    return;
  }

  await renderList(container, context, session);
}
