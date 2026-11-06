import { getCar } from '../../data/cars.js';
import { getClient } from '../../data/clients.js';
import { ContractWorkflowError, executeContract } from '../../data/contracts.js';
import { listApprovedCreditContractsForClient } from '../../data/credit-contracts.js';
import { getRequest } from '../../data/requests.js';
import { canExecuteContract, isClient } from '../../domain/permissions.js';
import { validateContract } from '../../domain/validation.js';
import { escapeHtml, formatBRL } from '../../format.js';
import { navigate } from '../../router.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

const OWNERSHIP_OPTIONS = Object.freeze([
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'COMPANY', label: 'Locadora' },
  { value: 'BANK', label: 'Banco' },
]);

const WORKFLOW_MESSAGES = Object.freeze({
  CREDIT_CONTRACT_REQUIRED:
    'Para a propriedade Banco, selecione um contrato de crédito aprovado.',
  CREDIT_CONTRACT_OWNER: 'O contrato de crédito selecionado pertence a outro cliente.',
  CREDIT_CONTRACT_NOT_APPROVED: 'O contrato de crédito selecionado não está aprovado.',
  CREDIT_CONTRACT_INVALID: 'O contrato de crédito selecionado é inválido.',
  COMPANY_AGENT_NOT_FOUND:
    'Nenhum agente da locadora foi encontrado para registrar a propriedade.',
  INVALID_CONTRACT: 'Os dados do contrato são inválidos.',
  INVALID_OWNERSHIP: 'Selecione uma forma de propriedade válida.',
});

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
  backHref = '#/requests',
  backLabel = 'Voltar para pedidos',
) {
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Executar contrato</h1>
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
  if (name) return `${name}${car?.plate ? ` — ${String(car.plate)}` : ''}`;
  if (carId === undefined || carId === null || carId === '') {
    return 'Carro não informado';
  }
  return `Carro ${String(carId)} (não encontrado)`;
}

/**
 * @param {Record<string, unknown>} creditContract
 * @returns {string}
 */
function creditContractOption(creditContract) {
  return `<option value="${escapeHtml(creditContract.id)}">${escapeHtml(
    `Contrato #${String(creditContract.id)} — ${formatBRL(
      creditContract.amount,
    )} em ${String(creditContract.installments)} parcelas`,
  )}</option>`;
}

/**
 * @param {HTMLElement} container
 * @param {{ params?: Record<string, string>, query?: URLSearchParams, session?: object|null }} [context]
 * @returns {Promise<void>}
 */
