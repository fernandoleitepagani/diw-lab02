/**
 * Rental request repository. Wraps JSON Server access to the `rentalRequests`
 * collection and exposes the lookups the request views need for ownership and
 * booking-overlap checks.
 */

import { apiCreate, apiGet, apiList, apiUpdate } from '../api.js';

/**
 * Statuses that represent a booking that already occupies the car. Only these
 * statuses block a new or edited request from using the same date range.
 */
export const ACTIVE_REQUEST_STATUSES = Object.freeze(['CONTRACTED', 'ACTIVE']);

/**
 * @typedef {Object} RentalRequestRecord
 * @property {string|number} id
 * @property {string|number} clientId
 * @property {string|number} carId
 * @property {string} startDate
 * @property {string} endDate
 * @property {number} estimatedTotal
 * @property {string} status
 * @property {string} [notes]
 * @property {string} [reviewNotes]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<RentalRequestRecord[]>}
 */
export async function listRequests(params = {}) {
  return /** @type {RentalRequestRecord[]} */ (await apiList('rentalRequests', params));
}

/**
 * @param {string|number} clientId
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<RentalRequestRecord[]>}
 */
export async function listRequestsForClient(clientId, params = {}) {
  if (clientId === undefined || clientId === null || clientId === '') return [];
  return listRequests({ ...params, clientId });
}

/**
 * @param {string|number} id
 * @returns {Promise<RentalRequestRecord>}
 */
export async function getRequest(id) {
  return /** @type {RentalRequestRecord} */ (await apiGet('rentalRequests', id));
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Promise<RentalRequestRecord>}
 */
export async function createRequest(data) {
  return /** @type {RentalRequestRecord} */ (await apiCreate('rentalRequests', data));
}

/**
 * Replaces a request record. Callers merge the full record before writing so
 * fields they do not own (status history, review notes) are preserved.
 * @param {string|number} id
 * @param {Record<string, unknown>} data
 * @returns {Promise<RentalRequestRecord>}
 */
export async function updateRequest(id, data) {
  return /** @type {RentalRequestRecord} */ (await apiUpdate('rentalRequests', id, data));
}

/**
 * Every booking that already occupies a car, i.e. `CONTRACTED` or `ACTIVE`.
 * The date-range comparison itself is done by `datesOverlap` in the domain
 * layer; this helper only narrows the collection.
 * @param {string|number} carId
 * @returns {Promise<RentalRequestRecord[]>}
 */
export async function findActiveRequestsForCar(carId) {
  if (carId === undefined || carId === null || carId === '') return [];
  const requests = await listRequests({ carId });
  return requests.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.status));
}
