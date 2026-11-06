import { createCar, getCar, updateCar } from '../../data/cars.js';
import { canManageCars } from '../../domain/permissions.js';
import { validateCar } from '../../domain/validation.js';
import { escapeHtml } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

/**
 * @param {HTMLElement} container
 * @param {string} message
 * @returns {void}
 */
function renderBlocked(container, message) {
  container.innerHTML = `
    <div class="alert alert-danger" role="alert">${escapeHtml(message)}</div>
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
          ? 'Carro não encontrado.'
          : 'Não foi possível carregar o carro. Tente novamente.'
      }
    </div>
    <a class="btn btn-outline-secondary" href="#/cars">Voltar para carros</a>
  `;
}

/**
 * @param {string} status
 * @param {boolean} selected
 * @returns {string}
 */
function statusOption(status, selected) {
  const labels = {
    AVAILABLE: 'Disponível',
    RENTED: 'Alugado',
    MAINTENANCE: 'Manutenção',
  };
  return `<option value="${status}"${selected ? ' selected' : ''}>${labels[status]}</option>`;
}

/**
 * @param {Record<string, unknown>|null} car
 * @param {number} defaultYear
 * @returns {{ brand: string, model: string, year: string, plate: string, registration: string, dailyRate: string, status: string }}
 */
function formValues(car, defaultYear) {
  return {
    brand: String(car?.brand ?? ''),
    model: String(car?.model ?? ''),
    year: car?.year === undefined || car?.year === null ? String(defaultYear) : String(car.year),
    plate: String(car?.plate ?? ''),
    registration: String(car?.registration ?? ''),
    dailyRate: car?.dailyRate === undefined || car?.dailyRate === null ? '' : String(car.dailyRate),
    status: String(car?.status ?? 'AVAILABLE'),
  };
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session || !canManageCars(session)) {
    renderBlocked(container, 'Acesso restrito aos agentes da locadora.');
    return;
  }

  const carId = context.params?.id ?? null;
  const isEdit = carId !== null;
  const maxYear = new Date().getFullYear() + 1;

  let car = null;
  if (isEdit) {
    try {
      car = await getCar(carId);
    } catch (error) {
      console.error(error);
      renderLoadFailure(container, Number(error?.status) || 0);
      return;
    }
  }

  const values = formValues(car, new Date().getFullYear());
  const heading = isEdit ? 'Editar carro' : 'Novo carro';
  const description = isEdit
    ? 'Atualize os dados do veículo da frota.'
    : 'Cadastre um novo veículo na frota da locadora.';

  container.innerHTML = `
    <section class="row justify-content-center">
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h1 class="h3 card-title mb-1">${escapeHtml(heading)}</h1>
            <p class="text-body-secondary mb-4">${escapeHtml(description)}</p>

            <form id="car-form" novalidate>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-brand">Marca</label>
                  <input class="form-control" id="car-brand" name="brand" type="text" maxlength="60" value="${escapeHtml(values.brand)}" required />
                  <div class="invalid-feedback" data-error-for="brand"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-model">Modelo</label>
                  <input class="form-control" id="car-model" name="model" type="text" maxlength="60" value="${escapeHtml(values.model)}" required />
                  <div class="invalid-feedback" data-error-for="model"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-year">Ano</label>
                  <input class="form-control" id="car-year" name="year" type="number" min="1900" max="${maxYear}" step="1" value="${escapeHtml(values.year)}" required />
                  <div class="invalid-feedback" data-error-for="year"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-plate">Placa</label>
                  <input class="form-control text-uppercase" id="car-plate" name="plate" type="text" maxlength="10" value="${escapeHtml(values.plate)}" required />
                  <div class="invalid-feedback" data-error-for="plate"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-registration">Matrícula</label>
                  <input class="form-control" id="car-registration" name="registration" type="text" maxlength="30" value="${escapeHtml(values.registration)}" required />
                  <div class="invalid-feedback" data-error-for="registration"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-daily-rate">Diária (R$)</label>
                  <input class="form-control" id="car-daily-rate" name="dailyRate" type="number" min="0.01" step="0.01" value="${escapeHtml(values.dailyRate)}" required />
                  <div class="invalid-feedback" data-error-for="dailyRate"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="car-status">Status</label>
                  <select class="form-select" id="car-status" name="status" required>
                    ${statusOption('AVAILABLE', values.status === 'AVAILABLE')}
                    ${statusOption('RENTED', values.status === 'RENTED')}
                    ${statusOption('MAINTENANCE', values.status === 'MAINTENANCE')}
                  </select>
                  <div class="invalid-feedback" data-error-for="status"></div>
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mt-4">
                <button class="btn btn-primary" type="submit" data-submit>${isEdit ? 'Salvar alterações' : 'Cadastrar carro'}</button>
                <a class="btn btn-outline-secondary" href="#/cars">Cancelar</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#car-form');
  const submitButton = container.querySelector('[data-submit]');
  if (!form || !submitButton) return;

  /**
   * @param {{ field: string, message: string }} error
   * @returns {string}
   */
  function fieldMessage(error) {
    const messages = {
      brand: 'Informe a marca.',
      model: 'Informe o modelo.',
      year: `Informe um ano entre 1900 e ${maxYear}.`,
      plate: 'Informe a placa.',
      registration: 'Informe a matrícula.',
      dailyRate: 'A diária deve ser maior que zero.',
      status: 'Selecione um status válido.',
    };
    return messages[error.field] ?? error.message ?? 'Valor inválido.';
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
  }

  /**
   * @param {Array<{ field: string, message: string }>} errors
   * @returns {void}
   */
  function showErrors(errors) {
    let firstInvalid = null;
    for (const error of errors) {
      const input = form.querySelector(`[name="${error.field}"]`);
      const box = form.querySelector(`[data-error-for="${error.field}"]`);
      if (input) {
        input.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = input;
      }
      if (box) box.textContent = fieldMessage(error);
    }
    if (firstInvalid) firstInvalid.focus();
  }

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    target.classList.remove('is-invalid');
    const box = form.querySelector(`[data-error-for="${target.name}"]`);
    if (box) box.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const data = {
      brand: String(form.elements.brand.value ?? '').trim(),
      model: String(form.elements.model.value ?? '').trim(),
      year: Number(form.elements.year.value),
      plate: String(form.elements.plate.value ?? '').trim().toUpperCase(),
      registration: String(form.elements.registration.value ?? '').trim(),
      dailyRate: Number(form.elements.dailyRate.value),
      status: String(form.elements.status.value ?? ''),
    };

    const result = validateCar(data);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Salvando…';

    try {
      if (isEdit) {
        await updateCar(carId, { ...car, ...data });
        showToast('Carro atualizado com sucesso.', 'success');
      } else {
        /** @type {Record<string, unknown>} */
        const payload = { ...data, ownerType: 'COMPANY' };
        if (session.id) payload.ownerId = session.id;
        await createCar(payload);
        showToast('Carro cadastrado com sucesso.', 'success');
      }
      navigate('/cars');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível salvar o carro. Tente novamente.', 'danger');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = isEdit ? 'Salvar alterações' : 'Cadastrar carro';
    }
  });
}
