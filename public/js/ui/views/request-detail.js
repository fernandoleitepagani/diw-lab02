import { getCar } from '../../data/cars.js';
import { getClient } from '../../data/clients.js';
import { getRequest, updateRequest } from '../../data/requests.js';
import {
  canCancelRequest,
  canEditRequest,
  canExecuteContract,
  canReviewRequests,
  canViewRequest,
} from '../../domain/permissions.js';
import {
  allowedTransitions,
  assertTransition,
  REQUEST_STATUS,
} from '../../domain/request-state.js';
import { rentalDays } from '../../domain/pricing.js';
import {
  escapeHtml,
  formatBRL,
  formatDate,
  formatDateTime,
  statusLabel,
} from '../../format.js';
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

const TRANSITION_TOASTS = Object.freeze({
  UNDER_REVIEW: 'Pedido enviado para análise.',
  APPROVED: 'Pedido aprovado com sucesso.',
  REJECTED: 'Pedido rejeitado.',
  CANCELLED: 'Pedido cancelado com sucesso.',
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
 * @param {HTMLElement} container
 * @param {string} message
 * @param {string} backHref
 * @param {string} backLabel
 * @returns {void}
 */
function renderBlocked(container, message, backHref = '#/requests', backLabel = 'Voltar para pedidos') {
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Detalhe do pedido</h1>
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
          ? 'Pedido não encontrado.'
          : 'Não foi possível carregar o pedido. Tente novamente.'
      }
    </div>
    <a class="btn btn-outline-secondary" href="#/requests">Voltar para pedidos</a>
  `;
}

/**
 * @param {Record<string, unknown>} request
 * @param {Record<string, unknown>|null} car
 * @param {Record<string, unknown>|null} client
 * @returns {string}
 */
function renderDetails(request, car, client) {
  const days = rentalDays(
    String(request.startDate ?? ''),
    String(request.endDate ?? ''),
  );
  const carDescription = car
    ? `${String(car.brand ?? '')} ${String(car.model ?? '')}`.trim()
    : `Carro ${String(request.carId ?? '—')}`;
  const carExtra = car
    ? `${car.plate ? `Placa ${car.plate}` : ''}${
        car.dailyRate !== undefined ? ` · ${formatBRL(car.dailyRate)}/dia` : ''
      }`
    : '';
  const reviewNotes =
    typeof request.reviewNotes === 'string' ? request.reviewNotes.trim() : '';

  return `
    <div class="card shadow-sm h-100">
      <div class="card-body p-4">
        <h2 class="h5 card-title mb-3">Detalhes do pedido</h2>
        <dl class="row mb-0">
          <dt class="col-sm-4 col-lg-3 text-body-secondary">Cliente</dt>
          <dd class="col-sm-8 col-lg-9">
            ${escapeHtml(client?.name ?? `Cliente ${String(request.clientId ?? '—')}`)}
          </dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Carro</dt>
          <dd class="col-sm-8 col-lg-9">
            <span class="fw-semibold">${escapeHtml(carDescription)}</span>
            ${carExtra ? `<span class="d-block text-body-secondary small">${escapeHtml(carExtra)}</span>` : ''}
          </dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Período</dt>
          <dd class="col-sm-8 col-lg-9">
            ${escapeHtml(formatDate(request.startDate))} a ${escapeHtml(formatDate(request.endDate))}
          </dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Diárias</dt>
          <dd class="col-sm-8 col-lg-9">${days > 0 ? `${days}` : '—'}</dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Total estimado</dt>
          <dd class="col-sm-8 col-lg-9 fw-semibold">
            ${escapeHtml(formatBRL(request.estimatedTotal))}
          </dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Status</dt>
          <dd class="col-sm-8 col-lg-9">${statusBadge(String(request.status ?? ''))}</dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Observações</dt>
          <dd class="col-sm-8 col-lg-9">
            ${escapeHtml(request.notes || '—')}
          </dd>

          ${
            reviewNotes
              ? `<dt class="col-sm-4 col-lg-3 text-body-secondary">Parecer da análise</dt>
                 <dd class="col-sm-8 col-lg-9">${escapeHtml(reviewNotes)}</dd>`
              : ''
          }

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Criado em</dt>
          <dd class="col-sm-8 col-lg-9">${escapeHtml(formatDateTime(request.createdAt))}</dd>

          <dt class="col-sm-4 col-lg-3 text-body-secondary">Atualizado em</dt>
          <dd class="col-sm-8 col-lg-9 mb-0">${escapeHtml(formatDateTime(request.updatedAt))}</dd>
        </dl>
      </div>
    </div>
  `;
}

/**
 * @param {Record<string, unknown>} request
 * @param {Record<string, unknown>} session
 * @returns {string}
 */
function renderClientActions(request, session) {
  const actions = [];

  if (canEditRequest(session, request)) {
    actions.push(
      `<a class="btn btn-outline-secondary" href="#/requests/${encodeURIComponent(
        String(request.id),
      )}/edit">Editar pedido</a>`,
    );
  }

  if (canCancelRequest(session, request)) {
    actions.push(
      '<button class="btn btn-outline-danger" type="button" data-cancel>Cancelar pedido</button>',
    );
  }

  if (canExecuteContract(session, request)) {
    actions.push(
      `<a class="btn btn-primary" href="#/contracts/new?request=${encodeURIComponent(
        String(request.id),
      )}">Executar contrato</a>`,
    );
  }

  return actions.length > 0
    ? actions.join('')
    : '<p class="text-body-secondary mb-0">Nenhuma ação disponível para este pedido.</p>';
}

