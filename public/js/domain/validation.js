/**
 * Entity validation for the rental domain. Pure functions: no DOM, no I/O.
 * Messages are stable English strings; the UI is responsible for any
 * presentation-specific wording.
 */

import { isValidCpf } from './cpf.js';

export const MAX_EMPLOYERS = 3;

const CAR_STATUSES = Object.freeze(['AVAILABLE', 'RENTED', 'MAINTENANCE']);
const OWNERSHIP_TYPES = Object.freeze(['CLIENT', 'COMPANY', 'BANK']);
const CONTRACT_STATUSES = Object.freeze(['ACTIVE', 'COMPLETED', 'CANCELLED']);
const CREDIT_CONTRACT_STATUSES = Object.freeze(['PENDING', 'APPROVED', 'REJECTED']);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {{ field: string, message: string }} ValidationError
 * @typedef {{ ok: boolean, errors: ValidationError[] }} ValidationResult
 */

/**
 * @param {ValidationError[]} errors
 * @param {string} field
 * @param {string} message
 * @returns {void}
 */
function addError(errors, field, message) {
  errors.push({ field, message });
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isFilledId(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * @param {unknown} value
 * @returns {Date|null}
 */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid ? date : null;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function timestampOf(value) {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  const dateOnly = parseDateOnly(value);
  if (dateOnly) return dateOnly.getTime();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * @param {{ startDate?: unknown, endDate?: unknown }} entity
 * @param {ValidationError[]} errors
 * @returns {void}
 */
function validateDateRange(entity, errors) {
  const start = timestampOf(entity.startDate);
  const end = timestampOf(entity.endDate);

  if (start === null) addError(errors, 'startDate', 'Start date is required.');
  if (end === null) addError(errors, 'endDate', 'End date is required.');
  if (start !== null && end !== null && end <= start) {
    addError(errors, 'endDate', 'End date must be after start date.');
  }
}

/**
 * @param {Record<string, unknown>} client
 * @returns {ValidationResult}
 */
export function validateClient(client) {
  const errors = [];
  const value = client && typeof client === 'object' ? client : {};

  if (isBlank(value.name)) addError(errors, 'name', 'Name is required.');
  if (!isValidCpf(value.cpf)) addError(errors, 'cpf', 'CPF is invalid.');
  if (isBlank(value.address)) addError(errors, 'address', 'Address is required.');

  if (value.employers !== undefined && value.employers !== null) {
    if (!Array.isArray(value.employers)) {
      addError(errors, 'employers', 'Employers must be a list.');
    } else {
      if (value.employers.length > MAX_EMPLOYERS) {
        addError(errors, 'employers', `At most ${MAX_EMPLOYERS} employers are allowed.`);
      }
      value.employers.forEach((employer, index) => {
        const prefix = `employers.${index}`;
        if (!employer || typeof employer !== 'object') {
          addError(errors, prefix, 'Employer must be an object.');
          return;
        }
        if (isBlank(employer.name)) {
          addError(errors, `${prefix}.name`, 'Employer name is required.');
        }
        const income = employer.income;
        if (
          income === undefined ||
          income === null ||
          income === '' ||
          !Number.isFinite(Number(income)) ||
          Number(income) < 0
        ) {
          addError(errors, `${prefix}.income`, 'Employer income must be a non-negative number.');
        }
      });
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {Record<string, unknown>} car
 * @returns {ValidationResult}
 */
export function validateCar(car) {
  const errors = [];
  const value = car && typeof car === 'object' ? car : {};

  for (const field of ['registration', 'plate', 'brand', 'model']) {
    if (isBlank(value[field])) addError(errors, field, `${field} is required.`);
  }

  const year = Number(value.year);
  const maxYear = new Date().getFullYear() + 1;
  if (!Number.isInteger(year) || year < 1900 || year > maxYear) {
    addError(errors, 'year', `Year must be an integer between 1900 and ${maxYear}.`);
  }

  const dailyRate = Number(value.dailyRate);
  if (value.dailyRate === null || value.dailyRate === '' || !Number.isFinite(dailyRate) || dailyRate <= 0) {
    addError(errors, 'dailyRate', 'Daily rate must be greater than zero.');
  }

  if (value.status !== undefined && !CAR_STATUSES.includes(value.status)) {
    addError(errors, 'status', 'Car status is invalid.');
  }
  if (value.ownerType !== undefined && !OWNERSHIP_TYPES.includes(value.ownerType)) {
    addError(errors, 'ownerType', 'Owner type is invalid.');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {Record<string, unknown>} request
 * @returns {ValidationResult}
 */
export function validateRentalRequest(request) {
  const errors = [];
  const value = request && typeof request === 'object' ? request : {};

  if (!isFilledId(value.clientId)) addError(errors, 'clientId', 'Client is required.');
  if (!isFilledId(value.carId)) addError(errors, 'carId', 'Car is required.');

  validateDateRange(value, errors);

  if (value.estimatedTotal !== undefined) {
    const total = Number(value.estimatedTotal);
    if (value.estimatedTotal === null || !Number.isFinite(total) || total < 0) {
      addError(errors, 'estimatedTotal', 'Estimated total must be a non-negative number.');
    }
  }

  if (value.notes !== undefined && value.notes !== null && typeof value.notes !== 'string') {
    addError(errors, 'notes', 'Notes must be text.');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {Record<string, unknown>} contract
 * @returns {ValidationResult}
 */
export function validateContract(contract) {
  const errors = [];
  const value = contract && typeof contract === 'object' ? contract : {};

  if (!isFilledId(value.rentalRequestId)) {
    addError(errors, 'rentalRequestId', 'Rental request is required.');
  }
  if (!isFilledId(value.clientId)) addError(errors, 'clientId', 'Client is required.');
  if (!isFilledId(value.carId)) addError(errors, 'carId', 'Car is required.');
  if (!OWNERSHIP_TYPES.includes(value.ownershipType)) {
    addError(errors, 'ownershipType', 'Ownership type is invalid.');
  }

  validateDateRange(value, errors);

  if (value.total !== undefined) {
    const total = Number(value.total);
    if (value.total === null || !Number.isFinite(total) || total < 0) {
      addError(errors, 'total', 'Total must be a non-negative number.');
    }
  }

  if (value.status !== undefined && !CONTRACT_STATUSES.includes(value.status)) {
    addError(errors, 'status', 'Contract status is invalid.');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * @param {Record<string, unknown>} contract
 * @returns {ValidationResult}
 */
export function validateCreditContract(contract) {
  const errors = [];
  const value = contract && typeof contract === 'object' ? contract : {};

  if (!isFilledId(value.bankId)) addError(errors, 'bankId', 'Bank is required.');
  if (!isFilledId(value.clientId)) addError(errors, 'clientId', 'Client is required.');

  const amount = Number(value.amount);
  if (value.amount === null || value.amount === '' || !Number.isFinite(amount) || amount <= 0) {
    addError(errors, 'amount', 'Amount must be greater than zero.');
  }

  const installments = Number(value.installments);
  if (!Number.isInteger(installments) || installments < 1 || installments > 60) {
    addError(errors, 'installments', 'Installments must be an integer between 1 and 60.');
  }

  const interestRate = Number(value.interestRate);
  if (
    value.interestRate === null ||
    value.interestRate === '' ||
    !Number.isFinite(interestRate) ||
    interestRate < 0
  ) {
    addError(errors, 'interestRate', 'Interest rate must be a non-negative number.');
  }

  if (!CREDIT_CONTRACT_STATUSES.includes(value.status)) {
    addError(errors, 'status', 'Credit contract status is invalid.');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Inclusive-exclusive overlap check: `[startA, endA)` and `[startB, endB)`.
 * @param {unknown} startA
 * @param {unknown} endA
 * @param {unknown} startB
 * @param {unknown} endB
 * @returns {boolean}
 */
export function datesOverlap(startA, endA, startB, endB) {
  const aStart = timestampOf(startA);
  const aEnd = timestampOf(endA);
  const bStart = timestampOf(startB);
  const bEnd = timestampOf(endB);
  if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
  return aStart < bEnd && bStart < aEnd;
}
