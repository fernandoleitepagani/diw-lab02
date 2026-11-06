import { listAvailableCars, listCars } from '../../data/cars.js';
import {
  createRequest,
  findActiveRequestsForCar,
  getRequest,
  updateRequest,
} from '../../data/requests.js';
import { canEditRequest, isClient } from '../../domain/permissions.js';
import { estimateTotal, rentalDays } from '../../domain/pricing.js';
import { REQUEST_STATUS } from '../../domain/request-state.js';
import { datesOverlap, validateRentalRequest } from '../../domain/validation.js';
import { escapeHtml, formatBRL } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

const FIELD_MESSAGES = Object.freeze({
  clientId: 'Não foi possível identificar seu cadastro de cliente.',
  carId: 'Selecione um carro disponível.',
  startDate: 'Informe a data de retirada.',
  endDate: 'Informe uma data de devolução posterior à retirada.',
  estimatedTotal: 'Não foi possível calcular o valor estimado.',
  notes: 'As observações devem ser um texto.',
});

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
        <h1 class="h3 card-title">Pedido de aluguel</h1>
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
 * @param {Record<string, unknown>} car
 * @param {string} selectedId
 * @returns {string}
 */
function carOption(car, selectedId) {
  const label = `${car.brand ?? ''} ${car.model ?? ''}`.trim();
  const plate = car.plate ? ` — ${car.plate}` : '';
  const rate = ` — ${formatBRL(car.dailyRate)}/dia`;
  return `<option value="${escapeHtml(car.id)}"${
    String(car.id) === selectedId ? ' selected' : ''
  }>${escapeHtml(`${label}${plate}${rate}`)}</option>`;
}

/**
 * @param {Array<{ field: string, message: string }>} errors
 * @returns {Map<string, string>}
 */
