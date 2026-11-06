/**
 * Role and ownership rules. Pure functions: they never read the session or
 * the network, and they never mutate their arguments.
 */

import { REQUEST_STATUS } from './request-state.js';

/**
 * @typedef {Object} SessionUser
 * @property {string} [id]
 * @property {string} [role]
 * @property {string|null} [agentType]
 * @property {string|null} [clientId]
 */

/**
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function isClient(user) {
  return user?.role === 'client';
}

/**
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function isAgent(user) {
  return user?.role === 'agent';
}

/**
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function isCompanyAgent(user) {
  return isAgent(user) && user?.agentType === 'COMPANY';
}

/**
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function isBankAgent(user) {
  return isAgent(user) && user?.agentType === 'BANK';
}

/**
 * Both company and bank agents may maintain client records.
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function canManageClients(user) {
  return isAgent(user);
}

/**
 * Only company agents own the fleet and may create or edit cars.
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function canManageCars(user) {
  return isCompanyAgent(user);
}

/**
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function canReviewRequests(user) {
  return isAgent(user);
}

/**
 * Only bank agents may create, approve, or reject credit contracts.
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function canManageCreditContracts(user) {
  return isBankAgent(user);
}

/**
 * Agents see every credit contract; clients may see their own (the view is
 * responsible for filtering).
 * @param {SessionUser|null|undefined} user
 * @returns {boolean}
 */
export function canViewCreditContracts(user) {
  return isClient(user) || isAgent(user);
}

/**
 * @param {SessionUser|null|undefined} user
 * @param {string|null|undefined} clientId
 * @returns {boolean}
 */
export function ownsClient(user, clientId) {
  if (!isClient(user) || clientId === undefined || clientId === null) return false;
  return String(user.clientId) === String(clientId);
}

/**
 * Clients may edit a request only while it is still pending review.
 * @param {SessionUser|null|undefined} user
 * @param {{ clientId?: string, status?: string }|null|undefined} request
 * @returns {boolean}
 */
export function canEditRequest(user, request) {
  return (
    isClient(user) &&
    ownsClient(user, request?.clientId) &&
    request?.status === REQUEST_STATUS.PENDING
  );
}

/**
 * Clients may cancel their own requests until a contract is executed.
 * @param {SessionUser|null|undefined} user
 * @param {{ clientId?: string, status?: string }|null|undefined} request
 * @returns {boolean}
 */
export function canCancelRequest(user, request) {
  if (!isClient(user) || !ownsClient(user, request?.clientId)) return false;
  return [
    REQUEST_STATUS.PENDING,
    REQUEST_STATUS.UNDER_REVIEW,
    REQUEST_STATUS.APPROVED,
  ].includes(request?.status);
}

/**
 * Only the owning client may turn an approved request into a contract.
 * @param {SessionUser|null|undefined} user
 * @param {{ clientId?: string, status?: string }|null|undefined} request
 * @returns {boolean}
 */
export function canExecuteContract(user, request) {
  return (
    isClient(user) &&
    ownsClient(user, request?.clientId) &&
    request?.status === REQUEST_STATUS.APPROVED
  );
}

/**
 * Agents can view every request; clients only their own.
 * @param {SessionUser|null|undefined} user
 * @param {{ clientId?: string }|null|undefined} request
 * @returns {boolean}
 */
export function canViewRequest(user, request) {
  if (isAgent(user)) return true;
  return isClient(user) && ownsClient(user, request?.clientId);
}
