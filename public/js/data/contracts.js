/**
 * Rental contract repository and lifecycle workflow.
 *
 * Contract execution and the agent-side start/complete/cancel operations all
 * touch three collections, so they live here instead of in the views. Every
 * request status change is validated by `request-state.js` before any write.
 */

import { apiCreate, apiGet, apiList, apiPatch } from '../api.js';
import { DomainError, REQUEST_STATUS, assertTransition } from '../domain/request-state.js';
import { validateContract, validateCreditContract } from '../domain/validation.js';
import { listUsers } from './users.js';

/**
 * @typedef {Object} ContractRecord
 * @property {string|number} id
 * @property {string|number} rentalRequestId
 * @property {string|number} clientId
 * @property {string|number} carId
 * @property {string} startDate
 * @property {string} endDate
 * @property {number} total
 * @property {'CLIENT'|'COMPANY'|'BANK'} ownershipType
 * @property {string|number|null} [creditContractId]
 * @property {'ACTIVE'|'COMPLETED'|'CANCELLED'} status
 * @property {string} [createdAt]
 */

const OWNERSHIP_TYPES = Object.freeze(['CLIENT', 'COMPANY', 'BANK']);

/**
 * Thrown when a contract workflow step cannot be performed safely.
 */
export class ContractWorkflowError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {unknown} [details]
   */
  constructor(message, code, details = null) {
    super(message);
    this.name = 'ContractWorkflowError';
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<ContractRecord[]>}
 */
export async function listContracts(params = {}) {
  return /** @type {ContractRecord[]} */ (await apiList('contracts', params));
}

/**
 * @param {string|number|null|undefined} clientId
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<ContractRecord[]>}
 */
export async function listContractsForClient(clientId, params = {}) {
  if (clientId === undefined || clientId === null || clientId === '') return [];
  return listContracts({ ...params, clientId });
}

/**
 * @param {string|number} id
 * @returns {Promise<ContractRecord>}
 */
export async function getContract(id) {
  return /** @type {ContractRecord} */ (await apiGet('contracts', id));
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Promise<ContractRecord>}
 */
export async function createContract(data) {
  return /** @type {ContractRecord} */ (await apiCreate('contracts', data));
}

/**
 * Finds the company agent that owns the fleet. New contracts resolved as
 * `COMPANY` record this user as the vehicle owner.
 * @returns {Promise<string|number>}
 * @throws {ContractWorkflowError} When no company agent exists.
 */
export async function findCompanyAgentId() {
  const users = await listUsers();
  const agent = users.find(
    (user) => user.role === 'agent' && user.agentType === 'COMPANY',
  );
  if (!agent) {
    throw new ContractWorkflowError(
      'No company agent was found to own the vehicle.',
      'COMPANY_AGENT_NOT_FOUND',
    );
  }
  return agent.id;
}

/**
 * Rejects a linked credit contract that is not approved, does not belong to
 * the client, or fails the credit-contract validation rules.
 * @param {Record<string, unknown>} creditContract
 * @param {string|number} clientId
 * @returns {void}
 * @throws {ContractWorkflowError}
 */
function assertLinkedCreditContract(creditContract, clientId) {
  if (
    creditContract.id === undefined ||
    creditContract.id === null ||
    creditContract.id === ''
  ) {
    throw new ContractWorkflowError(
      'A credit contract is required for bank ownership.',
      'CREDIT_CONTRACT_REQUIRED',
    );
  }

  if (String(creditContract.clientId) !== String(clientId)) {
    throw new ContractWorkflowError(
      'The credit contract belongs to another client.',
      'CREDIT_CONTRACT_OWNER',
    );
  }

  if (creditContract.status !== 'APPROVED') {
    throw new ContractWorkflowError(
      'The credit contract must be approved.',
      'CREDIT_CONTRACT_NOT_APPROVED',
    );
  }

  const validation = validateCreditContract(creditContract);
  if (!validation.ok) {
    throw new ContractWorkflowError(
      'The credit contract is invalid.',
      'CREDIT_CONTRACT_INVALID',
      validation.errors,
    );
  }
}

/**
 * Resolves the car owner recorded on the contract. `CLIENT` follows the task
 * rule of copying the request's client id; `COMPANY` uses the company agent
 * user; `BANK` uses the linked approved credit contract's bank.
 * @param {string} ownershipType
 * @param {Record<string, unknown>} request
 * @param {Record<string, unknown>|null} creditContract
 * @returns {Promise<{ ownershipType: 'CLIENT'|'COMPANY'|'BANK', ownerId: string|number }>}
 * @throws {ContractWorkflowError}
 */