/**
 * @param {Record<string, unknown>} request
 * @param {Record<string, unknown>} session
 * @returns {string}
 */
function renderAgentActions(request, session) {
  if (!canReviewRequests(session)) {
    return '<p class="text-body-secondary mb-0">Nenhuma ação disponível para este pedido.</p>';
  }

  const status = String(request.status ?? '');
  const allowed = allowedTransitions(status, 'agent');

  if (status === REQUEST_STATUS.PENDING && allowed.includes(REQUEST_STATUS.UNDER_REVIEW)) {
    return `
      <p class="text-body-secondary">
        Inicie a análise para liberar a aprovação ou a rejeição do pedido.
      </p>
      <button class="btn btn-primary" type="button" data-transition="${REQUEST_STATUS.UNDER_REVIEW}">
        Iniciar análise
      </button>
    `;
  }

  if (status === REQUEST_STATUS.UNDER_REVIEW) {
    const canApprove = allowed.includes(REQUEST_STATUS.APPROVED);
    const canReject = allowed.includes(REQUEST_STATUS.REJECTED);
    if (!canApprove && !canReject) {
      return '<p class="text-body-secondary mb-0">Nenhuma ação disponível para este pedido.</p>';
    }

    return `
      <div class="mb-3">
        <label class="form-label" for="review-notes">Parecer da análise</label>
        <textarea
          class="form-control"
          id="review-notes"
          rows="3"
          maxlength="500"
          data-review-notes
          placeholder="Obrigatório ao rejeitar"
        >${escapeHtml(typeof request.reviewNotes === 'string' ? request.reviewNotes : '')}</textarea>
        <div class="invalid-feedback" data-review-error></div>
      </div>
      <div class="d-flex flex-wrap gap-2">
        ${
          canApprove
            ? `<button class="btn btn-success" type="button" data-transition="${REQUEST_STATUS.APPROVED}">Aprovar</button>`
            : ''
        }
        ${
          canReject
            ? `<button class="btn btn-outline-danger" type="button" data-transition="${REQUEST_STATUS.REJECTED}">Rejeitar</button>`
            : ''
        }
      </div>
    `;
  }

  return '<p class="text-body-secondary mb-0">Nenhuma ação de análise disponível neste status.</p>';
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} context
 * @param {Record<string, unknown>} session
 * @param {string} requestId
 * @returns {Promise<void>}
 */
