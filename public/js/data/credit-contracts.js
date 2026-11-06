/**
 * Credit contract repository. Bank agents create and review the records; the
 * domain validation rules are applied here so every write has the same
 * guarantees as the form.
 */

import { apiCreate, apiGet, apiList, apiUpdate } from '../api.js';
import { validateCreditContract } from '../domain/validation.js';

/**
 * @typedef {Object} CreditContractRecord
 * @property {string|number} id
 * @property {string|number} bankId
 * @property {string|number} clientId
 * @property {number} amount
 * @property {number} installments
 * @property {number} interestRate
 * @property {'PENDING'|'APPROVED'|'REJECTED'} status
 * @property {string} [createdAt]
 */

/**
 * Thrown when a credit contract does not satisfy `validateCreditContract`.
 */
export class CreditContractValidationError extends Error {
  /**
   * @param {Array<{ field: string, message: string }>} errors
   */
  constructor(errors) {
    super('Credit contract data is invalid.');
    this.name = 'CreditContractValidationError';
    /** @type {Array<{ field: string, message: string }>} */
    this.errors = errors;
  }
}

/**
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<CreditContractRecord[]>}
 */
export async function listCreditContracts(params = {}) {
  return /** @type {CreditContractRecord[]} */ (await apiList('creditContracts', params));
}

/**
 * @param {string|number|null|undefined} clientId
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<CreditContractRecord[]>}
 */
export async function listCreditContractsForClient(clientId, params = {}) {
  if (clientId === undefined || clientId === null || clientId === '') return [];
  return listCreditContracts({ ...params, clientId });
}

/**
 * Approved credit contracts that a client may link to a rental contract.
 * @param {string|number|null|undefined} clientId
 * @returns {Promise<CreditContractRecord[]>}
 */
export async function listApprovedCreditContractsForClient(clientId) {
  return listCreditContractsForClient(clientId, { status: 'APPROVED' });
}

/**
 * @param {string|number} id
 * @returns {Promise<CreditContractRecord>}
 */
export async function getCreditContract(id) {
  return /** @type {CreditContractRecord} */ (await apiGet('creditContracts', id));
}

/**
 * @param {Record<string, unknown>} data
 * @returns {void}
 * @throws {CreditContractValidationError}
 */
function assertValid(data) {
  const validation = validateCreditContract(data);
  if (!validation.ok) throw new CreditContractValidationError(validation.errors);
}

/**
 * Creates a credit contract in `PENDING` status, regardless of caller input.
 * @param {Record<string, unknown>} data
 * @returns {Promise<CreditContractRecord>}
 */
export async function createCreditContract(data) {
  const payload = {
    ...data,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  assertValid(payload);
  return /** @type {CreditContractRecord} */ (await apiCreate('creditContracts', payload));
}

/**
 * Replaces a credit contract. Approval and rejection are ordinary edits of
 * the `status` field, validated by the domain layer before the API call.
 * @param {string|number} id
 * @param {Record<string, unknown>} data
 * @returns {Promise<CreditContractRecord>}
 */
export async function updateCreditContract(id, data) {
  assertValid(data);
  return /** @type {CreditContractRecord} */ (await apiUpdate('creditContracts', id, data));
}
