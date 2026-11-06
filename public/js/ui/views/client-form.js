import { ApiError } from '../../api.js';
import {
  createClient,
  findClientByCpf,
  getClient,
  updateClient,
} from '../../data/clients.js';
import { formatCpf, isValidCpf } from '../../domain/cpf.js';
import { canManageClients } from '../../domain/permissions.js';
import { MAX_EMPLOYERS, validateClient } from '../../domain/validation.js';
import { escapeHtml } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

/**
 * @param {'c'} prefix
 * @returns {string}
 */
function createId(prefix) {
  const random =
    globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

/**
 * @param {string} field
 * @returns {string}
 */
function messageForField(field) {
  if (field === 'name') return 'Informe o nome completo.';
  if (field === 'cpf') return 'CPF inválido.';
  if (field === 'rg') return 'Informe o RG.';
  if (field === 'address') return 'Informe o endereço.';
  if (field === 'profession') return 'Informe a profissão.';
  if (field === 'employers') return `Informe no máximo ${MAX_EMPLOYERS} vínculos.`;
  if (field.endsWith('.name')) return 'Informe o nome da empresa.';
  if (field.endsWith('.income')) return 'Informe uma renda válida (maior ou igual a zero).';
  return 'Dados inválidos.';
}

/**
 * @param {HTMLElement|null} container
 * @returns {void}
 */
function renderForbidden(container) {
  if (!container) return;
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Acesso negado</h1>
        <p class="text-body-secondary">Você não tem permissão para gerenciar clientes.</p>
        <a class="btn btn-primary" href="#/">Voltar ao painel</a>
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement|null} container
 * @returns {void}
 */
function renderLoading(container) {
  if (!container) return;
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4 d-flex align-items-center gap-2 text-body-secondary">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Carregando cliente…
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement|null} container
 * @param {string} message
 * @param {() => void} onRetry
 * @returns {void}
 */
function renderLoadError(container, message, onRetry) {
  if (!container) return;
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Cliente</h1>
        <div class="alert alert-danger" role="alert">${escapeHtml(message)}</div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-primary" data-retry>Tentar novamente</button>
          <a class="btn btn-outline-secondary" href="#/clients">Voltar para clientes</a>
        </div>
      </div>
    </section>
  `;
  container.querySelector('[data-retry]')?.addEventListener('click', onRetry);
}

/**
 * @param {HTMLElement|null} container
 * @returns {void}
 */
function renderNotFound(container) {
  if (!container) return;
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Cliente não encontrado</h1>
        <p class="text-body-secondary mb-3">O cliente solicitado não existe ou foi removido.</p>
        <a class="btn btn-primary" href="#/clients">Voltar para clientes</a>
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {import('../../data/clients.js').ClientRecord|null} client
 * @param {string} clientId
 * @returns {void}
 */
function renderForm(container, client, clientId) {
  const isEdit = Boolean(clientId);
  const pageTitle = isEdit ? 'Editar cliente' : 'Novo cliente';
  const pageDescription = isEdit
    ? `Atualize os dados cadastrais de ${escapeHtml(client?.name ?? 'cliente')}.`
    : 'Cadastre um cliente para que ele possa solicitar aluguéis.';
  const submitLabel = isEdit ? 'Salvar alterações' : 'Cadastrar cliente';

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h1 class="h3 mb-1">${escapeHtml(pageTitle)}</h1>
        <p class="text-body-secondary mb-0">${pageDescription}</p>
      </div>
      <a class="btn btn-outline-secondary" href="#/clients">Voltar</a>
    </section>

    <div class="alert alert-danger d-none" role="alert" data-form-error></div>

    <form id="client-form" novalidate>
      <section class="card shadow-sm mb-3">
        <div class="card-body">
          <h2 class="h6 text-uppercase text-body-secondary mb-3">Dados pessoais</h2>
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label" for="client-name">Nome completo</label>
              <input
                class="form-control"
                id="client-name"
                name="name"
                type="text"
                autocomplete="name"
                data-field="name"
                value="${escapeHtml(client?.name ?? '')}"
                required
              />
              <div class="invalid-feedback" data-error-for="name"></div>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label" for="client-cpf">CPF</label>
              <input
                class="form-control"
                id="client-cpf"
                name="cpf"
                type="text"
                inputmode="numeric"
                placeholder="000.000.000-00"
                autocomplete="off"
                data-field="cpf"
                value="${escapeHtml(client?.cpf ? formatCpf(client.cpf) : '')}"
                required
              />
              <div class="invalid-feedback" data-error-for="cpf"></div>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label" for="client-rg">RG</label>
              <input
                class="form-control"
                id="client-rg"
                name="rg"
                type="text"
                autocomplete="off"
                data-field="rg"
                value="${escapeHtml(client?.rg ?? '')}"
                required
              />
              <div class="invalid-feedback" data-error-for="rg"></div>
            </div>

            <div class="col-12">
              <label class="form-label" for="client-address">Endereço</label>
              <input
                class="form-control"
                id="client-address"
                name="address"
                type="text"
                autocomplete="street-address"
                data-field="address"
                value="${escapeHtml(client?.address ?? '')}"
                required
              />
              <div class="invalid-feedback" data-error-for="address"></div>
            </div>

            <div class="col-12 col-md-6">
              <label class="form-label" for="client-profession">Profissão</label>
              <input
                class="form-control"
                id="client-profession"
                name="profession"
                type="text"
                autocomplete="organization-title"
                data-field="profession"
                value="${escapeHtml(client?.profession ?? '')}"
                required
              />
              <div class="invalid-feedback" data-error-for="profession"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="card shadow-sm mb-3">
        <div class="card-body">
          <fieldset>
            <legend class="h6">Vínculos empregatícios</legend>
            <p class="text-body-secondary small">
              Informe até ${MAX_EMPLOYERS} vínculos. A renda é usada na análise dos pedidos.
            </p>
            <div data-employers></div>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-add-employer>
              Adicionar vínculo
            </button>
            <div class="invalid-feedback" data-error-for="employers"></div>
          </fieldset>
        </div>
      </section>

      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-primary" type="submit" data-submit>${escapeHtml(submitLabel)}</button>
        <a class="btn btn-outline-secondary" href="#/clients">Cancelar</a>
      </div>
    </form>
  `;

  const form = container.querySelector('#client-form');
  const errorBox = container.querySelector('[data-form-error]');
  const employerContainer = container.querySelector('[data-employers]');
  const addEmployerButton = container.querySelector('[data-add-employer]');
  const submitButton = container.querySelector('[data-submit]');
  const nameInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#client-name'));
  const cpfInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#client-cpf'));
  const rgInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#client-rg'));
  const addressInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#client-address'));
  const professionInput = /** @type {HTMLInputElement|null} */ (
    container.querySelector('#client-profession')
  );

  if (
    !(form instanceof HTMLFormElement) ||
    !errorBox ||
    !(employerContainer instanceof HTMLElement) ||
    !(addEmployerButton instanceof HTMLButtonElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !nameInput ||
    !cpfInput ||
    !rgInput ||
    !addressInput ||
    !professionInput
  ) {
    return;
  }

  let employerSequence = 0;

  /**
   * @param {{ name?: unknown, income?: unknown }} [employer]
   * @returns {HTMLDivElement}
   */
  function createEmployerRow(employer = {}) {
    employerSequence += 1;
    const fieldId = `client-employer-${employerSequence}`;
    const row = document.createElement('div');
    row.className = 'row g-2 align-items-end employer-row mb-2';
    row.innerHTML = `
      <div class="col-12 col-sm-5">
        <label class="form-label small" for="${fieldId}">Empresa</label>
        <input
          class="form-control"
          id="${fieldId}"
          data-employer-name
          type="text"
          value="${escapeHtml(employer.name ?? '')}"
        />
        <div class="invalid-feedback" data-employer-error="name"></div>
      </div>
      <div class="col-7 col-sm-4">
        <label class="form-label small" for="${fieldId}-income">Renda mensal (R$)</label>
        <input
          class="form-control"
          id="${fieldId}-income"
          data-employer-income
          type="number"
          min="0"
          step="0.01"
          value="${escapeHtml(employer.income ?? '')}"
        />
        <div class="invalid-feedback" data-employer-error="income"></div>
      </div>
      <div class="col-5 col-sm-3">
        <button
          type="button"
          class="btn btn-outline-danger w-100"
          data-remove-employer
          aria-label="Remover vínculo"
        >
          Remover
        </button>
      </div>
    `;
    return row;
  }

  function updateEmployerControls() {
    const count = employerContainer.querySelectorAll('.employer-row').length;
    addEmployerButton.disabled = count >= MAX_EMPLOYERS;
  }

  function reindexEmployerRows() {
    const rows = Array.from(employerContainer.querySelectorAll('.employer-row'));
    rows.forEach((row, index) => {
      const nameField = row.querySelector('[data-employer-name]');
      const incomeField = row.querySelector('[data-employer-income]');
      const nameFeedback = row.querySelector('[data-employer-error="name"]');
      const incomeFeedback = row.querySelector('[data-employer-error="income"]');

      if (nameField instanceof HTMLElement) nameField.dataset.field = `employers.${index}.name`;
      if (incomeField instanceof HTMLElement) incomeField.dataset.field = `employers.${index}.income`;
      if (nameFeedback instanceof HTMLElement) {
        nameFeedback.dataset.errorFor = `employers.${index}.name`;
      }
      if (incomeFeedback instanceof HTMLElement) {
        incomeFeedback.dataset.errorFor = `employers.${index}.income`;
      }
    });
  }

  const initialEmployers =
    Array.isArray(client?.employers) && client.employers.length > 0 ? client.employers : [{}];
  for (const employer of initialEmployers) employerContainer.append(createEmployerRow(employer));
  reindexEmployerRows();
  updateEmployerControls();

  addEmployerButton.addEventListener('click', () => {
    const count = employerContainer.querySelectorAll('.employer-row').length;
    if (count >= MAX_EMPLOYERS) return;
    employerContainer.append(createEmployerRow());
    reindexEmployerRows();
    updateEmployerControls();
    const rows = employerContainer.querySelectorAll('.employer-row');
    const lastRow = rows[rows.length - 1];
    const lastInput = lastRow?.querySelector('[data-employer-name]');
    if (lastInput instanceof HTMLInputElement) lastInput.focus();
  });

  employerContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.closest('[data-remove-employer]')) return;
    target.closest('.employer-row')?.remove();
    reindexEmployerRows();
    updateEmployerControls();
  });

  cpfInput.addEventListener('blur', () => {
    cpfInput.value = formatCpf(cpfInput.value);
  });

  function showFormError(message) {
    errorBox.textContent = message;
    errorBox.classList.remove('d-none');
  }

  function hideFormError() {
    errorBox.textContent = '';
    errorBox.classList.add('d-none');
  }

  function clearFieldErrors() {
    container.querySelectorAll('.is-invalid').forEach((element) => {
      element.classList.remove('is-invalid');
    });
    container.querySelectorAll('[data-error-for]').forEach((element) => {
      element.textContent = '';
      element.classList.remove('d-block');
    });
    hideFormError();
  }

  /**
   * @param {Record<string, string>} errors
   * @returns {void}
   */
  function showFieldErrors(errors) {
    clearFieldErrors();
    const unhandled = [];
    let firstInvalid = null;

    for (const [field, message] of Object.entries(errors)) {
      const feedback = container.querySelector(`[data-error-for="${field}"]`);
      const input = container.querySelector(`[data-field="${field}"]`);

      if (feedback) {
        feedback.textContent = message;
        feedback.classList.add('d-block');
      }
      if (input instanceof HTMLElement) {
        input.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = input;
      }
      if (!feedback && !input) unhandled.push(message);
    }

    if (unhandled.length > 0) showFormError(unhandled.join(' '));
    if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'Salvando…' : submitLabel;
  }

  /**
   * @returns {Array<{ name: string, income: number|string }>}
   */
  function readEmployers() {
    return Array.from(employerContainer.querySelectorAll('.employer-row'))
      .map((row) => {
        const nameField = row.querySelector('[data-employer-name]');
        const incomeField = row.querySelector('[data-employer-income]');
        const employerName = nameField instanceof HTMLInputElement ? nameField.value.trim() : '';
        const incomeRaw = incomeField instanceof HTMLInputElement ? incomeField.value : '';
        return {
          name: employerName,
          income: incomeRaw === '' ? '' : Number(incomeRaw),
        };
      })
      .filter((employer) => employer.name !== '' || employer.income !== '');
  }

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const field = target.dataset.field;
    if (!field) return;

    target.classList.remove('is-invalid');
    const feedback = container.querySelector(`[data-error-for="${field}"]`);
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('d-block');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFieldErrors();

    const name = nameInput.value.trim();
    const rg = rgInput.value.trim();
    const cpf = formatCpf(cpfInput.value);
    const address = addressInput.value.trim();
    const profession = professionInput.value.trim();
    const employers = readEmployers();

    /** @type {Record<string, string>} */
    const errors = {};
    if (!name) errors.name = messageForField('name');
    if (!rg) errors.rg = messageForField('rg');
    if (!address) errors.address = messageForField('address');
    if (!profession) errors.profession = messageForField('profession');
    if (!isValidCpf(cpf)) errors.cpf = messageForField('cpf');

    const result = validateClient({ name, rg, cpf, address, profession, employers });
    for (const issue of result.errors) {
      if (!errors[issue.field]) errors[issue.field] = messageForField(issue.field);
    }

    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const duplicate = await findClientByCpf(cpf);
      if (duplicate && (!client || String(duplicate.id) !== String(client.id))) {
        showFieldErrors({ cpf: 'Já existe um cliente cadastrado com este CPF.' });
        return;
      }

      if (client) {
        await updateClient(client.id, {
          ...client,
          name,
          rg,
          cpf,
          address,
          profession,
          employers,
        });
        showToast('Cliente atualizado com sucesso.', 'success');
      } else {
        await createClient({
          id: createId('c'),
          name,
          rg,
          cpf,
          address,
          profession,
          employers,
          createdAt: new Date().toISOString(),
        });
        showToast('Cliente cadastrado com sucesso.', 'success');
      }

      navigate('/clients');
    } catch (error) {
      console.error(error);
      showFormError('Não foi possível salvar o cliente. Tente novamente.');
    } finally {
      if (submitButton.isConnected) setBusy(false);
    }
  });
}

/**
 * Agent-only create/edit screen.
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();
  if (!canManageClients(session)) {
    renderForbidden(container);
    return;
  }

  const clientId = context.params?.id ? String(context.params.id) : '';
  const retry = () => void render(container, context);
  renderLoading(container);

  /** @type {import('../../data/clients.js').ClientRecord|null} */
  let client = null;
  if (clientId) {
    try {
      client = await getClient(clientId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        renderNotFound(container);
        return;
      }
      console.error(error);
      renderLoadError(container, 'Não foi possível carregar o cliente.', retry);
      return;
    }
  }

  renderForm(container, client, clientId);
}