async function renderDetail(container, context, session, requestId) {
  let request;
  try {
    request = await getRequest(requestId);
  } catch (error) {
    console.error(error);
    renderLoadFailure(container, Number(error?.status) || 0);
    return;
  }

  if (!canViewRequest(session, request)) {
    renderBlocked(container, 'Você não tem permissão para ver este pedido.');
    return;
  }

  const [client, car] = await Promise.all([
    request.clientId
      ? getClient(request.clientId).catch((error) => {
          console.error(error);
          return null;
        })
      : Promise.resolve(null),
    request.carId
      ? getCar(request.carId).catch((error) => {
          console.error(error);
          return null;
        })
      : Promise.resolve(null),
  ]);

  const reviewView = canReviewRequests(session);
  const actionsMarkup = reviewView
    ? renderAgentActions(request, session)
    : renderClientActions(request, session);

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">
          Pedido #${escapeHtml(request.id)} ${statusBadge(String(request.status ?? ''))}
        </h1>
        <p class="text-body-secondary mb-0">Solicitação de aluguel e seu andamento.</p>
      </div>
      <a class="btn btn-outline-secondary" href="#/requests">Voltar para pedidos</a>
    </section>

    <div class="row g-3">
      <div class="col-12 col-lg-8">
        ${renderDetails(request, car, client)}
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
   * @param {string} message
   * @returns {void}
   */
  function clearActionError() {
    if (!actionError) return;
    actionError.textContent = '';
    actionError.classList.add('d-none');
  }

  /**
   * @returns {void}
   */
  function setBusy(busy) {
    for (const button of container.querySelectorAll('[data-transition], [data-cancel]')) {
      if (button instanceof HTMLButtonElement) button.disabled = busy;
    }
  }

  const cancelButton = container.querySelector('[data-cancel]');
  if (cancelButton instanceof HTMLButtonElement) {
    cancelButton.addEventListener('click', async () => {
      clearActionError();
      if (!canCancelRequest(session, request)) {
        showActionError('Você não pode cancelar este pedido.');
        return;
      }
      if (!window.confirm(`Cancelar o pedido #${String(request.id)}?`)) return;

      setBusy(true);
      try {
        assertTransition(String(request.status), REQUEST_STATUS.CANCELLED, 'client');
        await updateRequest(request.id, {
          ...request,
          status: REQUEST_STATUS.CANCELLED,
          updatedAt: new Date().toISOString(),
        });
        showToast(TRANSITION_TOASTS.CANCELLED, 'success');
        await renderDetail(container, context, session, requestId);
      } catch (error) {
        console.error(error);
        setBusy(false);
        showActionError('Não foi possível cancelar o pedido. Tente novamente.');
      }
    });
  }

  for (const button of container.querySelectorAll('[data-transition]')) {
    button.addEventListener('click', async () => {
      clearActionError();
      const transition = button.getAttribute('data-transition') ?? '';
      const reviewInput = container.querySelector('[data-review-notes]');
      const reviewError = container.querySelector('[data-review-error]');
      const notes =
        reviewInput instanceof HTMLTextAreaElement ? reviewInput.value.trim() : '';

      if (transition === REQUEST_STATUS.REJECTED && !notes) {
        if (reviewInput instanceof HTMLTextAreaElement) {
          reviewInput.classList.add('is-invalid');
          reviewInput.focus();
        }
        if (reviewError) {
          reviewError.textContent = 'Informe o parecer para rejeitar o pedido.';
        }
        return;
      }

      setBusy(true);
      try {
        assertTransition(String(request.status), transition, 'agent');
        const writesReviewNotes =
          transition === REQUEST_STATUS.APPROVED || transition === REQUEST_STATUS.REJECTED;
        await updateRequest(request.id, {
          ...request,
          status: transition,
          ...(writesReviewNotes ? { reviewNotes: notes } : {}),
          updatedAt: new Date().toISOString(),
        });
        showToast(
          TRANSITION_TOASTS[transition] ?? 'Pedido atualizado com sucesso.',
          'success',
        );
        await renderDetail(container, context, session, requestId);
      } catch (error) {
        console.error(error);
        setBusy(false);
        showActionError('Não foi possível atualizar o pedido. Tente novamente.');
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

  const requestId = context.params?.id ?? '';
  if (!requestId) {
    renderBlocked(container, 'Pedido não encontrado.');
    return;
  }

  await renderDetail(container, context, session, String(requestId));
}
