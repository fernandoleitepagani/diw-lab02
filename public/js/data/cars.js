/**
 * Car repository. Wraps JSON Server access to the `cars` collection.
 *
 * JSON Server deletes related records with no referential integrity (see ADR
 * 0002), so `deleteCar` checks `rentalRequests` and `contracts` first and
 * refuses to issue the DELETE when the car is still referenced.
 */

import { apiCreate, apiDelete, apiGet, apiList, apiUpdate } from '../api.js';

/**
 * @typedef {Object} CarRecord
 * @property {string|number} id
 * @property {string} registration
 * @property {number} year
 * @property {string} brand
 * @property {string} model
 * @property {string} plate
 * @property {number} dailyRate
 * @property {'AVAILABLE'|'RENTED'|'MAINTENANCE'} status
 * @property {'CLIENT'|'COMPANY'|'BANK'} [ownerType]
 * @property {string} [ownerId]
 */

/**
 * @typedef {Object} CarReferences
 * @property {Array<Record<string, unknown>>} rentalRequests
 * @property {Array<Record<string, unknown>>} contracts
 */

/**
 * Thrown when a car cannot be deleted because requests or contracts still
 * reference it. Callers turn the attached records into a PT-BR message.
 */
export class CarDeleteBlockedError extends Error {
  /**
   * @param {CarReferences} references
   */
  constructor(references) {
    super('Car is referenced by rental requests or contracts and cannot be deleted.');
    this.name = 'CarDeleteBlockedError';
    /** @type {Array<Record<string, unknown>>} */
    this.rentalRequests = references.rentalRequests;
    /** @type {Array<Record<string, unknown>>} */
    this.contracts = references.contracts;
  }
}

/**
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<CarRecord[]>}
 */
export async function listCars(params = {}) {
  return /** @type {CarRecord[]} */ (await apiList('cars', params));
}

/**
 * @returns {Promise<CarRecord[]>}
 */
export async function listAvailableCars() {
  return listCars({ status: 'AVAILABLE' });
}

/**
 * @param {string|number} id
 * @returns {Promise<CarRecord>}
 */
export async function getCar(id) {
  return /** @type {CarRecord} */ (await apiGet('cars', id));
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Promise<CarRecord>}
 */
export async function createCar(data) {
  return /** @type {CarRecord} */ (await apiCreate('cars', data));
}

/**
 * @param {string|number} id
 * @param {Record<string, unknown>} data
 * @returns {Promise<CarRecord>}
 */
export async function updateCar(id, data) {
  return /** @type {CarRecord} */ (await apiUpdate('cars', id, data));
}

/**
 * Fetches every rental request and contract that still points at the car.
 * @param {string|number} id
 * @returns {Promise<CarReferences>}
 */
export async function findCarReferences(id) {
  const [rentalRequests, contracts] = await Promise.all([
    apiList('rentalRequests', { carId: id }),
    apiList('contracts', { carId: id }),
  ]);
  return { rentalRequests, contracts };
}

/**
 * Deletes a car only when no rental request or contract references it.
 * @param {string|number} id
 * @returns {Promise<void>}
 * @throws {CarDeleteBlockedError}
 */
export async function deleteCar(id) {
  const references = await findCarReferences(id);
  if (references.rentalRequests.length > 0 || references.contracts.length > 0) {
    throw new CarDeleteBlockedError(references);
  }
  await apiDelete('cars', id);
}
