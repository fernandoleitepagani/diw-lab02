/**
 * CPF utilities. Pure functions shared by validation and the UI.
 */

/**
 * Removes every non-digit character from a CPF value.
 * @param {unknown} value
 * @returns {string}
 */
export function stripCpf(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Validates a CPF using the official two check digits.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidCpf(value) {
  const digits = stripCpf(value);
  if (digits.length !== 11) return false;
  // Repeated digits pass the checksum by construction, but are not valid CPFs.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  /**
   * @param {number} length
   * @returns {number}
   */
  const checkDigit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

/**
 * Formats a CPF as `000.000.000-00`. Non-CPF input is returned trimmed.
 * @param {unknown} value
 * @returns {string}
 */
export function formatCpf(value) {
  const digits = stripCpf(value);
  if (digits.length !== 11) return String(value ?? '').trim();
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
