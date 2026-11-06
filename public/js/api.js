/**
 * Thin fetch wrapper over JSON Server. All application data access goes
 * through this module so error handling and URL building stay in one place.
 */

const API_BASE = '';

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {unknown} [body]
   */
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {string} collection
 * @param {Record<string, unknown>} [params]
 * @returns {string}
 */
function buildUrl(collection, params = {}) {
  const url = new URL(`${API_BASE}/${encodeURIComponent(collection)}`, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, String(item));
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Builds `/collection/id`, encoding each path segment separately so the
 * separator slash stays literal.
 * @param {string} collection
 * @param {string|number} id
 * @returns {string}
 */
function buildItemUrl(collection, id) {
  return new URL(
    `${API_BASE}/${encodeURIComponent(collection)}/${encodeURIComponent(String(id))}`,
    window.location.origin,
  ).toString();
}

/**
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function readBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
async function assertOk(response) {
  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status, body);
  }
  return body;
}

/**
 * @param {string} collection
 * @param {Record<string, unknown>} [params]
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function apiList(collection, params = {}) {
  const response = await fetch(buildUrl(collection, params), {
    headers: { Accept: 'application/json' },
  });
  return /** @type {Array<Record<string, unknown>>} */ (await assertOk(response));
}

/**
 * @param {string} collection
 * @param {string|number} id
 * @returns {Promise<Record<string, unknown>>}
 */
export async function apiGet(collection, id) {
  const response = await fetch(buildItemUrl(collection, id), {
    headers: { Accept: 'application/json' },
  });
  return /** @type {Record<string, unknown>} */ (await assertOk(response));
}

/**
 * @param {string} collection
 * @param {Record<string, unknown>} data
 * @returns {Promise<Record<string, unknown>>}
 */
export async function apiCreate(collection, data) {
  const response = await fetch(buildUrl(collection), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return /** @type {Record<string, unknown>} */ (await assertOk(response));
}

/**
 * @param {string} collection
 * @param {string|number} id
 * @param {Record<string, unknown>} data
 * @returns {Promise<Record<string, unknown>>}
 */
export async function apiUpdate(collection, id, data) {
  const response = await fetch(buildItemUrl(collection, id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return /** @type {Record<string, unknown>} */ (await assertOk(response));
}

/**
 * @param {string} collection
 * @param {string|number} id
 * @param {Record<string, unknown>} data
 * @returns {Promise<Record<string, unknown>>}
 */
export async function apiPatch(collection, id, data) {
  const response = await fetch(buildItemUrl(collection, id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return /** @type {Record<string, unknown>} */ (await assertOk(response));
}

/**
 * @param {string} collection
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function apiDelete(collection, id) {
  const response = await fetch(buildItemUrl(collection, id), {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  await assertOk(response);
}
