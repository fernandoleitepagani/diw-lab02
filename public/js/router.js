/**
 * Hash router with parameter matching and optional route guards.
 *
 * Guards are activated when `session.js` exists (added in the authentication
 * task). While the scaffold runs without it, every route renders directly.
 */

/** @typedef {{ path: string, view: { render: Function }, public?: boolean, roles?: string[], segments?: string[] }} RouteConfig */

/** @type {RouteConfig[]} */
let compiledRoutes = [];
let resolveInProgress = false;

const GUEST_ONLY_PATHS = new Set(['/login', '/register']);

/**
 * @param {string} value
 * @returns {{ path: string, query: URLSearchParams }}
 */
function readLocation(value = window.location.hash) {
  let path = value ? value.replace(/^#/, '') : '/';
  if (!path.startsWith('/')) path = `/${path}`;

  const queryIndex = path.indexOf('?');
  const query = new URLSearchParams(queryIndex >= 0 ? path.slice(queryIndex + 1) : '');
  if (queryIndex >= 0) path = path.slice(0, queryIndex);

  path = path.replace(/\/+$/, '') || '/';
  return { path, query };
}

/**
 * @param {RouteConfig} route
 * @returns {RouteConfig}
 */
function compile(route) {
  const segments =
    route.path === '/' || route.path === '*'
      ? []
      : route.path.replace(/^\/+|\/+$/g, '').split('/');
  return { ...route, segments };
}

/**
 * @param {string} path
 * @returns {{ route: RouteConfig|undefined, params: Record<string, string> }}
 */
function matchRoute(path) {
  const pathSegments = path === '/' ? [] : path.replace(/^\/+|\/+$/g, '').split('/');

  for (const route of compiledRoutes) {
    if (route.path === '*') continue;
    if (route.segments.length !== pathSegments.length) continue;

    /** @type {Record<string, string>} */
    const params = {};
    let matched = true;

    for (let index = 0; index < route.segments.length; index += 1) {
      const segment = route.segments[index];
      if (segment.startsWith(':')) {
        try {
          params[segment.slice(1)] = decodeURIComponent(pathSegments[index]);
        } catch {
          params[segment.slice(1)] = pathSegments[index];
        }
      } else if (segment !== pathSegments[index]) {
        matched = false;
        break;
      }
    }

    if (matched) return { route, params };
  }

  return { route: compiledRoutes.find((route) => route.path === '*'), params: {} };
}

/** @type {Promise<typeof import('./session.js')|null>|null} */
let sessionModulePromise = null;

/**
 * Lazily loads the session module. A missing module means guards are disabled
 * (the scaffold has no authentication yet).
 * @returns {Promise<{ getSession?: Function }|null>}
 */
function loadSessionModule() {
  if (!sessionModulePromise) {
    sessionModulePromise = import('./session.js').catch(() => null);
  }
  return sessionModulePromise;
}

/**
 * @param {Record<string, unknown>|null} session
 * @param {RouteConfig} route
 * @returns {boolean}
 */
function isAllowed(session, route) {
  if (!route.roles || route.roles.length === 0) return true;
  if (!session) return false;

  return route.roles.some((role) => {
    if (role === 'client') return session.role === 'client';
    if (role === 'agent') return session.role === 'agent';
    if (role === 'companyAgent') return session.role === 'agent' && session.agentType === 'COMPANY';
    if (role === 'bankAgent') return session.role === 'agent' && session.agentType === 'BANK';
    return session.role === role;
  });
}

/**
 * @param {HTMLElement} container
 * @param {unknown} error
 */
function renderError(container, error) {
  container.innerHTML = '';
  const alert = document.createElement('div');
  alert.className = 'alert alert-danger';
  alert.setAttribute('role', 'alert');
  alert.textContent = 'Não foi possível carregar esta tela.';
  container.append(alert);
  console.error(error);
}

/**
 * Renders the view that matches the current hash.
 * @returns {Promise<void>}
 */
async function resolve() {
  if (resolveInProgress) return;
  resolveInProgress = true;

  try {
    const container = document.getElementById('app');
    if (!container) return;

    const { path, query } = readLocation();
    const { route, params } = matchRoute(path);
    if (!route) return;

    const sessionModule = await loadSessionModule();
    const session =
      sessionModule && typeof sessionModule.getSession === 'function'
        ? sessionModule.getSession() ?? null
        : null;
    const guardsEnabled = Boolean(sessionModule);

    if (guardsEnabled) {
      if (session && GUEST_ONLY_PATHS.has(route.path)) {
        navigate('/');
        return;
      }
      if (!route.public && !session) {
        navigate('/login');
        return;
      }
      if (!isAllowed(session, route)) {
        navigate('/');
        return;
      }
    }

    container.replaceChildren();
    try {
      await route.view.render(container, { params, query, session });
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      renderError(container, error);
    }
  } finally {
    resolveInProgress = false;
  }
}

/**
 * Starts listening to hash changes and renders the current route.
 * @param {RouteConfig[]} routes
 * @returns {void}
 */
export function startRouter(routes) {
  compiledRoutes = routes.map(compile);
  window.addEventListener('hashchange', resolve);
  void resolve();
}

/**
 * Navigates to a hash route.
 * @param {string} path
 * @returns {void}
 */
export function navigate(path) {
  const normalized = path.startsWith('#') ? path.slice(1) : path;
  const target = `#${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  if (window.location.hash === target) {
    void resolve();
    return;
  }
  window.location.hash = target;
}
