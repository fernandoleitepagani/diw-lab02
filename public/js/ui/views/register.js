import { apiCreate } from '../../api.js';
import { createUser, findUserByEmail } from '../../data/users.js';
import { formatCpf, isValidCpf } from '../../domain/cpf.js';
import { MAX_EMPLOYERS, validateClient } from '../../domain/validation.js';
import { escapeHtml } from '../../format.js';
import { navigate } from '../../router.js';
import { setSession } from '../../session.js';
import { showToast } from '../components.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Generates an identifier before the records are written, so the user and the
 * client can reference each other without a follow-up update.
 * @param {'u'|'c'} prefix
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
  if (field === 'address') return 'Informe o endereço.';
  if (field === 'employers') return `Informe no máximo ${MAX_EMPLOYERS} vínculos.`;
  if (field.endsWith('.name')) return 'Informe o nome da empresa.';
  if (field.endsWith('.income')) return 'Informe uma renda válida (maior ou igual a zero).';
  return 'Dados inválidos.';
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {void}
 */
export function render(container, context = {}) {
  container.innerHTML = `
    <section class="row justify-content-center">
      <div class="col-12 col-lg-9 col-xl-8">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h1 class="h3 card-title mb-1">Criar conta</h1>
            <p class="text-body-secondary mb-4">
              Cadastre-se como cliente para solicitar aluguéis e contratar crédito.
            </p>

            <div class="alert alert-danger d-none" role="alert" data-error></div>

            <form id="register-form" novalidate>
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label" for="register-name">Nome completo</label>
                  <input class="form-control" id="register-name" name="name" type="text" autocomplete="name" required />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="register-email">E-mail</label>
                  <input class="form-control" id="register-email" name="email" type="email" autocomplete="email" required />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="register-rg">RG</label>
                  <input class="form-control" id="register-rg" name="rg" type="text" required />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="register-password">Senha</label>
                  <input
                    class="form-control"
                    id="register-password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    minlength="${MIN_PASSWORD_LENGTH}"
                    required
                  />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="register-confirm">Confirmar senha</label>
                  <input
                    class="form-control"
                    id="register-confirm"
                    name="confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    minlength="${MIN_PASSWORD_LENGTH}"
                    required
                  />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="register-cpf">CPF</label>
                  <input
                    class="form-control"
                    id="register-cpf"
                    name="cpf"
                    type="text"
                    inputmode="numeric"
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div class="col-12 col-md-6">
                  <label class="form-label" for="register-profession">Profissão</label>
                  <input class="form-control" id="register-profession" name="profession" type="text" required />
                </div>

                <div class="col-12">
                  <label class="form-label" for="register-address">Endereço</label>
                  <input class="form-control" id="register-address" name="address" type="text" required />
                </div>
              </div>

              <fieldset class="mt-4">
                <legend class="h6">Vínculos empregatícios</legend>
                <p class="text-body-secondary small">
                  Informe até ${MAX_EMPLOYERS} vínculos. A renda é usada na análise do pedido.
                </p>
                <div data-employers></div>
                <button type="button" class="btn btn-outline-secondary btn-sm" data-add-employer>
                  Adicionar vínculo
                </button>
              </fieldset>

              <div class="d-flex gap-2 mt-4">
                <button class="btn btn-primary" type="submit" data-submit>Criar conta</button>
                <a class="btn btn-outline-secondary" href="#/login">Já tenho conta</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#register-form');
  const errorBox = container.querySelector('[data-error]');
  const employerContainer = container.querySelector('[data-employers]');
  const addEmployerButton = container.querySelector('[data-add-employer]');
  const submitButton = container.querySelector('[data-submit]');
  if (!form || !errorBox || !employerContainer || !addEmployerButton || !submitButton) return;

  const nameInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-name'));
  const emailInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-email'));
  const rgInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-rg'));
  const passwordInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-password'));
  const confirmInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-confirm'));
  const cpfInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-cpf'));
  const professionInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-profession'));
  const addressInput = /** @type {HTMLInputElement} */ (container.querySelector('#register-address'));

  let employerSequence = 0;

  /**
   * @returns {HTMLDivElement}
   */
  function createEmployerRow() {
    employerSequence += 1;
    const fieldId = `register-employer-${employerSequence}`;
    const row = document.createElement('div');
    row.className = 'row g-2 align-items-end employer-row mb-2';
    row.innerHTML = `
      <div class="col-12 col-sm-6">
        <label class="form-label small" for="${fieldId}">Empresa</label>
        <input class="form-control" id="${fieldId}" data-employer-name type="text" />
      </div>
      <div class="col-8 col-sm-4">
        <label class="form-label small" for="${fieldId}-income">Renda mensal (R$)</label>
        <input
          class="form-control"
          id="${fieldId}-income"
          data-employer-income
          type="number"
          min="0"
          step="0.01"
        />
      </div>
      <div class="col-4 col-sm-2">
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

  employerContainer.append(createEmployerRow());
  updateEmployerControls();

  addEmployerButton.addEventListener('click', () => {
    const count = employerContainer.querySelectorAll('.employer-row').length;
    if (count >= MAX_EMPLOYERS) return;
    employerContainer.append(createEmployerRow());
    updateEmployerControls();
  });

  employerContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.closest('[data-remove-employer]')) return;

    const row = target.closest('.employer-row');
    row?.remove();
    updateEmployerControls();
  });

  cpfInput.addEventListener('blur', () => {
    cpfInput.value = formatCpf(cpfInput.value);
  });

  /**
   * @param {string[]} messages
   * @returns {void}
   */
  function showErrors(messages) {
    if (messages.length === 0) {
      errorBox.classList.add('d-none');
      errorBox.innerHTML = '';
      return;
    }

    const items = messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('');
    errorBox.innerHTML = `<p class="fw-semibold mb-1">Corrija os campos abaixo:</p><ul class="mb-0">${items}</ul>`;
    errorBox.classList.remove('d-none');
    errorBox.scrollIntoView({ block: 'nearest' });
  }

  /**
   * @param {boolean} busy
   * @returns {void}
   */
  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'Criando conta…' : 'Criar conta';
  }

  /**
   * @returns {Array<{ name: string, income: number|string }>}
   */
  function readEmployers() {
    return Array.from(employerContainer.querySelectorAll('.employer-row'))
      .map((row) => {
        const nameField = row.querySelector('[data-employer-name]');
        const incomeField = row.querySelector('[data-employer-income]');
        const name = nameField instanceof HTMLInputElement ? nameField.value.trim() : '';
        const incomeRaw = incomeField instanceof HTMLInputElement ? incomeField.value : '';
        return {
          name,
          income: incomeRaw === '' ? '' : Number(incomeRaw),
        };
      })
      .filter((employer) => employer.name !== '' || employer.income !== '');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showErrors([]);

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const rg = rgInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmInput.value;
    const cpf = formatCpf(cpfInput.value);
    const profession = professionInput.value.trim();
    const address = addressInput.value.trim();
    const employers = readEmployers();

    /** @type {Set<string>} */
    const errors = new Set();

    if (!name) errors.add('Informe o nome completo.');
    if (!email) {
      errors.add('Informe o e-mail.');
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.add('Informe um e-mail válido.');
    }
    if (!rg) errors.add('Informe o RG.');
    if (!profession) errors.add('Informe a profissão.');
    if (!address) errors.add('Informe o endereço.');
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.add(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    if (password !== confirmPassword) errors.add('As senhas não conferem.');
    if (!isValidCpf(cpf)) errors.add('CPF inválido.');

    const draft = { name, rg, cpf, address, profession, employers };
    const clientValidation = validateClient(draft);
    for (const issue of clientValidation.errors) {
      if (issue.field === 'cpf') continue;
      errors.add(messageForField(issue.field));
    }

    if (errors.size > 0) {
      showErrors([...errors]);
      return;
    }

    setBusy(true);
    try {
      const existing = await findUserByEmail(email);
      if (existing) {
        showErrors(['Este e-mail já está cadastrado.']);
        return;
      }

      const createdAt = new Date().toISOString();
      const userId = createId('u');
      const clientId = createId('c');

      const user = await createUser({
        id: userId,
        name,
        email,
        password,
        role: 'client',
        clientId,
        agentType: null,
        organization: null,
        createdAt,
      });

      await apiCreate('clients', {
        id: clientId,
        userId,
        name,
        rg,
        cpf,
        address,
        profession,
        employers,
        createdAt,
      });

      setSession(user);
      showToast('Cadastro realizado com sucesso!', 'success');
      navigate('/');
    } catch (error) {
      console.error(error);
      showErrors(['Não foi possível concluir o cadastro. Tente novamente.']);
    } finally {
      setBusy(false);
    }
  });
}
