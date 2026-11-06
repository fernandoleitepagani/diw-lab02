import { findClientForUser, totalIncome, updateClient } from '../../data/clients.js';
import { formatCpf, isValidCpf } from '../../domain/cpf.js';
import { MAX_EMPLOYERS, validateClient } from '../../domain/validation.js';
import { escapeHtml, formatBRL } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession, setSession } from '../../session.js';
import { showToast } from '../components.js';

/**
 * @param {string} field
 * @returns {string}
 */
function messageForField(field) {
  if (field === 'name') return 'Informe o nome completo.';
  if (field === 'rg') return 'Informe o RG.';
  if (field === 'address') return 'Informe o endereço.';
  if (field === 'profession') return 'Informe a profissão.';
  if (field === 'employers') return `Informe no máximo ${MAX_EMPLOYERS} vínculos.`;
  if (field.endsWith('.name')) return 'Informe o nome da empresa.';
  if (field.endsWith('.income')) return 'Informe uma renda válida (maior ou igual a zero).';
  if (field === 'cpf') return 'CPF inválido.';
  return 'Dados inválidos.';
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
        Carregando perfil…
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
        <h1 class="h3 card-title">Meu perfil</h1>
        <div class="alert alert-danger" role="alert">${escapeHtml(message)}</div>
        <button type="button" class="btn btn-primary" data-retry>Tentar novamente</button>
      </div>
    </section>
  `;
  container.querySelector('[data-retry]')?.addEventListener('click', onRetry);
}

/**
 * @param {HTMLElement|null} container
 * @returns {void}
 */
function renderMissingProfile(container) {
  if (!container) return;
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Perfil não encontrado</h1>
        <p class="text-body-secondary mb-3">
          Não localizamos o cadastro de cliente vinculado à sua conta. Entre em contato com a locadora.
        </p>
        <a class="btn btn-primary" href="#/">Voltar ao painel</a>
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {import('../../data/clients.js').ClientRecord} client
 * @param {{ name?: string, email?: string }} session
 * @returns {void}
 */
function renderProfile(container, client, session) {
  const currentName = String(client.name ?? '');
  const currentEmail = String(session.email ?? '');

  container.innerHTML = `
    <section class="mb-3">
      <h1 class="h3 mb-1">Meu perfil</h1>
      <p class="text-body-secondary mb-0">
        Mantenha seus dados cadastrais e vínculos empregatícios atualizados.
      </p>
    </section>

    <div class="row g-3">
      <div class="col-12 col-lg-4">
        <section class="card shadow-sm h-100">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-body-secondary mb-3">Resumo</h2>
            <dl class="row small mb-0">
              <dt class="col-5">Nome</dt>
              <dd class="col-7" data-summary-name>${escapeHtml(currentName || '—')}</dd>

              <dt class="col-5">CPF</dt>
              <dd class="col-7">${escapeHtml(client.cpf ? formatCpf(client.cpf) : '—')}</dd>

              <dt class="col-5">E-mail</dt>
              <dd class="col-7 text-break">${escapeHtml(currentEmail || '—')}</dd>

              <dt class="col-5">Renda total</dt>
              <dd class="col-7" data-summary-income>${escapeHtml(formatBRL(totalIncome(client)))}</dd>
            </dl>
          </div>
        </section>
      </div>

      <div class="col-12 col-lg-8">
        <section class="card shadow-sm">
          <div class="card-body">
            <h2 class="h6 text-uppercase text-body-secondary mb-3">Dados cadastrais</h2>

            <div class="alert alert-danger d-none" role="alert" data-form-error></div>

            <form id="profile-form" novalidate>
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label" for="profile-name">Nome completo</label>
                  <input
                    class="form-control"
                    id="profile-name"
                    name="name"
                    type="text"
                    autocomplete="name"
                    data-field="name"
                    value="${escapeHtml(currentName)}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="name"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="profile-cpf">CPF</label>
                  <input
                    class="form-control"
                    id="profile-cpf"
                    type="text"
                    value="${escapeHtml(client.cpf ? formatCpf(client.cpf) : '')}"
                    disabled
                  />
                  <div class="form-text">O CPF não pode ser alterado pelo perfil.</div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="profile-rg">RG</label>
                  <input
                    class="form-control"
                    id="profile-rg"
                    name="rg"
                    type="text"
                    autocomplete="off"
                    data-field="rg"
                    value="${escapeHtml(client.rg ?? '')}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="rg"></div>
                </div>

                <div class="col-12">
                  <label class="form-label" for="profile-address">Endereço</label>
                  <input
                    class="form-control"
                    id="profile-address"
                    name="address"
                    type="text"
                    autocomplete="street-address"
                    data-field="address"
                    value="${escapeHtml(client.address ?? '')}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="address"></div>
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="profile-profession">Profissão</label>
                  <input
                    class="form-control"
                    id="profile-profession"
                    name="profession"
                    type="text"
                    autocomplete="organization-title"
                    data-field="profession"
                    value="${escapeHtml(client.profession ?? '')}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="profession"></div>
                </div>
              </div>

              <fieldset class="mt-4">
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

              <div class="d-flex flex-wrap gap-2 mt-4">
                <button class="btn btn-primary" type="submit" data-submit>Salvar alterações</button>
                <a class="btn btn-outline-secondary" href="#/">Voltar ao painel</a>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  `;

  const form = container.querySelector('#profile-form');
  const errorBox = container.querySelector('[data-form-error]');
  const employerContainer = container.querySelector('[data-employers]');
  const addEmployerButton = container.querySelector('[data-add-employer]');
  const submitButton = container.querySelector('[data-submit]');
  const nameInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#profile-name'));
  const rgInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#profile-rg'));
  const addressInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#profile-address'));
  const professionInput = /** @type {HTMLInputElement|null} */ (
    container.querySelector('#profile-profession')
  );
  const summaryName = container.querySelector('[data-summary-name]');
  const summaryIncome = container.querySelector('[data-summary-income]');

  if (
    !(form instanceof HTMLFormElement) ||
    !errorBox ||
    !(employerContainer instanceof HTMLElement) ||
    !(addEmployerButton instanceof HTMLButtonElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !nameInput ||
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
    const fieldId = `profile-employer-${employerSequence}`;
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
    Array.isArray(client.employers) && client.employers.length > 0 ? client.employers : [{}];
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
    submitButton.textContent = busy ? 'Salvando…' : 'Salvar alterações';
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

    if (!isValidCpf(client.cpf)) {
      showFormError('O CPF cadastrado é inválido. Entre em contato com a locadora.');
      return;
    }

    const name = nameInput.value.trim();
    const rg = rgInput.value.trim();
    const address = addressInput.value.trim();
    const profession = professionInput.value.trim();
    const employers = readEmployers();

    /** @type {Record<string, string>} */
    const errors = {};
    if (!name) errors.name = messageForField('name');
    if (!rg) errors.rg = messageForField('rg');
    if (!address) errors.address = messageForField('address');
    if (!profession) errors.profession = messageForField('profession');

    const result = validateClient({
      ...client,
      name,
      rg,
      address,
      profession,
      employers,
    });
    for (const issue of result.errors) {
      if (!errors[issue.field]) errors[issue.field] = messageForField(issue.field);
    }

    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const updated = await updateClient(client.id, {
        ...client,
        name,
        rg,
        address,
        profession,
        employers,
      });

      client.name = updated.name;
      client.employers = updated.employers;
      setSession({ ...session, name: updated.name });

      if (summaryName) summaryName.textContent = updated.name || '—';
      if (summaryIncome) summaryIncome.textContent = formatBRL(totalIncome(updated));

      showToast('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      console.error(error);
      showFormError('Não foi possível salvar o perfil. Tente novamente.');
    } finally {
      if (submitButton.isConnected) setBusy(false);
    }
  });
}

/**
 * Client self-service profile editor.
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();
  if (!session || session.role !== 'client') {
    navigate('/');
    return;
  }

  const retry = () => void render(container, context);
  renderLoading(container);

  /** @type {import('../../data/clients.js').ClientRecord|null} */
  let client = null;
  try {
    client = await findClientForUser(session.clientId, session.id);
  } catch (error) {
    console.error(error);
    renderLoadError(container, 'Não foi possível carregar o perfil.', retry);
    return;
  }

  if (!client) {
    renderMissingProfile(container);
    return;
  }

  renderProfile(container, client, session);
}
