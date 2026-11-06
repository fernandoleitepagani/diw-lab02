/**
 * Formatting helpers shared by the UI. Portuguese labels live here, never in
 * the domain modules.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Escapes a value for safe interpolation into HTML.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Formats an ISO date (or date-time) as DD/MM/YYYY.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return '—';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '—' : value.toLocaleDateString('pt-BR');
  }
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
}

/**
 * Formats an ISO timestamp as DD/MM/YYYY HH:MM.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a number as Brazilian currency.
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatBRL(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number);
}

const REQUEST_STATUS_LABELS = Object.freeze({
  PENDING: 'Pendente',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  CONTRACTED: 'Contratado',
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
});

const ROLE_LABELS = Object.freeze({
  client: 'Cliente',
  agent: 'Agente',
});

const AGENT_TYPE_LABELS = Object.freeze({
  COMPANY: 'Locadora',
  BANK: 'Banco',
  CLIENT: 'Cliente',
});

const CAR_STATUS_LABELS = Object.freeze({
  AVAILABLE: 'Disponível',
  RENTED: 'Alugado',
  MAINTENANCE: 'Manutenção',
});

/**
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function statusLabel(status) {
  if (!status) return '—';
  return REQUEST_STATUS_LABELS[status] ?? String(status);
}

/**
 * @param {string|null|undefined} role
 * @returns {string}
 */
export function roleLabel(role) {
  if (!role) return '—';
  return ROLE_LABELS[role] ?? String(role);
}

/**
 * @param {string|null|undefined} agentType
 * @returns {string}
 */
export function agentTypeLabel(agentType) {
  if (!agentType) return '—';
  return AGENT_TYPE_LABELS[agentType] ?? String(agentType);
}

/**
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function carStatusLabel(status) {
  if (!status) return '—';
  return CAR_STATUS_LABELS[status] ?? String(status);
}
