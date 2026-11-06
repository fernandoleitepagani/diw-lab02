/**
 * Rental pricing helpers. Pure functions; dates are `YYYY-MM-DD` strings.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  return valid ? time : null;
}

/**
 * Number of nights between two date-only strings.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function rentalDays(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (start === null || end === null) return 0;
  return Math.round((end - start) / MS_PER_DAY);
}

/**
 * Rounds a number to two decimal places, compensating for binary floating
 * point noise.
 * @param {number} value
 * @returns {number}
 */
export function round2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

/**
 * @param {number} dailyRate
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
export function estimateTotal(dailyRate, startDate, endDate) {
  const rate = Number(dailyRate);
  if (!Number.isFinite(rate)) return 0;
  return round2(rate * rentalDays(startDate, endDate));
}

/**
 * Share of monthly income committed to a payment, as a ratio (0.25 = 25%).
 * @param {number} totalIncome
 * @param {number} total
 * @returns {number}
 */
export function commitmentRatio(totalIncome, total) {
  const income = Number(totalIncome);
  const amount = Number(total);
  if (!Number.isFinite(income) || !Number.isFinite(amount) || income <= 0) return 0;
  return round2(amount / income);
}
