import {
  ClientInUseError,
  deleteClient,
  getClientReferences,
  hasClientReferences,
  listClients,
  totalIncome,
} from '../../data/clients.js';
import { listUsers } from '../../data/users.js';
import { formatCpf, stripCpf } from '../../domain/cpf.js';
import { canManageClients } from '../../domain/permissions.js';
import { escapeHtml, formatBRL, statusLabel } from '../../format.js';
import { getSession } from '../../session.js';
import { showToast } from '../components.js';

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
        Carregando clientes…
      </div>
    </section>
  `;
}

/**
 * @param {HTMLElement|null} container
 * @param {() => void} onRetry
 * @returns {void}
 */
function renderLoadError(container, onRetry) {
  if (!container) return;
  container.innerHTML = `
    <section class="card shadow-sm">
      <div class="card-body p-4">
        <h1 class="h3 card-title">Clientes</h1>
        <div class="alert alert-danger" role="alert">
          Não foi possível carregar os clientes. Verifique a conexão e tente novamente.
        </div>
        <button type="button" class="btn btn-primary" data-retry>Tentar novamente</button>
      </div>
    </section>
  `;
  container.querySelector('[data-retry]')?.addEventListener('click', onRetry);
}

/**
 * @param {Array<{ type: string, id: unknown, status: unknown }>} records
 * @returns {string}
 */
function describeReferences(records) {
  return records
    .map(
      (record) => `<li>${escapeHtml(record.type)} ${escapeHtml(record.id)} — ${escapeHtml(
        statusLabel(typeof record.status === 'string' ? record.status : ''),
      )}</li>`,
    )
    .join('');
}

/**
 * Agent-only client management screen.
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

  const retry = () => void render(container, context);
  renderLoading(container);

  /** @type {import('../../data/clients.js').ClientRecord[]} */
  let clients = [];
  /** @type {import('../../data/users.js').UserRecord[]} */
  let users = [];

  try {
    [clients, users] = await Promise.all([listClients(), listUsers()]);
  } catch (error) {
    console.error(error);
    renderLoadError(container, retry);
    return;
  }

  const usersById = new Map(users.map((user) => [String(user.id), user]));
  const initialQuery = String(context.query?.get('q') ?? '');

  container.innerHTML = `
    <section class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
      <div>
        <h1 class="h3 mb-1">Clientes</h1>
        <p class="text-body-secondary mb-0">Gerencie os clientes que alugam carros pela locadora.</p>
      </div>
      <a class="btn btn-primary" href="#/clients/new">Novo cliente</a>
    </section>

    <div class="alert alert-danger d-none" role="alert" data-delete-error></div>

    <section class="card shadow-sm">
      <div class="card-body">
        <div class="row g-2 align-items-center mb-3">
          <div class="col-12 col-md-7">
            <label class="form-label visually-hidden" for="client-search">Buscar clientes</label>
            <input
              class="form-control"
              id="client-search"
              type="search"
              placeholder="Buscar por nome, CPF ou e-mail"
              autocomplete="off"
              value="${escapeHtml(initialQuery)}"
            />
          </div>
          <div class="col-12 col-md-5 text-md-end">
            <span class="text-body-secondary small" data-client-count aria-live="polite"></span>
          </div>
        </div>

        <div class="table-responsive" data-table>
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">CPF</th>
                <th scope="col">Profissão</th>
                <th scope="col">E-mail</th>
                <th scope="col" class="text-end">Renda total</th>
                <th scope="col" class="text-end">Ações</th>
              </tr>
            </thead>
            <tbody data-client-rows></tbody>
          </table>
        </div>

        <div class="text-center text-body-secondary py-4 d-none" data-empty></div>
      </div>
    </section>
  `;

  const searchInput = /** @type {HTMLInputElement|null} */ (container.querySelector('#client-search'));
  const rowsBody = container.querySelector('[data-client-rows]');
  const tableWrapper = container.querySelector('[data-table]');
  const emptyBox = container.querySelector('[data-empty]');
  const countLabel = container.querySelector('[data-client-count]');
  const errorBox = container.querySelector('[data-delete-error]');
  if (!searchInput || !rowsBody || !tableWrapper || !emptyBox || !countLabel || !errorBox) return;

  /**
   * @param {import('../../data/clients.js').ClientRecord} client
   * @returns {string}
   */
  function rowFor(client) {
    const id = encodeURIComponent(String(client.id));
    const email = usersById.get(String(client.userId))?.email ?? '';
    const name = client.name ?? '';
    return `
      <tr>
        <td>${escapeHtml(name || '—')}</td>
        <td>${escapeHtml(client.cpf ? formatCpf(client.cpf) : '—')}</td>
        <td>${escapeHtml(client.profession || '—')}</td>
        <td>${escapeHtml(email || '—')}</td>
        <td class="text-end">${escapeHtml(formatBRL(totalIncome(client)))}</td>
        <td class="text-end text-nowrap">
          <a class="btn btn-outline-primary btn-sm" href="#/clients/${escapeHtml(id)}/edit">
            Editar
          </a>
          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            data-delete-client="${escapeHtml(String(client.id))}"
            data-client-name="${escapeHtml(name)}"
          >
            Excluir
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * @param {import('../../data/clients.js').ClientRecord} client
   * @param {{ email?: string }|undefined} user
   * @param {string} loweredTerm
   * @param {string} cpfDigits
   * @returns {boolean}
   */
  function matches(client, user, loweredTerm, cpfDigits) {
    if (!loweredTerm && !cpfDigits) return true;
    if (String(client.name ?? '').toLowerCase().includes(loweredTerm)) return true;
    if (String(user?.email ?? '').toLowerCase().includes(loweredTerm)) return true;
    if (cpfDigits && stripCpf(client.cpf).includes(cpfDigits)) return true;
    return false;
  }

  function updateRows() {
    const rawTerm = searchInput?.value ?? '';
    const loweredTerm = rawTerm.trim().toLowerCase();
    const cpfDigits = rawTerm.replace(/\D/g, '');

    const filtered = clients.filter((client) =>
      matches(client, usersById.get(String(client.userId)), loweredTerm, cpfDigits),
    );

    rowsBody.innerHTML = filtered.map(rowFor).join('');
    const isEmpty = filtered.length === 0;
    tableWrapper?.classList.toggle('d-none', isEmpty);
    emptyBox?.classList.toggle('d-none', !isEmpty);
    if (emptyBox) {
      emptyBox.textContent =
        clients.length === 0
          ? 'Nenhum cliente cadastrado. Use “Novo cliente” para começar.'
          : 'Nenhum cliente encontrado para a busca.';
    }

    if (countLabel) {
      if (clients.length === 0) {
        countLabel.textContent = '';
      } else {
        const noun = filtered.length === 1 ? 'cliente' : 'clientes';
        countLabel.textContent = `${filtered.length} de ${clients.length} ${noun}`;
      }
    }
  }

  /**
   * @param {string} clientName
   * @param {import('../../data/clients.js').ClientReferences} references
   * @returns {void}
   */
  function showDeleteBlocked(clientName, references) {
    /** @type {Array<{ type: string, id: unknown, status: unknown }>} */
    const records = [
      ...references.rentalRequests.map((record) => ({
        type: 'Pedido de aluguel',
        id: record.id,
        status: record.status,
      })),
      ...references.contracts.map((record) => ({
        type: 'Contrato de aluguel',
        id: record.id,
        status: record.status,
      })),
      ...references.creditContracts.map((record) => ({
        type: 'Contrato de crédito',
        id: record.id,
        status: record.status,
      })),
    ];

    errorBox.innerHTML = `
      <p class="fw-semibold mb-1">Não é possível excluir o cliente ${escapeHtml(clientName)}.</p>
      <p class="mb-1">Existem registros vinculados a este cliente:</p>
      <ul class="mb-0">${describeReferences(records)}</ul>
    `;
    errorBox.classList.remove('d-none');
    errorBox.scrollIntoView({ block: 'nearest' });
    showToast('Exclusão bloqueada: o cliente possui registros vinculados.', 'danger');
  }

  function clearDeleteError() {
    errorBox.classList.add('d-none');
    errorBox.innerHTML = '';
  }

  searchInput.addEventListener('input', updateRows);

  rowsBody.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest('[data-delete-client]');
    if (!(button instanceof HTMLButtonElement)) return;

    const clientId = button.dataset.deleteClient ?? '';
    const client = clients.find((item) => String(item.id) === clientId);
    const clientName = client?.name ?? button.dataset.clientName ?? clientId;

    const confirmed = window.confirm(
      `Excluir o cliente “${clientName}”? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    clearDeleteError();
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Excluindo…';

    try {
      const references = await getClientReferences(clientId);
      if (hasClientReferences(references)) {
        showDeleteBlocked(clientName, references);
        return;
      }

      await deleteClient(clientId);
      clients = clients.filter((item) => String(item.id) !== clientId);
      updateRows();
      showToast('Cliente excluído com sucesso.', 'success');
    } catch (error) {
      if (error instanceof ClientInUseError) {
        showDeleteBlocked(clientName, error.references);
      } else {
        console.error(error);
        showToast('Não foi possível excluir o cliente. Tente novamente.', 'danger');
      }
    } finally {
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  });

  updateRows();
}
