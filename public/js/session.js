/**
 * Session persistence for the demo application.
 *
 * The session is a small, password-free snapshot of the authenticated user
 * stored in `localStorage`. Authentication itself lives in `data/users.js`;
 * this module only normalizes, stores, and reads the snapshot.
 */

const STORAGE_KEY = 'diw-lab02.session';

const VALID_ROLES = Object.freeze(['client', 'agent']);
const VALID_AGENT_TYPES = Object.freeze(['COMPANY', 'BANK']);

/**
 * @typedef {Object} Session
 * @property {string|null} id
 * @property {string} name
 * @property {string} email
 * @property {'client'|'agent'} role
 * @property {'COMPANY'|'BANK'|null} agentType
 * @property {string|null} clientId
 */

/**
 * @param {unknown} role
 * @returns {boolean}
 */
function isKnownRole(role) {
  return typeof role === 'string' && VALID_ROLES.includes(role);
}

/**
 * @param {unknown} agentType
 * @returns {'COMPANY'|'BANK'|null}
 */
function normalizeAgentType(agentType) {
  return typeof agentType === 'string' && VALID_AGENT_TYPES.includes(agentType)
    ? /** @type {'COMPANY'|'BANK'} */ (agentType)
    : null;
}

/**
 * @param {string} path
 * @returns {void}
 */
function redirectTo(path) {
  if (typeof window === 'undefined') return;
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash !== target) window.location.hash = target;
}

/**
 * Reads the stored session. Corrupt entries and unknown roles are treated as
 * no session, so a tampered value can never unlock a protected route.
 * @returns {Session|null}
 */
export function getSession() {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !isKnownRole(parsed.role)) return null;

    return {
      id: parsed.id === undefined || parsed.id === null ? null : String(parsed.id),
      name: String(parsed.name ?? ''),
      email: String(parsed.email ?? ''),
      role: parsed.role,
      agentType: normalizeAgentType(parsed.agentType),
      clientId:
        parsed.clientId === undefined || parsed.clientId === null ? null : String(parsed.clientId),
    };
  } catch {
    return null;
  }
}

/**
 * Stores a normalized, password-free session snapshot.
 * @param {Record<string, unknown>|null|undefined} user
 * @returns {void}
 */
export function setSession(user) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  if (!user || typeof user !== 'object' || !isKnownRole(user.role)) {
    clearSession();
    return;
  }

  /** @type {Session} */
  const session = {
    id: user.id === undefined || user.id === null ? null : String(user.id),
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    role: user.role,
    agentType: normalizeAgentType(user.agentType),
    clientId: user.clientId ?? null,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/**
 * Removes the stored session.
 * @returns {void}
 */
export function clearSession() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * @returns {boolean}
 */
export function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Returns the session or redirects to the login screen.
 * @returns {Session|null}
 */
export function requireAuth() {
  const session = getSession();
  if (!session) {
    redirectTo('/login');
    return null;
  }
  return session;
}

/**
 * @param {Session} session
 * @param {string} role
 * @returns {boolean}
 */
function matchesRole(session, role) {
  switch (role) {
    case 'client':
      return session.role === 'client';
    case 'agent':
      return session.role === 'agent';
    case 'companyAgent':
      return session.role === 'agent' && session.agentType === 'COMPANY';
    case 'bankAgent':
      return session.role === 'agent' && session.agentType === 'BANK';
    default:
      return session.role === role;
  }
}

/**
 * Returns the session when it matches one of the roles, otherwise redirects to
 * the dashboard.
 * @param {string|string[]} roles
 * @returns {Session|null}
 */
export function requireRole(roles) {
  const session = requireAuth();
  if (!session) return null;

  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  if (allowedRoles.some((role) => matchesRole(session, role))) return session;

  redirectTo('/');
  return null;
}
