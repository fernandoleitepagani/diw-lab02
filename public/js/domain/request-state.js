/**
 * Rental request state machine. Pure and role-aware; ownership checks belong
 * to `permissions.js`, while this module enforces which role may move a
 * request between states.
 */

export const REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CONTRACTED: 'CONTRACTED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

const TERMINAL_STATUSES = Object.freeze([
  REQUEST_STATUS.REJECTED,
  REQUEST_STATUS.COMPLETED,
  REQUEST_STATUS.CANCELLED,
]);

/**
 * The only transitions the domain accepts, and the roles allowed to perform
 * each one. `client` means the owning client.
 * @type {Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>}
 */
const TRANSITIONS = Object.freeze({
  [REQUEST_STATUS.PENDING]: Object.freeze({
    [REQUEST_STATUS.UNDER_REVIEW]: Object.freeze(['agent']),
    [REQUEST_STATUS.CANCELLED]: Object.freeze(['client']),
  }),
  [REQUEST_STATUS.UNDER_REVIEW]: Object.freeze({
    [REQUEST_STATUS.APPROVED]: Object.freeze(['agent']),
    [REQUEST_STATUS.REJECTED]: Object.freeze(['agent']),
    [REQUEST_STATUS.CANCELLED]: Object.freeze(['client']),
  }),
  [REQUEST_STATUS.APPROVED]: Object.freeze({
    [REQUEST_STATUS.CONTRACTED]: Object.freeze(['client']),
    [REQUEST_STATUS.CANCELLED]: Object.freeze(['client']),
  }),
  [REQUEST_STATUS.CONTRACTED]: Object.freeze({
    [REQUEST_STATUS.ACTIVE]: Object.freeze(['agent']),
    [REQUEST_STATUS.CANCELLED]: Object.freeze(['agent']),
  }),
  [REQUEST_STATUS.ACTIVE]: Object.freeze({
    [REQUEST_STATUS.COMPLETED]: Object.freeze(['agent']),
    [REQUEST_STATUS.CANCELLED]: Object.freeze(['agent']),
  }),
  [REQUEST_STATUS.REJECTED]: Object.freeze({}),
  [REQUEST_STATUS.COMPLETED]: Object.freeze({}),
  [REQUEST_STATUS.CANCELLED]: Object.freeze({}),
});

export class DomainError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * @param {string} from
 * @param {string} to
 * @param {string} role
 * @returns {boolean}
 */
export function canTransition(from, to, role) {
  const allowedRoles = TRANSITIONS[from]?.[to];
  return Array.isArray(allowedRoles) && allowedRoles.includes(role);
}

/**
 * @param {string} from
 * @param {string} to
 * @param {string} role
 * @returns {void}
 * @throws {DomainError} When the transition is not allowed for the role.
 */
export function assertTransition(from, to, role) {
  if (!canTransition(from, to, role)) {
    throw new DomainError(`Transition from ${from} to ${to} is not allowed for role ${role}.`);
  }
}

/**
 * @param {string} from
 * @param {string} role
 * @returns {string[]}
 */
export function allowedTransitions(from, role) {
  const targets = TRANSITIONS[from] ?? {};
  return Object.keys(targets).filter((to) => targets[to].includes(role));
}

/**
 * @param {string} status
 * @returns {boolean}
 */
export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}