export async function render(container, context = {}) {
  const session = context.session ?? getSession();

  if (!session || !isClient(session)) {
    renderBlocked(container, 'Apenas clientes podem executar contratos.');
    return;
  }

  const requestId = String(context.query?.get('request') ?? '').trim();
  if (!requestId) {
    renderBlocked(container, 'Selecione um pedido aprovado para executar o contrato.');
    return;
  }

  let request;
  try {
    request = await getRequest(requestId);
  } catch (error) {
    console.error(error);
    renderLoadFailure(container, Number(error?.status) || 0);
    return;
  }

  if (!canExecuteContract(session, request)) {
    renderBlocked(
      container,
      'Este pedido não está aprovado para contratação.',
      `#/requests/${encodeURIComponent(String(request.id))}`,
      'Voltar para o pedido',
    );
    return;
  }

  const [client, car, approvedCreditContracts] = await Promise.all([
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
    listApprovedCreditContractsForClient(request.clientId).catch((error) => {
      console.error(error);
      return [];
    }),
  ]);

  const credits = approvedCreditContracts.filter(
    (creditContract) =>
      String(creditContract.clientId) === String(request.clientId) &&
      creditContract.status === 'APPROVED',
  );
  const defaultOwnership = OWNERSHIP_OPTIONS.some(
    (option) => option.value === car?.ownerType,
  )
    ? String(car?.ownerType)
    : 'CLIENT';
  const missingReferenceWarning =
    !client || !car
      ? `<div class="alert alert-warning" role="alert">
           Alguns dados de referência não foram encontrados. O contrato será criado com os identificadores disponíveis.
         </div>`
      : '';

  container.innerHTML = `
    <section class="row justify-content-center">
      <div class="col-12 col-lg-9">
        <div class="card shadow-sm">
          <div class="card-body p-4">
            <h1 class="h3 card-title mb-1">Executar contrato</h1>
            <p class="text-body-secondary mb-4">
              Confirme os dados do pedido aprovado e escolha a propriedade do veículo.
            </p>
            ${missingReferenceWarning}

            <dl class="row mb-4">
              <dt class="col-sm-3 text-body-secondary">Cliente</dt>
              <dd class="col-sm-9">${escapeHtml(clientLabel(client, request.clientId))}</dd>

              <dt class="col-sm-3 text-body-secondary">Carro</dt>
              <dd class="col-sm-9">${escapeHtml(carLabel(car, request.carId))}</dd>

              <dt class="col-sm-3 text-body-secondary">Pedido</dt>
              <dd class="col-sm-9">#${escapeHtml(request.id)}</dd>
            </dl>

            <form id="contract-form" novalidate>
              <div class="row g-3">
                <div class="col-12 col-md-6">
                  <label class="form-label" for="contract-start">Data de retirada</label>
                  <input
                    class="form-control"
                    id="contract-start"
                    name="startDate"
                    type="date"
                    value="${escapeHtml(request.startDate)}"
                    readonly
                  />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="contract-end">Data de devolução</label>
                  <input
                    class="form-control"
                    id="contract-end"
                    name="endDate"
                    type="date"
                    value="${escapeHtml(request.endDate)}"
                    readonly
                  />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="contract-total">Total</label>
                  <input
                    class="form-control"
                    id="contract-total"
                    name="total"
                    type="text"
                    value="${escapeHtml(formatBRL(request.estimatedTotal))}"
                    readonly
                  />
                </div>

                <div class="col-12 col-md-6">
                  <label class="form-label" for="contract-ownership">Propriedade do veículo</label>
                  <select class="form-select" id="contract-ownership" name="ownershipType" required>
                    ${OWNERSHIP_OPTIONS.map(
                      (option) =>
                        `<option value="${escapeHtml(option.value)}"${
                          option.value === defaultOwnership ? ' selected' : ''
                        }>${escapeHtml(option.label)}</option>`,
                    ).join('')}
                  </select>
                  <div class="form-text">
                    Banco exige um contrato de crédito aprovado do cliente.
                  </div>
                  <div class="invalid-feedback" data-error-for="ownershipType"></div>
                </div>

                <div class="col-12">
                  <label class="form-label" for="contract-credit">Contrato de crédito (opcional)</label>
                  <select class="form-select" id="contract-credit" name="creditContractId">
                    <option value="">Nenhum contrato de crédito</option>
                    ${credits.map((creditContract) => creditContractOption(creditContract)).join('')}
                  </select>
                  <div class="form-text" data-credit-hint>
                    ${
                      credits.length > 0
                        ? 'Selecione um contrato aprovado para vincular ao aluguel.'
                        : 'Não há contratos de crédito aprovados para este cliente.'
                    }
                  </div>
                  <div class="invalid-feedback" data-error-for="creditContractId"></div>
                </div>
              </div>

              <div class="alert alert-danger d-none mt-3" role="alert" data-form-error></div>

              <div class="d-flex flex-wrap gap-2 mt-4">
                <button class="btn btn-primary" type="submit" data-submit>Executar contrato</button>
                <a
                  class="btn btn-outline-secondary"
                  href="#/requests/${encodeURIComponent(String(request.id))}"
                >Cancelar</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;

  const form = container.querySelector('#contract-form');
  const submitButton = container.querySelector('[data-submit]');
  const formError = container.querySelector('[data-form-error]');
  const creditHint = container.querySelector('[data-credit-hint]');
  if (!form || !submitButton) return;

  const ownershipInput = form.querySelector('[name="ownershipType"]');
  const creditInput = form.querySelector('[name="creditContractId"]');

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
  function clearFormError() {
    if (!formError) return;
    formError.textContent = '';
    formError.classList.add('d-none');
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
    clearFormError();
  }

  /**
   * @returns {void}
   */
  function updateCreditHint() {
    if (!creditHint) return;
    const bankSelected =
      ownershipInput instanceof HTMLSelectElement && ownershipInput.value === 'BANK';
    if (bankSelected && credits.length === 0) {
      creditHint.textContent =
        'Nenhum contrato de crédito aprovado disponível. A propriedade Banco não pode ser usada.';
      creditHint.classList.add('text-danger');
    } else if (bankSelected) {
      creditHint.textContent =
        'A propriedade Banco exige a seleção de um contrato de crédito aprovado.';
      creditHint.classList.remove('text-danger');
    } else {
      creditHint.textContent =
        credits.length > 0
          ? 'Selecione um contrato aprovado para vincular ao aluguel.'
          : 'Não há contratos de crédito aprovados para este cliente.';
      creditHint.classList.remove('text-danger');
    }
  }

  ownershipInput?.addEventListener('change', updateCreditHint);
  updateCreditHint();

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
    clearFormError();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors();

    const ownershipType =
      ownershipInput instanceof HTMLSelectElement ? ownershipInput.value : '';
    const creditContractId =
      creditInput instanceof HTMLSelectElement ? creditInput.value : '';
    const creditContract =
      credits.find((item) => String(item.id) === creditContractId) ?? null;

    if (ownershipType === 'BANK' && !creditContract) {
      const input = ownershipInput instanceof HTMLSelectElement ? ownershipInput : null;
      if (input) {
        input.classList.add('is-invalid');
        input.focus();
      }
      const box = form.querySelector('[data-error-for="ownershipType"]');
      if (box) {
        box.textContent =
          'Para a propriedade Banco, selecione um contrato de crédito aprovado.';
      }
      return;
    }

    if (creditContract && creditContract.status !== 'APPROVED') {
      showFormError('O contrato de crédito selecionado não está aprovado.');
      return;
    }

    /** @type {Record<string, unknown>} */
    const contractData = {
      rentalRequestId: request.id,
      clientId: request.clientId,
      carId: request.carId,
      startDate: request.startDate,
      endDate: request.endDate,
      total: Number(request.estimatedTotal ?? 0),
      ownershipType,
      status: 'ACTIVE',
    };
    if (creditContract) contractData.creditContractId = creditContract.id;

    const validation = validateContract(contractData);
    if (!validation.ok) {
      showFormError(
        validation.errors[0]?.message ?? 'Os dados do contrato são inválidos.',
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Executando…';

    try {
      const created = await executeContract({
        request,
        ownershipType,
        creditContract,
      });
      showToast('Contrato executado com sucesso.', 'success');
      navigate(`/contracts/${encodeURIComponent(String(created.id))}`);
    } catch (error) {
      console.error(error);
      if (error instanceof ContractWorkflowError) {
        showFormError(
          WORKFLOW_MESSAGES[error.code] ??
            'Não foi possível executar o contrato. Tente novamente.',
        );
      } else {
        showFormError('Não foi possível executar o contrato. Tente novamente.');
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Executar contrato';
    }
  });
}
