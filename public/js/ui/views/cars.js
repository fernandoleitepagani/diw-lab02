import {
  CarDeleteBlockedError,
  deleteCar,
  listAvailableCars,
  listCars,
} from '../../data/cars.js';
import { canManageCars, isClient } from '../../domain/permissions.js';
import { carStatusLabel, escapeHtml, formatBRL, formatDate } from '../../format.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

const STATUS_BADGES = Object.freeze({
  AVAILABLE: 'text-bg-success',
  RENTED: 'text-bg-primary',
  MAINTENANCE: 'text-bg-secondary',
});

/**
 * @param {Record<string, unknown>} car
 * @returns {string}
 */
function carTitle(car) {
  return `${car.brand ?? ''} ${car.model ?? ''}`.trim();
}

/**
 * @param {string|null|undefined} status
 * @returns {string}
 */
function statusBadge(status) {
  const variant = STATUS_BADGES[status] ?? 'text-bg-secondary';
  return `<span class="badge ${variant}">${escapeHtml(carStatusLabel(status))}</span>`;
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} prefix
 * @returns {string}
 */
function describeRecords(records, prefix) {
  return records
    .map((record) => {
      const period =
        record.startDate || record.endDate
          ? ` (${formatDate(record.startDate)} a ${formatDate(record.endDate)})`
          : '';
      return `${prefix} #${record.id}${period}`;
    })
    .join(', ');
}

/**
 * Builds a PT-BR message naming the records that block the deletion.
 * @param {CarDeleteBlockedError} error
 * @returns {string}
 */
function blockedDeleteMessage(error) {
  const parts = [];
  if (error.rentalRequests.length > 0) {
    parts.push(`pedidos de aluguel: ${describeRecords(error.rentalRequests, 'Pedido')}`);
  }
  if (error.contracts.length > 0) {
    parts.push(`contratos: ${describeRecords(error.contracts, 'Contrato')}`);
  }
  return `Não é possível excluir este carro: existem registros vinculados — ${parts.join('; ')}.`;
}

/**
 * @param {HTMLElement} container
 * @returns {void}
 */
function renderLoadError(container) {
  container.innerHTML = `
    <div class="alert alert-danger" role="alert">
      Não foi possível carregar os carros. Tente novamente.
    </div>
  `;
}

/**
 * @param {HTMLElement} container
 * @returns {Promise<void>}
 */
