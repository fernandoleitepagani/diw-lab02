/**
 * User repository. Wraps JSON Server access and keeps the demo authentication
 * rules (case-insensitive email, plain-text password, known roles) in one
 * place. Passwords never leave this module except as part of an authenticated
 * record that the caller immediately normalizes into a session.
 */

import { apiCreate, apiList } from '../api.js';

const KNOWN_ROLES = Object.freeze(['client', 'agent']);

/**
 * @typedef {Object} UserRecord
 * @property {string|number} id
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {string} role
 * @property {string|null} clientId
 * @property {string|null} agentType
 * @property {string|null} [organization]
 */

/**
 * @param {unknown} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} role
 * @returns {boolean}
 */
export function isKnownRole(role) {
  return typeof role === 'string' && KNOWN_ROLES.includes(role);
}

/**
 * @returns {Promise<UserRecord[]>}
 */
export async function listUsers() {
  return /** @type {UserRecord[]} */ (await apiList('users'));
}

/**
 * Case-insensitive lookup by email.
 * @param {unknown} email
 * @returns {Promise<UserRecord|null>}
 */
export async function findUserByEmail(email) {
  const target = normalizeEmail(email);
  if (!target) return null;

  const users = await listUsers();
  return users.find((user) => normalizeEmail(user.email) === target) ?? null;
}

/**
 * Authenticates a demo user. Returns `null` for unknown emails, wrong
 * passwords, and unknown roles so callers can show one generic error.
 * @param {unknown} email
 * @param {unknown} password
 * @returns {Promise<UserRecord|null>}
 */
export async function authenticate(email, password) {
  const target = normalizeEmail(email);
  if (!target || typeof password !== 'string' || password === '') return null;

  const user = await findUserByEmail(target);
  if (!user) return null;
  if (String(user.password) !== password) return null;
  if (!isKnownRole(user.role)) return null;

  return user;
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Promise<UserRecord>}
 */
export async function createUser(data) {
  return /** @type {UserRecord} */ (await apiCreate('users', data));
}
