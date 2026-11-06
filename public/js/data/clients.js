/**
 * Client repository. Wraps JSON Server access and centralizes the referential
 * checks that JSON Server itself does not perform (it cascades deletes to
 * dependent records instead of rejecting them).
 */

import { apiCreate, apiDelete, apiGet, apiList, apiUpdate } from '../api.js';
import { stripCpf } from '../domain/cpf.js';

/**
 * @typedef {Object} Employer
 * @property {string} name
 * @property {number} income
 */

/**
 * @typedef {Object} ClientRecord
 * @property {string|number} id
 * @property {string} [userId]
 * @property {string} name
 * @property {string} rg
 * @property {string} cpf
 * @property {string} address
 * @property {string} profession
 * @property {Employer[]} employers
 * @property {string} [createdAt]
 */

/**
 * @typedef {Object} ClientReferences
 * @property {Array<Record<string, unknown>>} rentalRequests
 * @property {Array<Record<string, unknown>>} contracts
 * @property {Array<Record<string, unknown>>} creditContracts
 */

/**
 * Thrown when a client still has dependent records. `references` carries the
 * blocking records so the UI can name them in a PT-BR message.
 */
export class ClientInUseError extends Error {
  /**
   * @param {ClientReferences} references
   */
  constructor(references) {
    super('Client has linked records and cannot be deleted.');
    this.name = 'ClientInUseError';
    this.references = references;
  }
}

/**
 * @returns {Promise<ClientRecord[]>}
 */
export async function listClients() {
  return /** @type {ClientRecord[]} */ (await apiList('clients'));
}

/**
 * @param {string|number} id
 * @returns {Promise<ClientRecord>}
 */
export async function getClient(id) {
  return /** @type {ClientRecord} */ (await apiGet('clients', id));
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Promise<ClientRecord>}
 */
export async function createClient(data) {
  return /** @type {ClientRecord} */ (await apiCreate('clients', data));
}

/**
 * @param {string|number} id
 * @param {Record<string, unknown>} data
 * @returns {Promise<ClientRecord>}
 */
export async function updateClient(id, data) {
  return /** @type {ClientRecord} */ (await apiUpdate('clients', id, data));
}

/**
 * Finds the client linked to a user account. `clientId` wins when present;
 * `userId` is the fallback for records created without the forward reference.
 * @param {string|number|null|undefined} clientId
 * @param {string|number|null|undefined} userId
 * @returns {Promise<ClientRecord|null>}
 */
export async function findClientForUser(clientId, userId) {
  const clients = await listClients();

  if (clientId !== undefined && clientId !== null && clientId !== '') {
    const byId = clients.find((client) => String(client.id) === String(clientId));
    if (byId) return byId;
  }

  if (userId !== undefined && userId !== null && userId !== '') {
    return clients.find((client) => String(client.userId) === String(userId)) ?? null;
  }

  return null;
}

/**
 * Case-insensitive/format-insensitive CPF lookup used to prevent duplicates.
 * @param {unknown} cpf
 * @returns {Promise<ClientRecord|null>}
 */
export async function findClientByCpf(cpf) {
  const target = stripCpf(cpf);
  if (target.length !== 11) return null;

  const clients = await listClients();
  return clients.find((client) => stripCpf(client.cpf) === target) ?? null;
}

/**
 * Sum of every employer's monthly income.
 * @param {{ employers?: Array<{ income?: unknown }> }|null|undefined} client
 * @returns {number}
 */
export function totalIncome(client) {
  const employers = Array.isArray(client?.employers) ? client.employers : [];
  return employers.reduce((sum, employer) => {
    const income = Number(employer?.income);
    return Number.isFinite(income) ? sum + income : sum;
  }, 0);
}

/**
 * Queries every collection that references a client. These are the records
 * that a JSON Server cascade delete would silently remove.
 * @param {string|number} clientId
 * @returns {Promise<ClientReferences>}
 */
export async function getClientReferences(clientId) {
  if (clientId === undefined || clientId === null || clientId === '') {
    return { rentalRequests: [], contracts: [], creditContracts: [] };
  }

  const params = { clientId: String(clientId) };
  const [rentalRequests, contracts, creditContracts] = await Promise.all([
    apiList('rentalRequests', params),
    apiList('contracts', params),
    apiList('creditContracts', params),
  ]);

  return {
    rentalRequests: /** @type {Array<Record<string, unknown>>} */ (rentalRequests),
    contracts: /** @type {Array<Record<string, unknown>>} */ (contracts),
    creditContracts: /** @type {Array<Record<string, unknown>>} */ (creditContracts),
  };
}

/**
 * @param {ClientReferences|null|undefined} references
 * @returns {boolean}
 */
export function hasClientReferences(references) {
  if (!references) return false;
  return (
    references.rentalRequests.length > 0 ||
    references.contracts.length > 0 ||
    references.creditContracts.length > 0
  );
}

/**
 * Deletes a client only when no dependent records exist. The check is
 * repeated here so callers cannot accidentally bypass it.
 * @param {string|number} id
 * @returns {Promise<void>}
 * @throws {ClientInUseError} when rental requests, contracts, or credit
 * contracts still reference the client.
 */
export async function deleteClient(id) {
  const references = await getClientReferences(id);
  if (hasClientReferences(references)) throw new ClientInUseError(references);
  await apiDelete('clients', id);
}