async function renderCatalog(container) {
  let cars;
  try {
    cars = await listAvailableCars();
  } catch (error) {
    console.error(error);
    renderLoadError(container);
    return;
  }

  const available = cars.filter((car) => car.status === 'AVAILABLE');
  const cards = available
    .map((car) => {
      const requestHref = `#/requests/new?car=${encodeURIComponent(String(car.id))}`;
      return `
        <div class="col-12 col-sm-6 col-lg-4">
          <article class="card h-100 shadow-sm car-card">
            <div class="card-body d-flex flex-column">
              <h2 class="h5 card-title mb-1">${escapeHtml(carTitle(car))}</h2>
              <p class="text-body-secondary small mb-3">
                Ano ${escapeHtml(car.year)} · Placa <span class="font-monospace">${escapeHtml(car.plate)}</span>
              </p>
              <p class="mb-3">
                <span class="fs-5 fw-semibold">${escapeHtml(formatBRL(car.dailyRate))}</span>
                <span class="text-body-secondary small">/ dia</span>
              </p>
              <a class="btn btn-primary mt-auto" href="${escapeHtml(requestHref)}">Solicitar aluguel</a>
            </div>
          </article>
        </div>`;
    })
    .join('');

  const emptyState = `
    <div class="col-12">
      <div class="card shadow-sm">
        <div class="card-body p-4 text-center text-body-secondary">
          Nenhum carro disponível no momento.
        </div>
      </div>
    </div>`;

  container.innerHTML = `
    <section class="mb-4">
      <h1 class="h3 mb-1">Carros disponíveis</h1>
      <p class="text-body-secondary mb-0">Escolha um veículo e solicite o aluguel.</p>
    </section>
    <section class="row g-3" aria-label="Carros disponíveis">
      ${available.length > 0 ? cards : emptyState}
    </section>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {Record<string, unknown>} context
 * @param {{ role?: string, agentType?: string|null }|null} session
 * @returns {Promise<void>}
 */
async function renderFleet(container, context, session) {
  const canManage = canManageCars(session);

  let cars;
  try {
    cars = await listCars();
  } catch (error) {
    console.error(error);
    renderLoadError(container);
    return;
  }

  const rows = cars
    .map((car) => {
      const editHref = `#/cars/${encodeURIComponent(String(car.id))}/edit`;
      const actions = canManage
        ? `<a class="btn btn-sm btn-outline-secondary" href="${escapeHtml(editHref)}">Editar</a>
           <button
             class="btn btn-sm btn-outline-danger"
             type="button"
             data-delete="${escapeHtml(car.id)}"
             data-label="${escapeHtml(`${carTitle(car)} (${car.plate})`)}"
           >Excluir</button>`
        : '';

      return `
        <tr>
          <td>${escapeHtml(carTitle(car))}</td>
          <td>${escapeHtml(car.year)}</td>
          <td class="font-monospace">${escapeHtml(car.plate)}</td>
          <td class="font-monospace">${escapeHtml(car.registration)}</td>
          <td class="text-nowrap">${escapeHtml(formatBRL(car.dailyRate))}</td>
          <td>${statusBadge(car.status)}</td>
          <td class="text-end text-nowrap">${actions}</td>
        </tr>`;
    })
    .join('');

  const emptyState = `
    <tr>
      <td colspan="${canManage ? 7 : 6}" class="text-center text-body-secondary py-4">
        Nenhum carro cadastrado.
      </td>
    </tr>`;

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 class="h3 mb-1">Carros</h1>
        <p class="text-body-secondary mb-0">
          ${
            canManage
              ? 'Gerencie a frota da locadora.'
              : 'Consulta da frota (somente leitura).'
          }
        </p>
      </div>
      ${
        canManage
          ? '<a class="btn btn-primary" href="#/cars/new">Novo carro</a>'
          : ''
      }
    </section>
    <div class="alert alert-danger d-none" role="alert" data-alert></div>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Carro</th>
              <th scope="col">Ano</th>
              <th scope="col">Placa</th>
              <th scope="col">Matrícula</th>
              <th scope="col">Diária</th>
              <th scope="col">Status</th>
              ${canManage ? '<th scope="col" class="text-end">Ações</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${cars.length > 0 ? rows : emptyState}
          </tbody>
        </table>
      </div>
    </div>
  `;

  const alertBox = container.querySelector('[data-alert]');
  const deleteButtons = container.querySelectorAll('[data-delete]');
  for (const button of deleteButtons) {
    button.addEventListener('click', async () => {
      const id = button.dataset.delete ?? '';
      const label = button.dataset.label ?? '';
      if (!window.confirm(`Excluir o carro ${label}?`)) return;

      button.disabled = true;
      if (alertBox) alertBox.classList.add('d-none');

      try {
        await deleteCar(id);
        showToast('Carro excluído com sucesso.', 'success');
        await renderFleet(container, context, session);
      } catch (error) {
        button.disabled = false;
        if (error instanceof CarDeleteBlockedError) {
          const message = blockedDeleteMessage(error);
          if (alertBox) {
            alertBox.textContent = message;
            alertBox.classList.remove('d-none');
          }
          showToast(message, 'danger');
          return;
        }
        console.error(error);
        showToast('Não foi possível excluir o carro. Tente novamente.', 'danger');
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
    container.innerHTML = `
      <div class="alert alert-warning" role="alert">
        Entre na sua conta para acessar os carros.
      </div>
    `;
    return;
  }

  if (isClient(session)) {
    await renderCatalog(container);
    return;
  }

  await renderFleet(container, context, session);
}
