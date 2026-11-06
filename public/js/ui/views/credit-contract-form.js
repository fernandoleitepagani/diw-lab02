import { listClients } from '../../data/clients.js';
import {
  createCreditContract,
  getCreditContract,
  updateCreditContract,
} from '../../data/credit-contracts.js';
import { listUsers } from '../../data/users.js';
import { canManageCreditContracts } from '../../domain/permissions.js';
import { validateCreditContract } from '../../domain/validation.js';
import { escapeHtml } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

const STATUS_OPTIONS = Object.freeze([
  { value: 'PENDING', label: 'Pendente' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Rejeitado' },
]);

const FIELD_MESSAGES = Object.freeze({
  bankId: 'Não foi possível identificar o banco responsável.',
  clientId: 'Selecione o cliente do contrato de crédito.',
  amount: 'O valor deve ser maior que zero.',
  installments: 'Informe um número de parcelas entre 1 e 60.',
  interestRate: 'A taxa de juros deve ser maior ou igual a zero.',
  status: 'Selecione um status válido.',
});

/**
 * @param {HTMLElement} container
 * @param {string} message
 * @returns {void}
 */
function renderBlocked(container, message) {
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Contrato de crédito</h1>
        <div class="alert alert-warning" role="alert">${escapeHtml(message)}</div>
        <a class="btn btn-outline-secondary" href="#/credit-contracts">Voltar para créditos</a>
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
          ? 'Contrato de crédito não encontrado.'
          : 'Não foi possível carregar o contrato de crédito. Tente novamente.'
      }
    </div>
    <a class="btn btn-outline-secondary" href="#/credit-contracts">Voltar para créditos</a>
  `;
}

/**
 * @param {Record<string, unknown>} client
 * @param {string} selectedId
 * @returns {string}
 */
function clientOption(client, selectedId) {
  const cpf = client.cpf ? ` — CPF ${String(client.cpf)}` : '';
  return `<option value="${escapeHtml(client.id)}"${
    String(client.id) === selectedId ? ' selected' : ''
  }>${escapeHtml(`${String(client.name ?? '')}${cpf}`)}</option>`;
}

/**
 * @param {string} value
 * @param {string} selected
 * @returns {string}
 */
function statusOption(value, selected) {
  const option = STATUS_OPTIONS.find((item) => item.value === value);
  return `<option value="${escapeHtml(value)}"${
    value === selected ? ' selected' : ''
  }>${escapeHtml(option?.label ?? value)}</option>`;
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session || !canManageCreditContracts(session)) {
    renderBlocked(container, 'Acesso restrito aos agentes do banco.');
    return;
  }

  const creditContractId = context.params?.id ?? null;
  const isEdit = creditContractId !== null;

  let creditContract = null;
  if (isEdit) {
    try {
      creditContract = await getCreditContract(creditContractId);
    } catch (error) {
      console.error(error);
      renderLoadFailure(container, Number(error?.status) || 0);
      return;
    }
  }

  const [clients, users] = await Promise.all([
    listClients().catch((error) => {
      console.error(error);
      return [];
    }),
    listUsers().catch((error) => {
      console.error(error);
      return [];
    }),
  ]);

  if (!isEdit && clients.length === 0) {
    container.innerHTML = `
      <section class="card shadow-sm">
        <div class="card-body p-4">
          <h1 class="h3 card-title">Novo contrato de crédito</h1>
          <div class="alert alert-info mb-3" role="status">
            Nenhum cliente cadastrado. Cadastre um cliente antes de criar um contrato de crédito.
          </div>
          <a class="btn btn-outline-secondary" href="#/credit-contracts">Voltar para créditos</a>
        </div>
      </section>
    `;
    return;
  }

  const clientId = isEdit ? String(creditContract?.clientId ?? '') : '';
  const clientExists = clients.some((client) => String(client.id) === clientId);
  const values = {
    clientId,
    amount:
      creditContract?.amount === undefined || creditContract?.amount === null
        ? ''
        : String(creditContract.amount),
    installments:
      creditContract?.installments === undefined || creditContract?.installments === null
        ? '12'
        : String(creditContract.installments),
    interestRate:
      creditContract?.interestRate === undefined || creditContract?.interestRate === null
        ? '0'
        : String(creditContract.interestRate),
    status: String(creditContract?.status ?? 'PENDING'),
  };

  const bankId = isEdit ? creditContract?.bankId : session.id;
  const bank = users.find((user) => String(user.id) === String(bankId)) ?? null;
  const bankDescription = bank
    ? String(bank.name)
    : bankId === undefined || bankId === null || bankId === ''
      ? 'Banco não informado'
      : `Banco ${String(bankId)} (não encontrado)`;

  const heading = isEdit ? 'Revisar contrato de crédito' : 'Novo contrato de crédito';
  const description = isEdit
    ? 'Atualize os dados e aprove ou rejeite a solicitação de crédito.'
    : 'Crie uma solicitação de crédito para um cliente. O contrato inicia como pendente.';

  const missingClientOption = isEdit && !clientExists
    ? `<option value="${escapeHtml(clientId)}" selected>Cliente ${escapeHtml(
        clientId || 'não informado',
      )} (não encontrado)</option>`
    : '';

  container.innerHTML = `
    <section class="row justify-content-center">
      <div class="col-12 col-lg-8">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h1 class="h3 card-title mb-1">${escapeHtml(heading)}</h1>
            <p class="text-body-secondary mb-4">${escapeHtml(description)}</p>

            <dl class="row mb-4">
              <dt class="col-sm-3 text-body-secondary">Banco</dt>
              <dd class="col-sm-9">${escapeHtml(bankDescription)}</dd>
            </dl>

            <form id="credit-contract-form" novalidate>
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label" for="credit-client">Cliente</label>
                  <select class="form-select" id="credit-client" name="clientId" required>
                    <option value="">Selecione um cliente</option>
                    ${missingClientOption}
                    ${clients
                      .map((client) => clientOption(client, values.clientId))
                      .join('')}
                  </select>
                  <div class="invalid-feedback" data-error-for="clientId"></div>
                </div>

                <div class="col-12 col-md-4">
                  <label class="form-label" for="credit-amount">Valor (R$)</label>
                  <input
                    class="form-control"
                    id="credit-amount"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value="${escapeHtml(values.amount)}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="amount"></div>
                </div>

                <div class="col-12 col-md-4">
                  <label class="form-label" for="credit-installments">Parcelas</label>
                  <input
                    class="form-control"
                    id="credit-installments"
                    name="installments"
                    type="number"
                    min="1"
                    max="60"
                    step="1"
                    value="${escapeHtml(values.installments)}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="installments"></div>
                </div>

                <div class="col-12 col-md-4">
                  <label class="form-label" for="credit-rate">Juros (% ao mês)</label>
                  <input
                    class="form-control"
                    id="credit-rate"
                    name="interestRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${escapeHtml(values.interestRate)}"
                    required
                  />
                  <div class="invalid-feedback" data-error-for="interestRate"></div>
                </div>

                ${
                  isEdit
                    ? `<div class="col-12">
                         <label class="form-label" for="credit-status">Status</label>
                         <select class="form-select" id="credit-status" name="status" required>
                           ${STATUS_OPTIONS.map((option) =>
                             statusOption(option.value, values.status),
                           ).join('')}
                         </select>
                         <div class="form-text">
                           Aprovar ou rejeitar é uma alteração de status do contrato.
                         </div>
                         <div class="invalid-feedback" data-error-for="status"></div>
                       </div>`
                    : `<div class="col-12">
                         <div class="alert alert-info mb-0" role="status">
                           O contrato será criado como <strong>Pendente</strong> e poderá ser aprovado depois.
                         </div>
                       </div>`
                }
              </div>

              <div class="alert alert-danger d-none mt-3" role="alert" data-form-error></div>

              <div class="d-flex flex-wrap gap-2 mt-4">
                <button class="btn btn-primary" type="submit" data-submit>${
                  isEdit ? 'Salvar contrato' : 'Criar contrato'
                }</button>
                <a class="btn btn-outline-secondary" href="#/credit-contracts">Cancelar</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#credit-contract-form');
  const submitButton = container.querySelector('[data-submit]');
  const formError = container.querySelector('[data-form-error]');
  if (!form || !submitButton) return;

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
    let firstInvalid = null;
    for (const error of errors) {
      const input = form.querySelector(`[name="${error.field}"]`);
      const box = form.querySelector(`[data-error-for="${error.field}"]`);
      if (input) {
        input.classList.add('is-invalid');
        if (!firstInvalid) firstInvalid = input;
      }
      if (box) {
        box.textContent = FIELD_MESSAGES[error.field] ?? error.message ?? 'Valor inválido.';
      }
    }
    if (firstInvalid) firstInvalid.focus();
  }

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const data = {
      bankId: isEdit ? String(creditContract?.bankId ?? '') : String(session.id ?? ''),
      clientId: String(form.elements.clientId.value ?? ''),
      amount: Number(form.elements.amount.value),
      installments: Number(form.elements.installments.value),
      interestRate: Number(form.elements.interestRate.value),
      status: isEdit
        ? String(form.elements.status?.value ?? 'PENDING')
        : 'PENDING',
    };

    const validation = validateCreditContract(data);
    if (!validation.ok) {
      showErrors(validation.errors);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Salvando…';

    try {
      if (isEdit && creditContract) {
        const updated = await updateCreditContract(creditContractId, {
          ...creditContract,
          ...data,
        });
        if (updated.status === 'APPROVED') {
          showToast('Contrato de crédito aprovado com sucesso.', 'success');
        } else if (updated.status === 'REJECTED') {
          showToast('Contrato de crédito rejeitado.', 'success');
        } else {
          showToast('Contrato de crédito atualizado com sucesso.', 'success');
        }
      } else {
        await createCreditContract(data);
        showToast('Contrato de crédito criado como pendente.', 'success');
      }
      navigate('/credit-contracts');
    } catch (error) {
      console.error(error);
      showFormError('Não foi possível salvar o contrato de crédito. Tente novamente.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = isEdit ? 'Salvar contrato' : 'Criar contrato';
    }
  });
}