function firstMessageByField(errors) {
  const messages = new Map();
  for (const error of errors) {
    if (!messages.has(error.field)) messages.set(error.field, error.message);
  }
  return messages;
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session || !isClient(session)) {
    renderBlocked(container, 'Apenas clientes podem solicitar aluguéis.');
    return;
  }

  if (session.clientId === undefined || session.clientId === null || session.clientId === '') {
    renderBlocked(container, 'Não foi possível identificar seu cadastro de cliente.');
    return;
  }

  const clientId = session.clientId;
  const requestId = context.params?.id ?? null;
  const isEdit = requestId !== null;

  let request = null;
  if (isEdit) {
    try {
      request = await getRequest(requestId);
    } catch (error) {
      console.error(error);
      renderLoadFailure(container, Number(error?.status) || 0);
      return;
    }

    if (!canEditRequest(session, request)) {
      renderBlocked(
        container,
        'Este pedido não pode mais ser editado.',
        `#/requests/${encodeURIComponent(String(requestId))}`,
        'Voltar para o pedido',
      );
      return;
    }
  }

  let cars;
  try {
    cars = isEdit ? await listCars() : await listAvailableCars();
  } catch (error) {
    console.error(error);
    renderLoadFailure(container, 0);
    return;
  }

  const selectableCars = isEdit
    ? cars.filter(
        (car) =>
          car.status === 'AVAILABLE' || String(car.id) === String(request?.carId ?? ''),
      )
    : cars.filter((car) => car.status === 'AVAILABLE');

  if (!isEdit && selectableCars.length === 0) {
    container.innerHTML = `
      <section class="card shadow-sm">
        <div class="card-body p-4">
          <h1 class="h3 card-title">Novo pedido</h1>
          <div class="alert alert-info mb-3" role="status">
            Nenhum carro disponível para aluguel no momento. Tente novamente mais tarde.
          </div>
          <a class="btn btn-outline-secondary" href="#/cars">Ver carros</a>
        </div>
      </section>
    `;
    return;
  }

  const requestedCarId = String(context.query?.get('car') ?? '');
  const currentCarId = isEdit ? String(request?.carId ?? '') : requestedCarId;
  const selectedCarId = selectableCars.some((car) => String(car.id) === currentCarId)
    ? currentCarId
    : '';
  const values = {
    carId: selectedCarId,
    startDate: isEdit ? String(request?.startDate ?? '') : '',
    endDate: isEdit ? String(request?.endDate ?? '') : '',
    notes: isEdit ? String(request?.notes ?? '') : '',
  };
  const prefillWarning =
    !isEdit && requestedCarId && !selectedCarId
      ? `<div class="alert alert-warning" role="alert">
           O carro selecionado não está disponível. Escolha outro veículo.
         </div>`
      : '';
  const heading = isEdit ? 'Editar pedido' : 'Novo pedido de aluguel';
  const description = isEdit
    ? 'Atualize o carro, o período ou as observações enquanto o pedido está pendente.'
    : 'Escolha um carro disponível e informe o período desejado.';

  container.innerHTML = `
    <section class="row justify-content-center">
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h1 class="h3 card-title mb-1">${escapeHtml(heading)}</h1>
            <p class="text-body-secondary mb-4">${escapeHtml(description)}</p>
            ${prefillWarning}

            <form id="request-form" novalidate>
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label" for="request-car">Carro</label>
                  <select class="form-select" id="request-car" name="carId" required>
                    <option value="">Selecione um carro</option>
                    ${selectableCars.map((car) => carOption(car, values.carId)).join('')}
                  </select>
                  <div class="invalid-feedback" data-error-for="carId"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="request-start">Data de retirada</label>
                  <input class="form-control" id="request-start" name="startDate" type="date" value="${escapeHtml(
                    values.startDate,
                  )}" required />
                  <div class="invalid-feedback" data-error-for="startDate"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="request-end">Data de devolução</label>
                  <input class="form-control" id="request-end" name="endDate" type="date" value="${escapeHtml(
                    values.endDate,
                  )}" required />
                  <div class="invalid-feedback" data-error-for="endDate"></div>
                </div>

                <div class="col-12">
                  <label class="form-label" for="request-notes">Observações</label>
                  <textarea class="form-control" id="request-notes" name="notes" rows="3" maxlength="500" placeholder="Opcional">${escapeHtml(
                    values.notes,
                  )}</textarea>
                  <div class="invalid-feedback" data-error-for="notes"></div>
                </div>
              </div>

              <div class="card bg-body-tertiary border-0 mt-4">
                <div class="card-body">
                  <p class="small text-body-secondary mb-2" data-rate></p>
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span>Diárias</span>
                    <span data-days>—</span>
                  </div>
                  <div class="d-flex justify-content-between align-items-center">
                    <span>Valor estimado</span>
                    <strong class="fs-5" data-total>—</strong>
                  </div>
                  <p class="small text-body-secondary mb-0 mt-2">
                    O valor é calculado automaticamente a partir da diária do carro e do período.
                  </p>
                </div>
              </div>

              <div class="alert alert-danger d-none mt-3" role="alert" data-form-error></div>

              <div class="d-flex flex-wrap gap-2 mt-4">
                <button class="btn btn-primary" type="submit" data-submit>${
                  isEdit ? 'Salvar alterações' : 'Solicitar aluguel'
                }</button>
                <a class="btn btn-outline-secondary" href="${
                  isEdit
                    ? `#/requests/${encodeURIComponent(String(requestId))}`
                    : '#/requests'
                }">Cancelar</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#request-form');
  const submitButton = container.querySelector('[data-submit]');
  const daysOutput = container.querySelector('[data-days]');
  const totalOutput = container.querySelector('[data-total]');
  const rateOutput = container.querySelector('[data-rate]');
  const formError = container.querySelector('[data-form-error]');
  if (!form || !submitButton) return;

  const carInput = form.querySelector('[name="carId"]');
  const startInput = form.querySelector('[name="startDate"]');
  const endInput = form.querySelector('[name="endDate"]');

  /**
   * @returns {Record<string, unknown>|null}
   */
  function selectedCar() {
    const carId = String(form.elements.carId.value ?? '');
    return selectableCars.find((car) => String(car.id) === carId) ?? null;
  }

  /**
   * @returns {void}
   */
  function updateSummary() {
    const car = selectedCar();
    const startDate = String(form.elements.startDate.value ?? '');
    const endDate = String(form.elements.endDate.value ?? '');
    const days = car ? rentalDays(startDate, endDate) : 0;
    const total = car ? estimateTotal(car.dailyRate, startDate, endDate) : 0;

    if (rateOutput) {
      rateOutput.textContent = car ? `Diária: ${formatBRL(car.dailyRate)}` : '';
    }
    if (daysOutput) daysOutput.textContent = days > 0 ? `${days} diária(s)` : '—';
    if (totalOutput) totalOutput.textContent = days > 0 ? formatBRL(total) : '—';
  }

  /**
   * @returns {void}
   */
  function clearErrors() {
    for (const input of form.querySelectorAll('.is-invalid')) {
      input.classList.remove('is-invalid');
    }
    for (const box of form.querySelectorAll('[data-error-for]')) {
      box.textContent = '';
    }
    if (formError) {
      formError.textContent = '';
      formError.classList.add('d-none');
    }
  }

  /**
   * @param {Array<{ field: string, message: string }>} errors
   * @returns {void}
   */
  function showErrors(errors) {
    const messages = firstMessageByField(errors);
    let firstInvalid = null;
    for (const [field, message] of messages) {
      const input = form.querySelector(`[name="${field}"]`);
      const box = form.querySelector(`[data-error-for="${field}"]`);
      if (input) {
        input.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = input;
      }
      if (box) box.textContent = FIELD_MESSAGES[field] ?? message ?? 'Valor inválido.';
    }
    if (firstInvalid) firstInvalid.focus();
  }

  /**
   * @param {string} message
   * @returns {void}
   */
  function showFormError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.classList.remove('d-none');
    formError.scrollIntoView({ block: 'nearest' });
  }

  for (const input of [carInput, startInput, endInput]) {
    input?.addEventListener('input', updateSummary);
    input?.addEventListener('change', updateSummary);
  }

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    target.classList.remove('is-invalid');
    const box = form.querySelector(`[data-error-for="${target.name}"]`);
    if (box) box.textContent = '';
    if (formError) {
      formError.textContent = '';
      formError.classList.add('d-none');
    }
  });

  updateSummary();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const carId = String(form.elements.carId.value ?? '');
    const startDate = String(form.elements.startDate.value ?? '');
    const endDate = String(form.elements.endDate.value ?? '');
    const notes = String(form.elements.notes.value ?? '').trim();
    const car = selectableCars.find((item) => String(item.id) === carId) ?? null;

    if (!car || (!isEdit && car.status !== 'AVAILABLE')) {
      showErrors([{ field: 'carId', message: 'Selecione um carro disponível.' }]);
      return;
    }

    const estimatedTotal = estimateTotal(car.dailyRate, startDate, endDate);
    const result = validateRentalRequest({
      clientId,
      carId,
      startDate,
      endDate,
      estimatedTotal,
      notes,
    });
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Salvando…';

    try {
      const activeRequests = await findActiveRequestsForCar(carId);
      const overlapping = activeRequests.find(
        (active) =>
          String(active.id) !== String(requestId ?? '') &&
          datesOverlap(startDate, endDate, active.startDate, active.endDate),
      );

      if (overlapping) {
        showFormError(
          `As datas escolhidas se sobrepõem ao pedido #${overlapping.id}, que já está contratado ou ativo para este carro.`,
        );
        return;
      }

      const now = new Date().toISOString();

      if (isEdit && request) {
        await updateRequest(requestId, {
          ...request,
          carId,
          startDate,
          endDate,
          notes,
          estimatedTotal,
          updatedAt: now,
        });
        showToast('Pedido atualizado com sucesso.', 'success');
        navigate(`/requests/${encodeURIComponent(String(requestId))}`);
        return;
      }

      const created = await createRequest({
        clientId,
        carId,
        startDate,
        endDate,
        estimatedTotal,
        status: REQUEST_STATUS.PENDING,
        notes,
        reviewNotes: '',
        createdAt: now,
        updatedAt: now,
      });
      showToast('Pedido solicitado com sucesso.', 'success');
      navigate(`/requests/${encodeURIComponent(String(created.id))}`);
    } catch (error) {
      console.error(error);
      showToast('Não foi possível salvar o pedido. Tente novamente.', 'danger');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = isEdit ? 'Salvar alterações' : 'Solicitar aluguel';
    }
  });
}