export async function resolveOwnership(ownershipType, request, creditContract = null) {
  if (!OWNERSHIP_TYPES.includes(ownershipType)) {
    throw new ContractWorkflowError('Ownership type is invalid.', 'INVALID_OWNERSHIP');
  }

  if (creditContract) {
    assertLinkedCreditContract(creditContract, request.clientId);
  }

  if (ownershipType === 'CLIENT') {
    return { ownershipType, ownerId: request.clientId };
  }

  if (ownershipType === 'COMPANY') {
    return { ownershipType, ownerId: await findCompanyAgentId() };
  }

  if (!creditContract) {
    throw new ContractWorkflowError(
      'A credit contract is required for bank ownership.',
      'CREDIT_CONTRACT_REQUIRED',
    );
  }

  return { ownershipType, ownerId: creditContract.bankId };
}

/**
 * Executes an approved request as a client:
 * 1. creates the contract as `ACTIVE`;
 * 2. patches the request to `CONTRACTED`;
 * 3. marks the car as `RENTED` and records its owner.
 *
 * @param {{ request: Record<string, unknown>, ownershipType: string, creditContract?: Record<string, unknown>|null }} input
 * @returns {Promise<ContractRecord>}
 * @throws {DomainError|ContractWorkflowError}
 */
export async function executeContract({ request, ownershipType, creditContract = null }) {
  if (!request || typeof request !== 'object') {
    throw new DomainError('A rental request is required to execute a contract.');
  }
  if (request.status !== REQUEST_STATUS.APPROVED) {
    throw new DomainError('Only approved requests can be contracted.');
  }

  assertTransition(REQUEST_STATUS.APPROVED, REQUEST_STATUS.CONTRACTED, 'client');
  const owner = await resolveOwnership(ownershipType, request, creditContract);
  const now = new Date().toISOString();

  /** @type {Record<string, unknown>} */
  const contractData = {
    rentalRequestId: request.id,
    clientId: request.clientId,
    carId: request.carId,
    startDate: request.startDate,
    endDate: request.endDate,
    total: Number(request.estimatedTotal ?? 0),
    ownershipType: owner.ownershipType,
    status: 'ACTIVE',
    createdAt: now,
  };
  if (creditContract) contractData.creditContractId = creditContract.id;

  const validation = validateContract(contractData);
  if (!validation.ok) {
    throw new ContractWorkflowError(
      'Contract data is invalid.',
      'INVALID_CONTRACT',
      validation.errors,
    );
  }

  const contract = await apiCreate('contracts', contractData);
  await apiPatch('rentalRequests', request.id, {
    status: REQUEST_STATUS.CONTRACTED,
    updatedAt: now,
  });
  await apiPatch('cars', request.carId, {
    status: 'RENTED',
    ownerType: owner.ownershipType,
    ownerId: owner.ownerId,
  });

  return contract;
}

/**
 * Moves a contracted request to `ACTIVE`. The contract is already `ACTIVE`.
 * @param {{ request: Record<string, unknown> }} input
 * @returns {Promise<void>}
 * @throws {DomainError}
 */
export async function startRental({ request }) {
  assertTransition(String(request.status), REQUEST_STATUS.ACTIVE, 'agent');
  await apiPatch('rentalRequests', request.id, {
    status: REQUEST_STATUS.ACTIVE,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Completes an active rental: request and contract become `COMPLETED`, and
 * the car returns to `AVAILABLE`. Ownership fields are left untouched.
 * @param {{ contract: Record<string, unknown>, request: Record<string, unknown> }} input
 * @returns {Promise<void>}
 * @throws {DomainError}
 */
export async function completeRental({ contract, request }) {
  assertTransition(String(request.status), REQUEST_STATUS.COMPLETED, 'agent');
  const now = new Date().toISOString();

  await apiPatch('rentalRequests', request.id, {
    status: REQUEST_STATUS.COMPLETED,
    updatedAt: now,
  });
  await apiPatch('contracts', contract.id, { status: 'COMPLETED' });
  await apiPatch('cars', request.carId ?? contract.carId, { status: 'AVAILABLE' });
}

/**
 * Cancels a contracted or active rental: request and contract become
 * `CANCELLED`, and the car returns to `AVAILABLE`. Ownership fields are left
 * untouched.
 * @param {{ contract: Record<string, unknown>, request: Record<string, unknown> }} input
 * @returns {Promise<void>}
 * @throws {DomainError}
 */
export async function cancelRental({ contract, request }) {
  assertTransition(String(request.status), REQUEST_STATUS.CANCELLED, 'agent');
  const now = new Date().toISOString();

  await apiPatch('rentalRequests', request.id, {
    status: REQUEST_STATUS.CANCELLED,
    updatedAt: now,
  });
  await apiPatch('contracts', contract.id, { status: 'CANCELLED' });
  await apiPatch('cars', request.carId ?? contract.carId, { status: 'AVAILABLE' });
}
